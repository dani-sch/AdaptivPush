export const rollout = Object.freeze({
  durableWorkoutWriter: process.env.EXPO_PUBLIC_AP02_DURABLE_WRITER === 'true',
  atomicProgramWriter: process.env.EXPO_PUBLIC_AP03_ATOMIC_WRITER === 'true',
});

export class RolloutDisabledError extends Error {
  readonly code = 'ROLLOUT_DISABLED';
  readonly name = 'RolloutDisabledError';
}

export function requireRollout(enabled: boolean, capability: string): void {
  if (!enabled) {
    throw new RolloutDisabledError(`${capability} is not enabled for this build. Your existing data has not been changed.`);
  }
}
