// scripts/generateEmbeddings.ts
// Run: npx ts-node scripts/generateEmbeddings.ts
// Generates 384-dimension embeddings using local Xenova model (FREE, no API key needed)
// Re-run this whenever you add new movies

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { createClient } from "@supabase/supabase-js"
import { pipeline } from "@xenova/transformers"

/* ── ENV ─────────────────────────────────────────── */
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl)  throw new Error("NEXT_PUBLIC_SUPABASE_URL missing in .env.local")
if (!supabaseKey)  throw new Error("SUPABASE_SERVICE_ROLE_KEY missing in .env.local")

/* ── CLIENTS ─────────────────────────────────────── */
const supabase = createClient(supabaseUrl, supabaseKey)

/* ── LOCAL EMBEDDING MODEL (384 dims, free) ──────── */
let extractor: any

async function loadModel() {
  console.log("⏳ Loading embedding model (first run downloads ~90MB)...")
  extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
  console.log("✅ Model loaded.")
}

async function generateEmbedding(text: string): Promise<number[]> {
  const output = await extractor(text, { pooling: "mean", normalize: true })
  return Array.from(output.data) as number[]
}

/* ── MAIN ────────────────────────────────────────── */
async function run() {
  await loadModel()
  console.log("\n📽️  Fetching movies from Supabase...")

  const { data: movies, error } = await supabase
    .from("movies")
    .select("id, title, description, genre, actors, director, language, release_year")

  if (error) { console.error("Fetch error:", error); return }
  if (!movies?.length) { console.log("No movies found."); return }

  console.log(`Found ${movies.length} movies. Generating embeddings...\n`)

  for (const movie of movies) {
    const text = `
Title: ${movie.title}
Description: ${movie.description ?? ""}
Genre: ${(movie.genre ?? []).join(", ")}
Actors: ${(movie.actors ?? []).join(", ")}
Director: ${movie.director ?? ""}
Language: ${movie.language ?? ""}
Release Year: ${movie.release_year ?? ""}
`.trim()

    try {
      const embedding = await generateEmbedding(text)

      const { error: updateError } = await supabase
        .from("movies")
        .update({ embedding })
        .eq("id", movie.id)

      if (updateError) {
        console.error(`❌ Failed for "${movie.title}":`, updateError.message)
      } else {
        console.log(`✅ Embedded: ${movie.title}`)
      }
    } catch (err: any) {
      console.error(`❌ Error for "${movie.title}":`, err?.message ?? err)
    }
  }

  console.log("\n🎉 All embeddings generated successfully!")
}

run()