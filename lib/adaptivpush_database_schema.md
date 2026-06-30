## Table `user_profile`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `full_name` | `text` |  Nullable |
| `date_of_birth` | `date` |  Nullable |
| `sex_assigned_at_birth` | `sex_assigned` |  Nullable |
| `gender_identity` | `gender_identity` |  Nullable |
| `weight_lb` | `numeric` |  Nullable |
| `weight_kg` | `numeric` |  Nullable |
| `weight_unit_preference` | `weight_unit` |  |
| `experience_level` | `training_experience` |  Nullable |
| `days_per_week` | `int4` |  Nullable |
| `training_goal` | `text` |  Nullable |
| `cycle_enabled` | `bool` |  |
| `healthkit_enabled` | `bool` |  |
| `onboarded` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `last_period_start_date` | `date` |  Nullable |
| `avg_cycle_length_days` | `int4` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `depth_mode` | `text` |  |
| `session_length_preference_min` | `int4` |  Nullable |
| `primary_goal_horizon` | `text` |  Nullable |
| `equipment_profile` | `jsonb` |  Nullable |
| `rpe_familiarity` | `text` |  Nullable |
| `injury_considerations` | `text` |  Nullable |

## Table `programs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `name` | `text` |  |
| `goal` | `text` |  Nullable |
| `duration_weeks` | `int4` |  |
| `start_date` | `date` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `days_per_week` | `int4` |  Nullable |
| `swap_interval_weeks` | `int4` |  Nullable |
| `last_active_week` | `int4` |  Nullable |

## Table `program_days`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `program_id` | `uuid` |  |
| `week_number` | `int4` |  |
| `day_index` | `int4` |  |
| `order_in_week` | `int4` |  |
| `workout_name` | `text` |  |
| `estimated_duration_min` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `is_rest_day` | `bool` |  |
| `is_deload_week` | `bool` |  |

## Table `exercises`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `primary_muscle` | `text` |  Nullable |
| `equipment` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `target_muscle` | `text` |  Nullable |
| `secondary_muscles` | `_text` |  Nullable |
| `instructions` | `_text` |  Nullable |
| `image_url` | `text` |  Nullable |

## Table `program_day_exercises`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `program_day_id` | `uuid` |  |
| `exercise_id` | `uuid` |  |
| `position` | `int4` |  |
| `set_count` | `int4` |  |
| `rep_range_min` | `int4` |  |
| `rep_range_max` | `int4` |  |
| `target_rpe` | `numeric` |  Nullable |
| `suggested_weight_lb` | `numeric` |  Nullable |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `per_set_weights_lb` | `jsonb` |  Nullable |

## Table `workout_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `program_day_id` | `uuid` |  Nullable |
| `workout_name` | `text` |  |
| `started_at` | `timestamptz` |  |
| `ended_at` | `timestamptz` |  Nullable |
| `duration_min` | `int4` |  Nullable |
| `total_volume_lb` | `numeric` |  |
| `pr_count` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `checkin_id` | `uuid` |  Nullable |
| `light_day_applied` | `bool` |  |
| `notes` | `text` |  Nullable |

## Table `workout_exercise_sets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `session_id` | `uuid` |  |
| `exercise_id` | `uuid` |  |
| `set_number` | `int4` |  |
| `reps` | `int4` |  |
| `weight_lb` | `numeric` |  |
| `rpe` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `readiness_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `log_date` | `date` |  |
| `sleep_score` | `int4` |  Nullable |
| `soreness` | `int4` |  Nullable |
| `stress` | `int4` |  Nullable |
| `motivation` | `int4` |  Nullable |
| `readiness_score` | `numeric` |  |
| `created_at` | `timestamptz` |  |
| `cycle_phase` | `text` |  Nullable |
| `sleep_hours` | `numeric` |  Nullable |

## Table `personal_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `exercise_id` | `text` |  |
| `weight_lb` | `numeric` |  |
| `reps` | `int4` |  |
| `one_rep_max_lb` | `numeric` |  Nullable |
| `achieved_at` | `date` |  |
| `session_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `user_adaptation_preferences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `readiness_enabled` | `bool` |  |
| `readiness_checkin_mode` | `text` |  |
| `readiness_authority` | `text` |  |
| `adaptation_aggressiveness` | `text` |  |
| `cycle_support_enabled` | `bool` |  |
| `symptom_tracking_enabled` | `bool` |  |
| `wearables_enabled` | `bool` |  |
| `wearables_priority` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `readiness_checkins`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `checkin_date` | `date` |  |
| `checkin_at` | `timestamptz` |  |
| `checkin_mode` | `text` |  |
| `one_tap_state` | `text` |  Nullable |
| `sleep_hours` | `numeric` |  Nullable |
| `sleep_quality` | `int4` |  Nullable |
| `stress_level` | `int4` |  Nullable |
| `soreness_level` | `int4` |  Nullable |
| `motivation_level` | `int4` |  Nullable |
| `pain_level` | `int4` |  Nullable |
| `illness_flag` | `bool` |  Nullable |
| `life_load_level` | `int4` |  Nullable |
| `derived_readiness_score` | `numeric` |  Nullable |
| `recommended_action` | `text` |  Nullable |
| `source` | `text` |  |
| `raw_payload` | `jsonb` |  Nullable |

## Table `cycle_symptom_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `log_date` | `date` |  |
| `logged_at` | `timestamptz` |  |
| `calendar_phase_context` | `text` |  Nullable |
| `cramps_level` | `int4` |  Nullable |
| `fatigue_level` | `int4` |  Nullable |
| `sleep_disruption_level` | `int4` |  Nullable |
| `mood_level` | `int4` |  Nullable |
| `pain_level` | `int4` |  Nullable |
| `motivation_level` | `int4` |  Nullable |
| `bloating_level` | `int4` |  Nullable |
| `period_started` | `bool` |  Nullable |
| `notes` | `text` |  Nullable |
| `source` | `text` |  |

## Table `program_generation_context`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `program_id` | `uuid` |  Unique |
| `user_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |
| `policy_version` | `text` |  |
| `evidence_version` | `text` |  |
| `depth_mode` | `text` |  |
| `experience_level` | `text` |  |
| `goal` | `text` |  |
| `days_per_week` | `int4` |  |
| `duration_weeks` | `int4` |  |
| `session_length_target_min` | `int4` |  Nullable |
| `focus_muscle_groups` | `jsonb` |  |
| `split_recommendation` | `jsonb` |  |
| `volume_targets` | `jsonb` |  |
| `readiness_strategy` | `text` |  |
| `cycle_strategy` | `text` |  |
| `warmup_strategy` | `text` |  |
| `explanation_density` | `text` |  |
| `input_snapshot` | `jsonb` |  |
| `output_summary` | `jsonb` |  |

## Table `adaptation_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `program_id` | `uuid` |  Nullable |
| `program_day_id` | `uuid` |  Nullable |
| `workout_session_id` | `uuid` |  Nullable |
| `readiness_checkin_id` | `uuid` |  Nullable |
| `cycle_symptom_log_id` | `uuid` |  Nullable |
| `deload_recommendation_id` | `uuid` |  Nullable |
| `event_type` | `text` |  |
| `trigger_source` | `text` |  |
| `occurred_at` | `timestamptz` |  |
| `accepted` | `bool` |  Nullable |
| `before_snapshot` | `jsonb` |  Nullable |
| `after_snapshot` | `jsonb` |  Nullable |
| `explanation_payload` | `jsonb` |  |
| `evidence_keys` | `jsonb` |  |

## Table `deload_recommendations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `program_id` | `uuid` |  |
| `week_number` | `int4` |  Nullable |
| `status` | `text` |  |
| `trigger_type` | `text` |  |
| `reason_summary` | `text` |  |
| `recommended_volume_factor` | `numeric` |  |
| `recommended_load_factor` | `numeric` |  |
| `preserve_skill_practice` | `bool` |  |
| `target_days` | `jsonb` |  Nullable |
| `evidence_keys` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `resolved_at` | `timestamptz` |  Nullable |

## Table `evidence_display_preferences`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `user_id` | `uuid` | Primary |
| `verbosity` | `text` |  |
| `show_evidence_badges` | `bool` |  |
| `show_source_links` | `bool` |  |
| `show_uncertainty_notes` | `bool` |  |
| `auto_open_why_sheet` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
