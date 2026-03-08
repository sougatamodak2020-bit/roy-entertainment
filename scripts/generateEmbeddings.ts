import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@xenova/transformers";

/* -----------------------
ENV
----------------------- */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

/* -----------------------
CLIENT
----------------------- */

const supabase = createClient(supabaseUrl, supabaseKey);

/* -----------------------
LOAD LOCAL MODEL
----------------------- */

let extractor: any;

async function loadModel() {
  console.log("Loading embedding model (first run may take a minute)...");
  extractor = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
}

/* -----------------------
GENERATE EMBEDDING
----------------------- */

async function generateEmbedding(text: string) {
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}

/* -----------------------
MAIN SCRIPT
----------------------- */

async function generateMovieEmbeddings() {

  await loadModel();

  console.log("Fetching movies...");

  const { data: movies, error } = await supabase
    .from("movies")
    .select(
      "id,title,description,genre,actors,director,language,release_year"
    );

  if (error) {
    console.error(error);
    return;
  }

  if (!movies?.length) {
    console.log("No movies found.");
    return;
  }

  for (const movie of movies) {

    console.log("Processing:", movie.title);

    const text = `
Title: ${movie.title}
Description: ${movie.description ?? ""}
Genre: ${(movie.genre ?? []).join(", ")}
Actors: ${(movie.actors ?? []).join(", ")}
Director: ${movie.director ?? ""}
Language: ${movie.language ?? ""}
Release Year: ${movie.release_year ?? ""}
`;

    try {

      const embedding = await generateEmbedding(text);

      const { error: updateError } = await supabase
        .from("movies")
        .update({ embedding })
        .eq("id", movie.id);

      if (updateError) {
        console.error("Update error:", updateError);
      } else {
        console.log("Embedding stored for:", movie.title);
      }

    } catch (err) {
      console.error("Embedding generation failed:", err);
    }
  }

  console.log("All embeddings generated.");
}

generateMovieEmbeddings();