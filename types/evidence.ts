export type EvidenceStrength =
  | 'strong'
  | 'moderate'
  | 'mixed'
  | 'emerging'
  | 'expert_heuristic';

export type EvidenceSourceType =
  | 'position_stand'
  | 'meta_analysis'
  | 'umbrella_review'
  | 'systematic_review'
  | 'consensus_statement'
  | 'research_synthesis';

export type EvidenceSourceRoute =
  | 'research_report'
  | 'faq'
  | 'recovery_library'
  | 'program_generator';

export type EvidenceSurface =
  | 'program_generation'
  | 'readiness'
  | 'faq'
  | 'recovery_library'
  | 'trust';

export type EvidenceKey =
  | 'progressive_overload'
  | 'specificity_and_exercise_stability'
  | 'volume_and_frequency'
  | 'goal_load_ranges'
  | 'split_selection'
  | 'periodization'
  | 'autoregulation'
  | 'deloading'
  | 'cycle_phase_adjustments'
  | 'recovery_modalities';

export type AdaptationPolicyId =
  | 'goal_prescription'
  | 'split_selection'
  | 'session_time_budget'
  | 'exercise_stability'
  | 'compound_priority'
  | 'progressive_overload'
  | 'deload_cadence'
  | 'experience_scaling'
  | 'cycle_phase_caution';

export interface EvidenceRegistryEntry {
  key: EvidenceKey;
  label: string;
  summary: string;
  strength: EvidenceStrength;
  primarySourceType: EvidenceSourceType;
  sourceRoute: EvidenceSourceRoute;
  surfaces: EvidenceSurface[];
}

export interface EvidenceReference {
  key: EvidenceKey;
  label: string;
  strength: EvidenceStrength;
  sourceRoute: EvidenceSourceRoute;
}

export interface AdaptationPolicyMetadata {
  id: AdaptationPolicyId;
  label: string;
  summary: string;
  category: 'generator' | 'readiness' | 'recovery' | 'trust';
  defaultSurface: EvidenceSurface;
  evidenceKeys: EvidenceKey[];
}

export interface ExplanationMetadata {
  summary: string;
  policyIds: AdaptationPolicyId[];
  evidence: EvidenceReference[];
}
