import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !RAPIDAPI_KEY) {
  console.error(
    "[Fatal] Missing environment variables. Check .env for EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY, and RAPIDAPI_KEY.",
  );
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    "[Fatal] SUPABASE_SERVICE_KEY is required for Storage uploads (bypasses RLS).\n" +
    "        Find it in Supabase Dashboard → Settings → API → service_role key.\n" +
    "        Add SUPABASE_SERVICE_KEY=<key> to your .env file.",
  );
  process.exit(1);
}

// Use anon key for DB writes, service role key for Storage uploads (needs RLS bypass).
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const PAGE_SIZE = 10;
const EXERCISE_DELAY_MS = 300;  // between exercise list pages
const IMAGE_BATCH_SIZE = 5;     // concurrent image uploads
const IMAGE_BATCH_DELAY_MS = 800; // between image batches

interface ExerciseDBItem {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl?: string;
}

// Maps ExerciseDB bodyPart + target to the app's MuscleGroup naming convention.
function mapMuscleGroup(bodyPart: string, target: string): string {
  switch (bodyPart) {
    case "chest":      return "Chest";
    case "back":       return "Back";
    case "shoulders":  return "Shoulders";
    case "upper arms":
      if (target.includes("tricep")) return "Triceps";
      return "Biceps";
    case "lower arms": return "Biceps";
    case "upper legs":
      if (target === "glutes") return "Glutes";
      return "Legs";
    case "lower legs": return "Legs";
    case "waist":      return "Core";
    case "cardio":     return "Full Body";
    default:           return bodyPart;
  }
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
  if (!res.ok) throw new Error(`ExerciseDB error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchAllExercises(): Promise<ExerciseDBItem[]> {
  console.log("[Fetching] ExerciseDB — paginating 10 at a time...");
  const all: ExerciseDBItem[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchPage(offset);
    if (page.length === 0) break;
    all.push(...page);
    process.stdout.write(`\r[Fetching] ${all.length} exercises retrieved...`);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await sleep(EXERCISE_DELAY_MS);
  }
  console.log(`\n[Fetched] ${all.length} exercises total`);
  return all;
}

// Fetch exercise image from ExerciseDB and upload to Supabase Storage.
// Returns the public Supabase URL, or null on failure.
async function uploadImage(exerciseId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/image?exerciseId=${exerciseId}&resolution=180`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY!,
          "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
        },
      },
    );
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const path = `${exerciseId}.gif`;

    const { error } = await supabaseAdmin.storage
      .from("exercise-images")
      .upload(path, buffer, { contentType: "image/gif", upsert: true });

    if (error) {
      console.error(`  [Upload error] ${exerciseId}: ${error.message}`);
      return null;
    }

    const { data } = supabaseAdmin.storage.from("exercise-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error(`  [Image failed] ${exerciseId}:`, e);
    return null;
  }
}

function mapExercise(e: ExerciseDBItem) {
  return {
    name: e.name,
    exercisedb_id: e.id,
    primary_muscle: mapMuscleGroup(e.bodyPart, e.target),
    target_muscle: e.target,
    equipment: e.equipment,
    secondary_muscles: e.secondaryMuscles ?? [],
    instructions: e.instructions ?? [],
    // image_url populated separately in phase 2 after Supabase Storage upload
  };
}

async function seed() {
  const exercises = await fetchAllExercises();

  // Deduplicate by name
  const seen = new Set<string>();
  const unique = exercises.filter((e) => {
    if (seen.has(e.name)) return false;
    seen.add(e.name);
    return true;
  });
  if (unique.length < exercises.length) {
    console.log(`[Dedup] ${exercises.length - unique.length} duplicates removed. ${unique.length} unique.`);
  }

  // Phase 1: Upsert exercise data (fast)
  console.log(`[Upserting] ${unique.length} exercise rows...`);
  const { error: upsertErr } = await supabase
    .from("exercises")
    .upsert(unique.map(mapExercise), { onConflict: "name", ignoreDuplicates: false });
  if (upsertErr) {
    console.error("[Error] Exercise upsert failed:", upsertErr.message);
    process.exit(1);
  }
  console.log("[Done] Exercise data seeded.");

  // Phase 2: Fetch images from ExerciseDB → upload to Supabase Storage
  console.log(`[Images] Uploading ${unique.length} images to Supabase Storage...`);
  console.log("         (Make sure the 'exercise-images' bucket exists and is public)");

  const imageResults: { name: string; image_url: string }[] = [];
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i += IMAGE_BATCH_SIZE) {
    const batch = unique.slice(i, i + IMAGE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (ex) => {
        const url = await uploadImage(ex.id);
        if (url) return { name: ex.name, image_url: url };
        return null;
      }),
    );

    for (const r of results) {
      if (r) {
        imageResults.push(r);
        uploaded++;
      } else {
        failed++;
      }
    }

    const done = Math.min(i + IMAGE_BATCH_SIZE, unique.length);
    process.stdout.write(`\r[Images] ${done}/${unique.length} processed (${uploaded} ok, ${failed} failed)...`);

    if (i + IMAGE_BATCH_SIZE < unique.length) {
      await sleep(IMAGE_BATCH_DELAY_MS);
    }
  }
  console.log();

  // Phase 3: Write image URLs back to the exercises table
  if (imageResults.length > 0) {
    console.log(`[Images] Writing ${imageResults.length} URLs to exercises table...`);
    const CHUNK = 100;
    for (let i = 0; i < imageResults.length; i += CHUNK) {
      const chunk = imageResults.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("exercises")
        .upsert(chunk, { onConflict: "name", ignoreDuplicates: false });
      if (error) console.error("[Error] URL write failed:", error.message);
    }
  }

  console.log(`[Done] ${uploaded} images uploaded, ${failed} failed.`);
}

seed().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
