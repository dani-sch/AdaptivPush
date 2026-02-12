// Database enum types matching Postgres schema
export type SexAssigned = 'male' | 'female' | 'prefer_not_to_say';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'lb' | 'kg';

// User profile update payload
export interface UserProfileUpdate {
  date_of_birth?: string; // ISO date format (YYYY-MM-DD)
  sex_assigned_at_birth?: SexAssigned;
  gender_identity?: string | null;
  weight_lb?: number | null;
  weight_unit_preference?: WeightUnit;
  experience_level?: TrainingExperience;
  healthkit_enabled?: boolean;
  onboarded?: boolean;
}
