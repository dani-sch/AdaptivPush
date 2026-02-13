import type { CurrentProgram, Equipment, MuscleGroup, WorkoutExercise } from '@/types/program';

const uid = () => Math.random().toString(36).slice(2, 10);

export function makeMockCurrentProgram(): CurrentProgram {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const templates = [
        {
            name: 'Upper A',
            time: 55,
            exercises: [
                ['Bench Press', 'Chest', 'Barbell'],
                ['Barbell Row', 'Back', 'Barbell'],
                ['Incline DB Press', 'Chest', 'Dumbbell'],
                ['Lat Pulldown', 'Back', 'Machine'],
                ['Lateral Raise', 'Shoulders', 'Dumbbell'],
            ],
        },
        {
            name: 'Lower A',
            time: 50,
            exercises: [
                ['Back Squat', 'Legs', 'Barbell'],
                ['Romanian Deadlift', 'Glutes', 'Barbell'],
                ['Leg Press', 'Legs', 'Machine'],
                ['Walking Lunge', 'Legs', 'Dumbbell'],
                ['Plank', 'Core', 'Bodyweight'],
            ],
        },
        {
            name: 'Upper B',
            time: 55,
            exercises: [
                ['Overhead Press', 'Shoulders', 'Barbell'],
                ['Pull-up', 'Back', 'Bodyweight'],
                ['Chest Fly', 'Chest', 'Machine'],
                ['Seated Cable Row', 'Back', 'Cable'],
                ['Biceps Curl', 'Biceps', 'Dumbbell'],
            ],
        },
        {
            name: 'Lower B',
            time: 50,
            exercises: [
                ['Hip Thrust', 'Glutes', 'Barbell'],
                ['Walking Lunge', 'Legs', 'Dumbbell'],
                ['Leg Extension', 'Legs', 'Machine'],
                ['Hamstring Curl', 'Glutes', 'Machine'],
                ['Cable Crunch', 'Core', 'Cable'],
            ],
        },
    ];

    const daysPerWeek = 4;
    const workouts = templates.slice(0, daysPerWeek).map((t, i) => ({
        id: uid(),
        name: t.name,
        day: days[i],
        estimatedTime: t.time,
        exercises: t.exercises.map(([name, muscleGroup, equipment]) => ({
            id: uid(),
            name,
            sets: 3,
            reps: '8–12',
            muscleGroup: muscleGroup as MuscleGroup,
            equipment: equipment as Equipment,
        })) as WorkoutExercise[],
    }));

    return {
        id: uid(),
        name: 'Strength + Mobility',
        goal: 'Build strength while staying consistent',
        currentWeek: 2,
        totalWeeks: 8,
        daysPerWeek,
        workouts,
    };
}