import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !RAPIDAPI_KEY) {
  console.error(
    "[Fatal] Missing environment variables. Check .env for EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY, and RAPIDAPI_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PAGE_SIZE = 10;
const DELAY_MS = 300; // stay within free tier rate limits

interface ExerciseDBItem {
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(offset: number): Promise<ExerciseDBItem[]> {
  const res = await fetch(
    `https://exercisedb.p.rapidapi.com/exercises?limit=${PAGE_SIZE}&offset=${offset}`,
    {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY!,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`ExerciseDB error: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAllExercises(): Promise<ExerciseDBItem[]> {
  console.log("[Fetching] ExerciseDB V1 — paginating 10 at a time...");
  const all: ExerciseDBItem[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchPage(offset);
    if (page.length === 0) break;
    all.push(...page);
    process.stdout.write(`\r[Fetching] ${all.length} exercises retrieved...`);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(DELAY_MS);
  }

  console.log(`\n[Fetched] ${all.length} exercises total`);
  return all;
}

function mapExercise(e: ExerciseDBItem) {
  return {
    name: e.name,
    primary_muscle: e.bodyPart,
    target_muscle: e.target,
    equipment: e.equipment,
    secondary_muscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
  };
}

async function seed() {
  const exercises = await fetchAllExercises();
  const rows = exercises.map(mapExercise);

  console.log(`[Upserting] ${rows.length} rows into Supabase...`);
  const { error } = await supabase
    .from("exercises")
    .upsert(rows, { onConflict: "name", ignoreDuplicates: true });

  if (error) {
    console.error("[Error] Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`[Done] Seeded ${rows.length} exercises.`);
}

seed().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
