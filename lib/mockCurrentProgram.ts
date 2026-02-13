import type {CurrentProgram} from "@/types/program";

const uid = () => Math.random().toString(36).slice(2, 10);

export function makeMockCurrentProgram(): CurrentProgram {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const templates = [
        { name: "Upper A", time: 55, exercises: ["Bench Press", "Row", "Incline DB Press", "Lat Pulldown", "Lateral Raise"] },
        { name: "Lower A", time: 50, exercises: ["Squat", "RDL", "Leg Press", "Calf Raise", "Core"] },
        { name: "Upper B", time: 55, exercises: ["Overhead Press", "Pull-up", "Chest Fly", "Cable Row", "Biceps Curl"] },
        { name: "Lower B", time: 50, exercises: ["Deadlift", "Lunge", "Hamstring Curl", "Leg Extension", "Core"] },
    ];

    const daysPerWeek = 4;
    const workouts = templates.slice(0, daysPerWeek).map((t, i) => ({
        id: uid(),
        name: t.name,
        day: days[i],
        estimatedTime: t.time,
        exercises: t.exercises.map((e) => ({
            id: uid(),
            name: e,
            sets: 3,
            reps: "8–12",
            muscleGroup: "Back",   // pick appropriate per exercise
            equipment: "Machine",  // etc
        })),
    }));

    return {
        id: uid(),
        name: "Strength + Mobility",
        goal: "Build strength while staying consistent",
        currentWeek: 2,
        totalWeeks: 8,
        daysPerWeek,
        workouts,
    };
}