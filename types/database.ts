export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export type SexAssigned = 'male' | 'female' | 'prefer_not_to_say';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'lb' | 'kg';
export type DepthMode = 'essential' | 'guided' | 'advanced';
export type ReadinessSource = 'apple' | 'manual';
export type ReadinessCheckinMode = 'off' | 'one_tap' | 'guided' | 'deep';
export type ReadinessCheckinSource = 'manual' | 'apple_health';
export type ReadinessAuthority = 'low' | 'moderate' | 'strong';
export type AdaptationAggressiveness = 'conservative' | 'moderate' | 'assertive';
export type WearablesPriority = 'secondary' | 'ignored';
export type EvidenceVerbosity = DepthMode;
export type DeloadRecommendationStatus =
  | 'recommended'
  | 'accepted'
  | 'dismissed'
  | 'applied'
  | 'expired';
export type ProgramGenerationContextMode = 'create' | 'defer';

export interface UserProfileRow {
  user_id: string;
  full_name: string | null;
  date_of_birth: string | null;
  sex_assigned_at_birth: SexAssigned | null;
  gender_identity: string | null;
  weight_lb: number | null;
  weight_kg: number | null;
  weight_unit_preference: WeightUnit | null;
  experience_level: TrainingExperience | null;
  days_per_week: number | null;
  training_goal: string | null;
  cycle_enabled: boolean;
  healthkit_enabled: boolean;
  onboarded: boolean;
  last_period_start_date: string | null;
  avg_cycle_length_days: number | null;
  avatar_url: string | null;
  depth_mode: DepthMode;
  session_length_preference_min: number | null;
  primary_goal_horizon: string | null;
  equipment_profile: JsonObject | null;
  rpe_familiarity: string | null;
  injury_considerations: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  date_of_birth?: string;
  sex_assigned_at_birth?: SexAssigned;
  gender_identity?: string | null;
  weight_lb?: number | null;
  weight_unit_preference?: WeightUnit;
  experience_level?: TrainingExperience;
  healthkit_enabled?: boolean;
  onboarded?: boolean;
  depth_mode?: DepthMode;
  session_length_preference_min?: number | null;
  primary_goal_horizon?: string | null;
  equipment_profile?: JsonObject | null;
  rpe_familiarity?: string | null;
  injury_considerations?: string | null;
}

export interface UserAdaptationPreferencesRow {
  user_id: string;
  readiness_enabled: boolean;
  readiness_checkin_mode: ReadinessCheckinMode;
  readiness_authority: ReadinessAuthority;
  adaptation_aggressiveness: AdaptationAggressiveness;
  cycle_support_enabled: boolean;
  symptom_tracking_enabled: boolean;
  wearables_enabled: boolean;
  wearables_priority: WearablesPriority;
  created_at: string;
  updated_at: string;
}

export interface UserAdaptationPreferencesUpdate {
  user_id: string;
  readiness_enabled?: boolean;
  readiness_checkin_mode?: ReadinessCheckinMode;
  readiness_authority?: ReadinessAuthority;
  adaptation_aggressiveness?: AdaptationAggressiveness;
  cycle_support_enabled?: boolean;
  symptom_tracking_enabled?: boolean;
  wearables_enabled?: boolean;
  wearables_priority?: WearablesPriority;
  updated_at?: string;
}

export interface ReadinessCheckinRow {
  id: string;
  user_id: string;
  checkin_date: string;
  checkin_at: string;
  checkin_mode: Exclude<ReadinessCheckinMode, 'off'> | 'apple_health';
  one_tap_state: 'low' | 'moderate' | 'high' | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
  motivation_level: number | null;
  pain_level: number | null;
  illness_flag: boolean | null;
  life_load_level: number | null;
  derived_readiness_score: number | null;
  recommended_action: string | null;
  source: ReadinessCheckinSource | string;
  raw_payload: JsonObject | null;
}

export interface CycleSymptomLogRow {
  id: string;
  user_id: string;
  log_date: string;
  logged_at: string;
  calendar_phase_context: string | null;
  cramps_level: number | null;
  fatigue_level: number | null;
  sleep_disruption_level: number | null;
  mood_level: number | null;
  pain_level: number | null;
  motivation_level: number | null;
  bloating_level: number | null;
  period_started: boolean | null;
  notes: string | null;
  source: ReadinessCheckinSource | string;
}

export interface ProgramGenerationContextRow {
  id: string;
  program_id: string;
  user_id: string;
  created_at: string;
  policy_version: string;
  evidence_version: string;
  depth_mode: DepthMode;
  experience_level: TrainingExperience | string;
  goal: string;
  days_per_week: number;
  duration_weeks: number;
  session_length_target_min: number | null;
  focus_muscle_groups: JsonValue;
  split_recommendation: JsonObject;
  volume_targets: JsonObject;
  readiness_strategy: string;
  cycle_strategy: string;
  warmup_strategy: string;
  explanation_density: EvidenceVerbosity;
  input_snapshot: JsonObject;
  output_summary: JsonObject;
}

export interface ProgramGenerationContextInsert
  extends Omit<ProgramGenerationContextRow, 'id' | 'created_at'> {}

export interface AdaptationEventRow {
  id: string;
  user_id: string;
  program_id: string | null;
  program_day_id: string | null;
  workout_session_id: string | null;
  readiness_checkin_id: string | null;
  cycle_symptom_log_id: string | null;
  deload_recommendation_id: string | null;
  event_type: string;
  trigger_source: string;
  occurred_at: string;
  accepted: boolean | null;
  before_snapshot: JsonObject | null;
  after_snapshot: JsonObject | null;
  explanation_payload: JsonObject;
  evidence_keys: JsonValue;
}

export interface DeloadRecommendationRow {
  id: string;
  user_id: string;
  program_id: string;
  week_number: number | null;
  status: DeloadRecommendationStatus;
  trigger_type: string;
  reason_summary: string;
  recommended_volume_factor: number;
  recommended_load_factor: number;
  preserve_skill_practice: boolean;
  target_days: JsonValue | null;
  evidence_keys: JsonValue;
  created_at: string;
  resolved_at: string | null;
}

export interface EvidenceDisplayPreferencesRow {
  user_id: string;
  verbosity: EvidenceVerbosity;
  show_evidence_badges: boolean;
  show_source_links: boolean;
  show_uncertainty_notes: boolean;
  auto_open_why_sheet: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvidenceDisplayPreferencesUpdate {
  user_id: string;
  verbosity?: EvidenceVerbosity;
  show_evidence_badges?: boolean;
  show_source_links?: boolean;
  show_uncertainty_notes?: boolean;
  auto_open_why_sheet?: boolean;
  updated_at?: string;
}
