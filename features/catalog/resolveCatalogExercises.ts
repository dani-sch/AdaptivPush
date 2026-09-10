import type {
  CatalogExerciseRequest,
  CatalogExerciseRow,
  CatalogResolutionResult,
  UnresolvedCatalogExercise,
} from './contracts';
import { isCatalogExerciseId } from './contracts';

export function resolveCatalogExercises(
  requests: readonly CatalogExerciseRequest[],
  rows: readonly CatalogExerciseRow[],
): CatalogResolutionResult {
  const requestByLocalId = new Map<string, CatalogExerciseRequest>();
  const conflicts = new Map<string, UnresolvedCatalogExercise>();

  for (const request of requests) {
    const existing = requestByLocalId.get(request.localExerciseId);
    if (
      existing &&
      (existing.displayName !== request.displayName ||
        existing.exerciseDbId !== request.exerciseDbId ||
        existing.source !== request.source ||
        existing.snapshotVersion !== request.snapshotVersion)
    ) {
      conflicts.set(request.localExerciseId, {
        request,
        reason: 'local_identity_conflict',
        candidateCount: 0,
      });
      continue;
    }

    requestByLocalId.set(request.localExerciseId, request);
  }

  const rowsByExactName = new Map<string, CatalogExerciseRow[]>();
  const rowsByExerciseDbId = new Map<string, CatalogExerciseRow[]>();
  for (const row of rows) {
    const matches = rowsByExactName.get(row.name) ?? [];
    matches.push(row);
    rowsByExactName.set(row.name, matches);

    if (row.exercisedb_id) {
      const sourceMatches = rowsByExerciseDbId.get(row.exercisedb_id) ?? [];
      sourceMatches.push(row);
      rowsByExerciseDbId.set(row.exercisedb_id, sourceMatches);
    }
  }

  const resolved: CatalogResolutionResult['resolved'] = [];
  const unresolved: CatalogResolutionResult['unresolved'] = [...conflicts.values()];

  for (const request of requestByLocalId.values()) {
    if (conflicts.has(request.localExerciseId)) continue;

    const candidates = request.exerciseDbId
      ? rowsByExerciseDbId.get(request.exerciseDbId) ?? []
      : rowsByExactName.get(request.displayName) ?? [];
    if (candidates.length === 0) {
      unresolved.push({
        request,
        reason: request.exerciseDbId ? 'missing_source_id' : 'missing_exact_name',
        candidateCount: 0,
      });
      continue;
    }

    if (candidates.length > 1) {
      unresolved.push({
        request,
        reason: request.exerciseDbId ? 'ambiguous_source_id' : 'ambiguous_exact_name',
        candidateCount: candidates.length,
      });
      continue;
    }

    const candidate = candidates[0];
    if (!isCatalogExerciseId(candidate.id)) {
      unresolved.push({ request, reason: 'invalid_catalog_uuid', candidateCount: 1 });
      continue;
    }

    resolved.push({
      request,
      catalogExerciseId: candidate.id,
      catalogName: candidate.name,
      exerciseDbId: candidate.exercisedb_id,
      resolution: request.exerciseDbId ? 'source_id' : 'exact_name_compatibility',
    });
  }

  return { resolved, unresolved };
}
