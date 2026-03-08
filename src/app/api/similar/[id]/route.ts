// src/app/api/similar/[id]/route.ts
// Returns movies similar to a given movie using vector similarity
// GET /api/similar/[movie-uuid]?limit=6

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: movieId } = await params
    const limit   = parseInt(request.nextUrl.searchParams.get("limit") || "6")

    if (!movieId) {
      return NextResponse.json({ results: [] })
    }

    const supabase = getSupabase()

    // Use vector similarity to find similar movies
    const { data, error } = await supabase.rpc("get_similar_movies", {
      movie_id:    movieId,
      match_count: limit,
    })

    if (error) {
      console.warn("[Similar] Vector search failed, falling back to genre match:", error.message)

      // Fallback: get movie genres then find by genre overlap
      const { data: movie } = await supabase
        .from("movies")
        .select("genre")
        .eq("id", movieId)
        .single()

      if (movie?.genre?.length) {
        const { data: genreMatches } = await supabase
          .from("movies")
          .select("id, title, slug, poster_url, release_year, genre, rating")
          .overlaps("genre", movie.genre)
          .neq("id", movieId)
          .eq("is_published", true)
          .order("rating", { ascending: false })
          .limit(limit)

        return NextResponse.json({ results: genreMatches ?? [], method: "genre-fallback" })
      }

      return NextResponse.json({ results: [], error: error.message })
    }

    return NextResponse.json({ results: data ?? [], method: "vector" })

  } catch (error: any) {
    console.error("[Similar API]", error)
    return NextResponse.json({ error: "Failed to get similar movies" }, { status: 500 })
  }
}