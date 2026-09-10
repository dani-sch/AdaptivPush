export type OperationId = string & { readonly __brand: 'OperationId' };

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallbackUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createOperationId(): OperationId {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  const value = cryptoApi?.randomUUID?.() ?? fallbackUuidV4();
  return value as OperationId;
}

export function asOperationId(value: string): OperationId {
  if (!UUID_V4_PATTERN.test(value)) {
    throw new Error('Operation ID must be an opaque UUID v4.');
  }
  return value as OperationId;
}

export function isOperationId(value: string): value is OperationId {
  return UUID_V4_PATTERN.test(value);
}
