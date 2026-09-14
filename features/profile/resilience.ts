export async function withSavingState<T>(
  setSaving: (saving: boolean) => void,
  operation: () => Promise<T>,
): Promise<T> {
  setSaving(true);
  try {
    return await operation();
  } finally {
    setSaving(false);
  }
}

export function settleIndependentSections<const T extends readonly unknown[]>(
  sections: T,
): Promise<{ -readonly [K in keyof T]: PromiseSettledResult<Awaited<T[K]>> }> {
  return Promise.allSettled(sections) as Promise<{
    -readonly [K in keyof T]: PromiseSettledResult<Awaited<T[K]>>;
  }>;
}
