import { useEffect, useState } from 'react';
import type { CurrentProgram, Exercise } from '@/types/program';
import { makeMockCurrentProgram } from '@/lib/mockCurrentProgram';

export function useCurrentProgram() {
    const [program, setProgram] = useState<CurrentProgram | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => {
            setProgram(makeMockCurrentProgram());
            setLoading(false);
        }, 200);
        return () => clearTimeout(t);
    }, []);

    const swapExercise = (args: { exerciseId: string; replacement: Exercise; applyToProgram: boolean }) => {
        setProgram((prev) => {
            if (!prev) return prev;

            // find the original exercise (for applyToProgram matching)
            let original: Exercise | null = null;
            for (const w of prev.workouts) {
                const f = w.exercises.find((e: any) => e.id === args.exerciseId);
                if (f) { original = f as Exercise; break; }
            }
            if (!original) return prev;

            const shouldReplace = (e: any) => {
                if (e.id === args.exerciseId) return true;
                if (!args.applyToProgram) return false;
                // apply-to-program heuristic for mock data:
                // replace other occurrences of the same exercise "type"
                return e.name === original!.name && e.muscleGroup === original!.muscleGroup;
            };

            return {
                ...prev,
                workouts: prev.workouts.map((w) => ({
                    ...w,
                    exercises: w.exercises.map((e: any) => (shouldReplace(e) ? { ...args.replacement, id: e.id } : e)),
                    // note: we keep the original IDs where the swap happened so references don't break
                })),
            };
        });
    };

    return { program, loading, swapExercise };
}
