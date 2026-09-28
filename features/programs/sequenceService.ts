import programSequenceRepository from './sequenceRepository';
import { sequenceOperationStore } from './sequenceOperationStore';

export type SequenceRepositoryLike = typeof programSequenceRepository;

export const sequenceService = (repo: SequenceRepositoryLike = programSequenceRepository) => ({
  async change(ownerId: string, programId: string, payload: Record<string, unknown>) {
    const operationId = payload.operationId;
    if (!operationId || typeof operationId !== 'string') throw new Error('operationId is required');
    await sequenceOperationStore.savePending({
      ownerId,
      operationId,
      programId,
      kind: 'change',
      payload,
      createdAt: new Date().toISOString(),
      lastError: null,
    });
    try {
      const result = await repo.change(payload);
      await sequenceOperationStore.removePending(ownerId, operationId);
      return result;
    } catch (err) {
      await sequenceOperationStore.savePending({
        ownerId, operationId, programId, kind: 'change', payload,
        createdAt: new Date().toISOString(),
        lastError: err instanceof Error ? err.message : 'Sequence change could not be confirmed.',
      });
      throw err;
    }
  },

  async initialize(ownerId: string, payload: Record<string, unknown>) {
    const operationId = payload.operationId;
    if (!operationId || typeof operationId !== 'string') throw new Error('operationId is required');
    await sequenceOperationStore.savePending({
      ownerId,
      operationId,
      programId: typeof payload.programId === 'string' ? payload.programId : '',
      kind: 'initialize',
      payload,
      createdAt: new Date().toISOString(),
      lastError: null,
    });
    try {
      const result = await repo.initialize(payload);
      await sequenceOperationStore.removePending(ownerId, operationId);
      return result;
    } catch (err) {
      await sequenceOperationStore.savePending({
        ownerId, operationId,
        programId: typeof payload.programId === 'string' ? payload.programId : '',
        kind: 'initialize', payload, createdAt: new Date().toISOString(),
        lastError: err instanceof Error ? err.message : 'Sequence initialization could not be confirmed.',
      });
      throw err;
    }
  },

  async finalizeAdHoc(ownerId: string, programId: string, payload: Record<string, unknown>) {
    const operationId = payload.operationId;
    if (!operationId || typeof operationId !== 'string') throw new Error('operationId is required');
    await sequenceOperationStore.savePending({
      ownerId,
      operationId,
      programId,
      kind: 'finalize_ad_hoc',
      payload,
      createdAt: new Date().toISOString(),
      lastError: null,
    });
    try {
      const result = await repo.finalizeAdHoc(payload);
      await sequenceOperationStore.removePending(ownerId, operationId);
      return result;
    } catch (err) {
      await sequenceOperationStore.savePending({
        ownerId, operationId, programId, kind: 'finalize_ad_hoc', payload,
        createdAt: new Date().toISOString(),
        lastError: err instanceof Error ? err.message : 'Ad-hoc Finish could not be confirmed.',
      });
      throw err;
    }
  },
});

export default sequenceService();
