import assert from 'node:assert/strict';
import test from 'node:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { installProgram, archiveProgram, restoreProgram } from '../../features/programs/commands';
import type { ProgramRepository } from '../../features/programs/repository';

import {
  DEFAULT_PROGRAM_NAME,
  normalizeProgramArtifact,
  validateProgramArtifact,
} from '../../features/programs/contracts';

const exerciseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function artifact() {
  return {
    name: '  ',
    goal: 'general_fitness',
    durationWeeks: 4,
    daysPerWeek: 1,
    source: 'manual' as const,
    schemaVersion: 2,
    catalogVersion: 'catalog-2026-09-10',
    policyVersion: 'program-install-v2',
    days: [
      {
        dayId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        weekNumber: 1,
        dayIndex: 1,
        orderInWeek: 1,
        workoutName: 'Day 1',
        estimatedDurationMin: 45,
        exercises: [
          {
            slotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            exerciseId,
            position: 1,
            setCount: 3,
            repRangeMin: 8,
            repRangeMax: 12,
            targetRpe: null,
            suggestedLoad: null,
            loadUnit: 'lb' as const,
            loadKind: 'external' as const,
            loadSide: 'external_total' as const,
          },
        ],
      },
    ],
    context: null,
  };
}

test('blank program names use the documented default', () => {
  assert.equal(normalizeProgramArtifact(artifact()).name, DEFAULT_PROGRAM_NAME);
});

test('an incomplete exercise mapping rejects the whole artifact', () => {
  const candidate = artifact();
  candidate.days[0].exercises[0].exerciseId = '';
  const result = validateProgramArtifact(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /catalog exercise/i);
});

test('presentation depth is not part of prescription authority', () => {
  const candidate = artifact() as ReturnType<typeof artifact> & { depthMode?: string };
  candidate.depthMode = 'advanced';
  const normalized = normalizeProgramArtifact(candidate);
  assert.equal('depthMode' in normalized, false);
});

test('manual free-path artifact is trainable', () => {
  const result = validateProgramArtifact(artifact());
  assert.equal(result.ok, true);
});


test('save retry recovers the first artifact and operation despite regenerated authoring IDs', async (t) => {
  const memory = new Map<string, string>();
  t.mock.method(AsyncStorage, 'getItem', async (key: string) => memory.get(key) ?? null);
  t.mock.method(AsyncStorage, 'setItem', async (key: string, value: string) => { memory.set(key, value); });
  t.mock.method(AsyncStorage, 'removeItem', async (key: string) => { memory.delete(key); });
  const requests: Parameters<ProgramRepository['install']>[0][] = [];
  const repository = {
    install: async (request: Parameters<ProgramRepository['install']>[0]) => {
      requests.push(request);
      if (requests.length === 1) throw new Error('network response lost');
      return { operationId: request.operationId, programId: 'installed', revisionId: 'revision', revision: 1,
        installedAt: '2026-09-14T12:00:00Z', replacedProgramId: null, replayed: true };
    },
    archive: async () => ({}),
    restore: async () => ({}),
    reviseExercise: async () => { throw new Error('not used'); },
  } satisfies ProgramRepository;
  const first = artifact();
  assert.equal((await installProgram(repository, 'owner-a', first, null, null)).status, 'unavailable');
  const rebuilt = artifact();
  rebuilt.days[0].dayId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  rebuilt.days[0].exercises[0].slotId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  assert.equal((await installProgram(repository, 'owner-a', rebuilt, 'installed', 1)).status, 'replay');
  assert.deepEqual(requests[1], requests[0]);
  assert.equal(memory.size, 0);
});

test('archive and restore retain owner-scoped operations and original checkpoint after response loss', async (t) => {
  const memory = new Map<string, string>();
  t.mock.method(AsyncStorage, 'getItem', async (key: string) => memory.get(key) ?? null);
  t.mock.method(AsyncStorage, 'setItem', async (key: string, value: string) => { memory.set(key, value); });
  t.mock.method(AsyncStorage, 'removeItem', async (key: string) => { memory.delete(key); });
  for (const action of ['archive', 'restore'] as const) {
    const requests: unknown[] = [];
    const repository = { [action]: async (request: unknown) => {
      requests.push(request);
      if (requests.length === 1) throw new Error('response lost');
      return { replayed: true };
    } } as unknown as ProgramRepository;
    const invoke = (retry: boolean) => action === 'archive'
      ? archiveProgram(repository, 'owner-a', 'program-a', 1, retry ? 3 : 2)
      : restoreProgram(repository, 'owner-a', 'program-a', 'exact', retry ? 'program-a' : null);
    await assert.rejects(invoke(false), /response lost/);
    assert.equal(memory.size, 1);
    assert.deepEqual(await invoke(true), { replayed: true });
    assert.deepEqual(requests[1], requests[0]);
    assert.equal(memory.size, 0);
  }
});

test('definitive stale install rejection permits refreshed retry and separates owners', async (t) => {
  const memory = new Map<string, string>();
  t.mock.method(AsyncStorage, 'getItem', async (key: string) => memory.get(key) ?? null);
  t.mock.method(AsyncStorage, 'setItem', async (key: string, value: string) => { memory.set(key, value); });
  t.mock.method(AsyncStorage, 'removeItem', async (key: string) => { memory.delete(key); });
  const requests: Parameters<ProgramRepository['install']>[0][] = [];
  const repository = { install: async (request: Parameters<ProgramRepository['install']>[0]) => {
    requests.push(request);
    if (requests.length === 1) throw new Error('stale_revision');
    throw new Error('offline');
  } } as unknown as ProgramRepository;
  assert.equal((await installProgram(repository, 'owner-a', artifact(), null, null)).status, 'conflict');
  assert.equal(memory.size, 0);
  await installProgram(repository, 'owner-a', artifact(), 'new-active', 2);
  await installProgram(repository, 'owner-b', artifact(), null, null);
  assert.equal(requests[1].expectedActiveProgramId, 'new-active');
  assert.notEqual(requests[1].operationId, requests[0].operationId);
  assert.notEqual(requests[1].operationId, requests[2].operationId);
  assert.equal(memory.size, 2);
});
