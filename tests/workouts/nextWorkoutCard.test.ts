import assert from 'node:assert/strict';
import test from 'node:test';

import {
  visibleWorkoutExercises,
  type HomeExerciseItem,
} from '../../features/workouts/homePresentation';

const exercises: HomeExerciseItem[] = Array.from({ length: 5 }, (_, index) => ({
  id: `stable-exercise-${index + 1}`,
  name: `Exercise ${index + 1}`,
  prescription: '3×8–12',
}));

test('Home exercise list expands and collapses without changing order or identities', () => {
  const collapsed = visibleWorkoutExercises(exercises, false);
  const expanded = visibleWorkoutExercises(exercises, true);

  assert.deepEqual(collapsed.map((exercise) => exercise.id), exercises.slice(0, 3).map((exercise) => exercise.id));
  assert.deepEqual(expanded.map((exercise) => exercise.id), exercises.map((exercise) => exercise.id));
});
