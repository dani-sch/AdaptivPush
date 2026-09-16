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

export function interactionNow(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function reportDevelopmentInteraction(name: string, startedAt: number | null): void {
  if (startedAt === null || typeof __DEV__ === 'undefined' || !__DEV__) return;
  console.debug(`[swap-performance] ${name}: ${(interactionNow() - startedAt).toFixed(1)}ms`);
}
