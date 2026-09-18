export function createModalHandoff() {
  let action: (() => void) | undefined;
  return {
    enqueue(next?: () => void) { if (action) return false; action = next; return true; },
    dismiss() { const next = action; action = undefined; next?.(); },
    cancel() { action = undefined; },
  };
}
