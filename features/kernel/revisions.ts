export type Revision = number & { readonly __brand: 'Revision' };

export function asRevision(value: number): Revision {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error('Revision must be a positive safe integer.');
  }
  return value as Revision;
}

export function nextRevision(value: Revision): Revision {
  return asRevision(value + 1);
}

export function revisionsMatch(expected: Revision, actual: Revision): boolean {
  return expected === actual;
}
