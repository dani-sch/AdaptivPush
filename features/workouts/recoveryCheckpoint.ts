interface Storage {
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}
const prefixes = ['workout-drafts/v2', 'workout-drafts/v3', 'workout-drafts/v3-active', 'workout-swaps/v1',
  'workout-corrections/v1', 'workout-edit-drafts/v1', 'program-revisions/v2'];

/** Exact owner-scoped recovery records; excludes authentication and never uploads data. */
export function createRecoveryCheckpoint(storage: Storage) {
  const active = new Map<string, Promise<void>>();
  return (ownerId: string): Promise<void> => {
    if (!ownerId) return Promise.reject(new Error('A recovery owner is required.'));
    const existing = active.get(ownerId); if (existing) return existing;
    const task = (async () => {
      const key = `@adaptivpush/workout-recovery/2026-09-18/${ownerId}`;
      if (await storage.getItem(key)) return;
      const keys = (await storage.getAllKeys()).filter(k => prefixes.some(prefix => k.startsWith(`@adaptivpush/${prefix}/${ownerId}/`)));
      const records = await storage.multiGet(keys);
      await storage.setItem(key, JSON.stringify({ ownerId, capturedAt: new Date().toISOString(), records }));
    })();
    active.set(ownerId, task);
    void task.catch(() => active.delete(ownerId));
    return task;
  };
}
