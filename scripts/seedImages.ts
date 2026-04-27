/**
 * seedImages.ts — Upload exercise images to Supabase Storage.
 *
 * Reads exercisedb_id from the exercises table (no ExerciseDB list API call),
 * fetches each image from ExerciseDB /image endpoint, uploads to the
 * 'exercise-images' Supabase Storage bucket, and writes the public URL back.
 *
 * Run after seedExercises.ts has populated exercise data and the
 * 005_exercises_add_exercisedb_id.sql migration has been applied.
 *
 * Usage:
 *   npx ts-node -P scripts/tsconfig.json scripts/seedImages.ts
 *
 * Required .env vars:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_KEY   ← service role key, bypasses Storage RLS
 *   RAPIDAPI_KEY
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RAPIDAPI_KEY) {
  console.error(
    "[Fatal] Missing env vars. Need EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, RAPIDAPI_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 800;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAndUpload(exercisedbId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://exercisedb.p.rapidapi.com/image?exerciseId=${exercisedbId}&resolution=180`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY!,
          "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
        },
      },
    );
    if (!res.ok) {
      if (res.status === 429) throw new Error("429 — monthly quota exceeded");
      return null;
    }

    const buffer = await res.arrayBuffer();
    const path = `${exercisedbId}.gif`;

    const { error } = await supabase.storage
      .from("exercise-images")
      .upload(path, buffer, { contentType: "image/gif", upsert: true });

    if (error) {
      console.error(`  [Upload error] ${exercisedbId}: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage.from("exercise-images").getPublicUrl(path);
    return data.publicUrl;
  } catch (e: any) {
    if (e.message?.includes("429")) throw e; // propagate quota errors
    console.error(`  [Failed] ${exercisedbId}:`, e.message ?? e);
    return null;
  }
}

async function seedImages() {
  // Load all exercises that don't yet have a Supabase Storage image_url
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, exercisedb_id, image_url")
    .not("exercisedb_id", "is", null)
    .order("exercisedb_id", { ascending: true });

  if (error) {
    console.error("[Fatal] Could not load exercises:", error.message);
    process.exit(1);
  }

  // Skip rows that already have a Supabase Storage URL
  const supabaseBase = SUPABASE_URL!.replace(/\/$/, "");
  const pending = (exercises ?? []).filter(
    (ex) => !ex.image_url || !ex.image_url.startsWith(supabaseBase),
  );

  console.log(`[Images] ${pending.length} exercises need images (${(exercises ?? []).length} total).`);
  if (pending.length === 0) {
    console.log("[Done] All images already uploaded.");
    return;
  }

  const updates: { name: string; image_url: string }[] = [];
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (ex) => {
        const url = await fetchAndUpload(ex.exercisedb_id);
        if (url) return { name: ex.name, image_url: url };
        return null;
      }),
    );

    for (const r of results) {
      if (r) { updates.push(r); uploaded++; }
      else failed++;
    }

    const done = Math.min(i + BATCH_SIZE, pending.length);
    process.stdout.write(
      `\r[Images] ${done}/${pending.length} processed (${uploaded} ok, ${failed} failed)...`,
    );

    if (i + BATCH_SIZE < pending.length) await sleep(BATCH_DELAY_MS);
  }
  console.log();

  // Write image URLs back in chunks of 100
  if (updates.length > 0) {
    console.log(`[Writing] ${updates.length} image URLs to exercises table...`);
    const CHUNK = 100;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const { error: writeErr } = await supabase
        .from("exercises")
        .upsert(updates.slice(i, i + CHUNK), { onConflict: "name", ignoreDuplicates: false });
      if (writeErr) console.error("[Error] URL write failed:", writeErr.message);
    }
  }

  console.log(`[Done] ${uploaded} uploaded, ${failed} failed.`);
  if (failed > 0) {
    console.log("       Re-run this script to retry failed images.");
  }
}

seedImages().catch((err) => {
  if (err.message?.includes("429")) {
    console.error("\n[Fatal] Monthly API quota exceeded. Wait for it to reset, then re-run.");
  } else {
    console.error("[Fatal]", err);
  }
  process.exit(1);
});
