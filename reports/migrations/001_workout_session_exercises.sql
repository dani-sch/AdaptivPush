-- Migration: Create workout_session_exercises table
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Stores per-set logged data from active workouts.
--          Powers: exercise history modal + progressive overload engine.

CREATE TABLE IF NOT EXISTS workout_session_exercises (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_history_id      uuid          REFERENCES workout_history(id) ON DELETE SET NULL,
  exercise_id             uuid          REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name           text          NOT NULL,   -- denormalized; survives if exercise row deleted
  program_day_exercise_id uuid          REFERENCES program_day_exercises(id) ON DELETE SET NULL,
  set_number              integer       NOT NULL,
  weight_lb               numeric(6,2),             -- null for bodyweight exercises
  reps                    integer,
  rpe                     numeric(3,1),             -- e.g. 7.5; null if not entered
  logged_at               timestamptz   NOT NULL DEFAULT now(),
  created_at              timestamptz   NOT NULL DEFAULT now()
);

-- Fast lookup: most recent sets per exercise per user (used by progression engine)
CREATE INDEX IF NOT EXISTS idx_wse_user_exercise_date
  ON workout_session_exercises(user_id, exercise_name, logged_at DESC);

-- Fast lookup: all sets in a given workout session (used by history modal)
CREATE INDEX IF NOT EXISTS idx_wse_workout_history
  ON workout_session_exercises(workout_history_id);

-- RLS: users can only access their own rows
ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session exercises"
  ON workout_session_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session exercises"
  ON workout_session_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);
