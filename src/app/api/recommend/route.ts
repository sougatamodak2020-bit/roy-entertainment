import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { userId, mood, genres, limit = 10 } = await request.json();

    const supabase = await createSupabaseServerClient();

    // Convert user mood + genres to a query string
    const queryText = `
    Movie recommendation for:
    Mood: ${mood || "any"}
    Genres: ${genres?.join(", ") || "any"}
    `;

    // Generate embedding for query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search similar movies
    const { data, error } = await supabase.rpc("match_movies", {
      query_embedding: queryEmbedding,
      match_count: limit,
    });

    if (error) {
      console.error(error);
      throw error;
    }

    const recommendations =
      data?.map((movie: any) => ({
        ...movie,
        score: movie.similarity,
        reason: getRecommendationReason(movie, mood),
        mood_match: mood,
      })) || [];

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}

function getRecommendationReason(movie: any, mood?: string): string {
  const reasons = [
    `Perfect match for your ${mood || "current"} mood`,
    `Highly similar to movies you might enjoy`,
    `Strong genre and mood similarity`,
    `Recommended based on AI semantic search`,
    `Popular choice with high similarity score`,
  ];

  return reasons[Math.floor(Math.random() * reasons.length)];
}