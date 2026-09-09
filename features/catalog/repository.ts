import {
  CatalogResolutionError,
  type CatalogExerciseRequest,
  type ResolvedCatalogExercise,
} from './contracts';
import { resolveCatalogExercises } from './resolveCatalogExercises';

import { supabase } from '@/utils/supabase';

export async function resolveCatalogExerciseRequests(
  requests: readonly CatalogExerciseRequest[],
): Promise<ReadonlyMap<string, ResolvedCatalogExercise>> {
  if (requests.length === 0) return new Map();

  const exactNames = [...new Set(requests.map((request) => request.displayName))];
  const { data: nameRows, error: nameError } = await supabase
    .from('exercises')
    .select('id, name, exercisedb_id')
    .in('name', exactNames);

  if (nameError) throw nameError;

  const sourceIds = [
    ...new Set(
      requests
        .map((request) => request.exerciseDbId)
        .filter((sourceId): sourceId is string => Boolean(sourceId)),
    ),
  ];
  const sourceResult =
    sourceIds.length > 0
      ? await supabase
          .from('exercises')
          .select('id, name, exercisedb_id')
          .in('exercisedb_id', sourceIds)
      : { data: [], error: null };

  if (sourceResult.error) throw sourceResult.error;

  const rowsById = new Map(
    [...(nameRows ?? []), ...(sourceResult.data ?? [])].map((row) => [row.id, row]),
  );

  const result = resolveCatalogExercises(requests, [...rowsById.values()]);
  if (result.unresolved.length > 0) {
    throw new CatalogResolutionError(result.unresolved);
  }

  return new Map(
    result.resolved.map((exercise) => [exercise.request.localExerciseId, exercise]),
  );
}
