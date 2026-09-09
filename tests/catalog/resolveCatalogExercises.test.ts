import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CatalogResolutionError,
  LOCAL_CATALOG_SNAPSHOT_VERSION,
  isCatalogExerciseId,
  type CatalogExerciseRequest,
} from '../../features/catalog/contracts';
import { resolveCatalogExercises } from '../../features/catalog/resolveCatalogExercises';
import { getAlternativesFor } from '../../lib/exerciseDatabase';

const request = (overrides: Partial<CatalogExerciseRequest> = {}): CatalogExerciseRequest => ({
  localExerciseId: 'barbell-bench-press',
  displayName: 'Barbell Bench Press',
  source: 'local_snapshot',
  snapshotVersion: LOCAL_CATALOG_SNAPSHOT_VERSION,
  ...overrides,
});

const validId = '11111111-1111-4111-8111-111111111111';

test('resolves a unique exact display name to a validated catalog UUID', () => {
  const result = resolveCatalogExercises(
    [request()],
    [{ id: validId, name: 'Barbell Bench Press', exercisedb_id: '0025' }],
  );

  assert.equal(result.unresolved.length, 0);
  assert.equal(result.resolved.length, 1);
  assert.equal(result.resolved[0].catalogExerciseId, validId);
  assert.equal(result.resolved[0].exerciseDbId, '0025');
  assert.equal(result.resolved[0].resolution, 'exact_name_compatibility');
});

test('does not case-fold names into an ambiguous compatibility match', () => {
  const result = resolveCatalogExercises(
    [request({ displayName: 'barbell bench press' })],
    [{ id: validId, name: 'Barbell Bench Press', exercisedb_id: '0025' }],
  );

  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved[0].reason, 'missing_exact_name');
});

test('uses an explicit source ID when the local display name differs', () => {
  const result = resolveCatalogExercises(
    [request({ displayName: 'Deadlift', exerciseDbId: '0032' })],
    [{ id: validId, name: 'barbell deadlift', exercisedb_id: '0032' }],
  );

  assert.equal(result.unresolved.length, 0);
  assert.equal(result.resolved[0].catalogName, 'barbell deadlift');
  assert.equal(result.resolved[0].resolution, 'source_id');
});

test('does not fall back to display name when an explicit source ID is stale', () => {
  const result = resolveCatalogExercises(
    [request({ exerciseDbId: 'stale-id' })],
    [{ id: validId, name: 'Barbell Bench Press', exercisedb_id: '0025' }],
  );

  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved[0].reason, 'missing_source_id');
});

test('reports duplicate exact names instead of choosing a row', () => {
  const result = resolveCatalogExercises(
    [request()],
    [
      { id: validId, name: 'Barbell Bench Press', exercisedb_id: '0025' },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Barbell Bench Press',
        exercisedb_id: 'other',
      },
    ],
  );

  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved[0].reason, 'ambiguous_exact_name');
  assert.equal(result.unresolved[0].candidateCount, 2);
});

test('rejects malformed catalog IDs before they can reach UUID foreign keys', () => {
  const result = resolveCatalogExercises(
    [request()],
    [{ id: 'barbell-bench-press', name: 'Barbell Bench Press', exercisedb_id: null }],
  );

  assert.equal(result.unresolved[0].reason, 'invalid_catalog_uuid');
  assert.equal(isCatalogExerciseId('barbell-bench-press'), false);
  assert.equal(isCatalogExerciseId(validId), true);
});

test('reports one local slug that points at conflicting display identities', () => {
  const result = resolveCatalogExercises(
    [request(), request({ displayName: 'Bench Press' })],
    [{ id: validId, name: 'Barbell Bench Press', exercisedb_id: '0025' }],
  );

  assert.equal(result.resolved.length, 0);
  assert.equal(result.unresolved.length, 1);
  assert.equal(result.unresolved[0].reason, 'local_identity_conflict');
});

test('resolution errors are actionable and retain structured unresolved details', () => {
  const result = resolveCatalogExercises([request()], []);
  const error = new CatalogResolutionError(result.unresolved);

  assert.match(error.message, /Reconnect, refresh the catalog, or choose another exercise/);
  assert.equal(error.unresolved[0].request.localExerciseId, 'barbell-bench-press');
});

test('unresolved local-only exercises are excluded from persisted candidate pools', () => {
  const candidateIds = new Set(getAlternativesFor('Full Body').map((exercise) => exercise.id));

  assert.equal(candidateIds.has('barbell-clean'), false);
  assert.equal(candidateIds.has('dumbbell-thruster'), false);
  assert.equal(candidateIds.has('deadlift'), true);
  assert.equal(candidateIds.has('barbell-power-clean'), true);
});
