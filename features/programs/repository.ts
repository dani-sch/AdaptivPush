import { supabase } from '@/utils/supabase';
import { createProgramRepository } from './repositoryCore';
export type { ProgramRepository } from './repositoryCore';

export const programRepository = createProgramRepository(supabase);
