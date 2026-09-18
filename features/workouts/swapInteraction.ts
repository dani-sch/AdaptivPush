export class OptionalValueCache<Key, Value> {
  private readonly settled = new Map<Key, Value | undefined>();
  private readonly pending = new Map<Key, Promise<void>>();

  prefetch(key: Key, load: () => Promise<Value | undefined>): void {
    if (this.settled.has(key) || this.pending.has(key)) return;
    const request = load()
      .then((value) => {
        this.settled.set(key, value);
      })
      .catch(() => {
        this.settled.set(key, undefined);
      })
      .finally(() => {
        this.pending.delete(key);
      });
    this.pending.set(key, request);
  }

  peek(key: Key): Value | undefined {
    return this.settled.get(key);
  }
}

export class SingleFlightGate {
  private active = false;

  tryEnter(): boolean {
    if (this.active) return false;
    this.active = true;
    return true;
  }

  leave(): void {
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}

/** Closing/unmounting invalidates all captured work, including optional lookups. */
export class InteractionScope {
  private generation = 0;
  private closed = false;
  capture(): () => boolean {
    const generation = this.generation;
    return () => !this.closed && generation === this.generation;
  }
  activate(): void { this.generation++; this.closed = false; }
  invalidate(): void { this.generation++; this.closed = true; }
}

export async function applyExercisePickerSelection(input: {
  gate: SingleFlightGate;
  interaction: InteractionScope;
  apply: (isCurrent: () => boolean) => unknown | Promise<unknown>;
  started: () => void;
  succeeded: () => void;
  failed: (error: unknown) => void;
  settled: () => void;
}): Promise<void> {
  const isCurrent = input.interaction.capture();
  if (!isCurrent() || !input.gate.tryEnter()) return;
  input.started();
  try {
    const result = await input.apply(isCurrent);
    if (isCurrent() && result !== false) input.succeeded();
  } catch (error) {
    if (isCurrent()) input.failed(error);
  } finally {
    input.gate.leave();
    if (isCurrent()) input.settled();
  }
}

export function filterExercisePickerOptions<T extends { id: string; name: string }>(
  options: T[], query: string, mode: 'add' | 'swap', current?: { exerciseId?: string; name: string } | null,
): T[] {
  const text = query.trim().toLowerCase();
  return options.filter(exercise => (mode === 'add' || (exercise.id !== current?.exerciseId && exercise.name !== current?.name))
    && (!text || exercise.name.toLowerCase().includes(text)));
}

export function interactionNow(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function reportDevelopmentInteraction(name: string, startedAt: number | null): void {
  if (startedAt === null || typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.debug(`[swap-performance] ${name}: ${(interactionNow() - startedAt).toFixed(1)}ms`);
}
