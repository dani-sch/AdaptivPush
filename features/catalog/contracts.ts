export const LOCAL_CATALOG_SNAPSHOT_VERSION = 'adaptivpush-local-v1' as const;

declare const catalogExerciseIdBrand: unique symbol;

export type CatalogExerciseId = string & {
  readonly [catalogExerciseIdBrand]: true;
};

export type CatalogRequestSource = 'local_snapshot' | 'dev_fixture';

export interface CatalogExerciseRequest {
  localExerciseId: string;
  displayName: string;
  exerciseDbId?: string;
  source: CatalogRequestSource;
  snapshotVersion: string;
}

export interface CatalogExerciseRow {
  id: string;
  name: string;
  exercisedb_id: string | null;
}

export interface ResolvedCatalogExercise {
  request: CatalogExerciseRequest;
  catalogExerciseId: CatalogExerciseId;
  catalogName: string;
  exerciseDbId: string | null;
  resolution: 'source_id' | 'exact_name_compatibility';
}

export type CatalogResolutionReason =
  | 'missing_exact_name'
  | 'ambiguous_exact_name'
  | 'missing_source_id'
  | 'ambiguous_source_id'
  | 'invalid_catalog_uuid'
  | 'local_identity_conflict';

export interface UnresolvedCatalogExercise {
  request: CatalogExerciseRequest;
  reason: CatalogResolutionReason;
  candidateCount: number;
}

export interface CatalogResolutionResult {
  resolved: ResolvedCatalogExercise[];
  unresolved: UnresolvedCatalogExercise[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCatalogExerciseId(value: string | null | undefined): value is CatalogExerciseId {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export class CatalogResolutionError extends Error {
  readonly unresolved: readonly UnresolvedCatalogExercise[];

  constructor(unresolved: readonly UnresolvedCatalogExercise[]) {
    const summary = unresolved
      .map(({ request, reason }) => `${request.displayName} (${reason})`)
      .join(', ');

    super(
      `Unable to resolve ${unresolved.length} exercise${unresolved.length === 1 ? '' : 's'} ` +
        `from the read-only catalog: ${summary}. Reconnect, refresh the catalog, or choose another exercise.`,
    );
    this.name = 'CatalogResolutionError';
    this.unresolved = unresolved;
  }
}
