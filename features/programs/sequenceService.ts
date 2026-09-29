import programSequenceRepository from './sequenceRepository';
import { sequenceOperationStore } from './sequenceOperationStore';
import { createOperationId } from '@/features/kernel/operationId';
import { supabase } from '@/utils/supabase';

export type SequenceRepositoryLike = typeof programSequenceRepository;

const initializations = new Map<string, Promise<Awaited<ReturnType<SequenceRepositoryLike['get']>>>>();

export const sequenceService = (repo: SequenceRepositoryLike = programSequenceRepository) => ({
  ensureInitialized(ownerId: string, programId: string) {
    const key = `${ownerId}/${programId}`;
    const running = initializations.get(key);
    if (running) return running;
    const initialize = async () => {
      await repo.capability();
      const { data, error } = await supabase.from('program_sequences')
        .select('program_id').eq('user_id', ownerId).eq('program_id', programId).maybeSingle();
      if (error) throw error;
      const pending = (await sequenceOperationStore.listPendingForOwner(ownerId))
        .filter(operation => operation.programId === programId);
      const initialization = pending.find(operation => operation.kind === 'initialize');
      if (initialization || !data) {
        if (!initialization && pending.length) {
          throw new Error('Finish syncing your previous program change before retrying.');
        }
        const payload = initialization?.payload ?? {
          schemaVersion: 1, programId, operationId: createOperationId(),
        };
        try {
          await this.initialize(ownerId, payload);
        } catch (cause) {
          if (!String(cause).toLowerCase().includes('stale_revision')) throw cause;
          await repo.get(programId);
          await sequenceOperationStore.removePending(ownerId, payload.operationId as string);
        }
      }
      return repo.get(programId);
    };
    const promise = initialize().finally(() => { initializations.delete(key); });
    initializations.set(key, promise);
    return promise;
  },
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
