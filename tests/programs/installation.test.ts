import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_PROGRAM_NAME,
  normalizeProgramArtifact,
  validateProgramArtifact,
} from '../../features/programs/contracts';

const exerciseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function artifact() {
  return {
    name: '  ',
    goal: 'general_fitness',
    durationWeeks: 4,
    daysPerWeek: 1,
    source: 'manual' as const,
    schemaVersion: 2,
    catalogVersion: 'catalog-2026-09-10',
    policyVersion: 'program-install-v2',
    days: [
      {
        dayId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        weekNumber: 1,
        dayIndex: 1,
        orderInWeek: 1,
        workoutName: 'Day 1',
        estimatedDurationMin: 45,
        exercises: [
          {
            slotId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            exerciseId,
            position: 1,
            setCount: 3,
            repRangeMin: 8,
            repRangeMax: 12,
            targetRpe: null,
            suggestedLoad: null,
            loadUnit: 'lb' as const,
            loadKind: 'external' as const,
            loadSide: 'external_total' as const,
          },
        ],
      },
    ],
    context: null,
  };
}

test('blank program names use the documented default', () => {
  assert.equal(normalizeProgramArtifact(artifact()).name, DEFAULT_PROGRAM_NAME);
});

test('an incomplete exercise mapping rejects the whole artifact', () => {
  const candidate = artifact();
  candidate.days[0].exercises[0].exerciseId = '';
  const result = validateProgramArtifact(candidate);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /catalog exercise/i);
});

test('presentation depth is not part of prescription authority', () => {
  const candidate = artifact() as ReturnType<typeof artifact> & { depthMode?: string };
  candidate.depthMode = 'advanced';
  const normalized = normalizeProgramArtifact(candidate);
  assert.equal('depthMode' in normalized, false);
});

test('manual free-path artifact is trainable', () => {
  const result = validateProgramArtifact(artifact());
  assert.equal(result.ok, true);
});
