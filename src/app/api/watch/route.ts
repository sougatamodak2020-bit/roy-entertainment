// src/app/api/watch/route.ts
// Saves watch progress to watch_history table
// POST /api/watch  { movieId, progressSeconds, completed }
// Also increments view_count on first watch

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json()
    const { movieId, progressSeconds = 0, completed = false } = reqBody

    if (!movieId) {
      return NextResponse.json({ error: "movieId required" }, { status: 400 })
    }

    const supabase = getSupabase()

    // Get userId from request body (client passes it)
    const userId = reqBody.userId
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    const user = { id: userId }

    // Upsert watch history (update if exists, insert if not)
    const { error } = await supabase
      .from("watch_history")
      .upsert(
        {
          user_id:          user.id,
          movie_id:         movieId,
          progress_seconds: progressSeconds,
          completed,
          last_watched:     new Date().toISOString(),
        },
        { onConflict: "user_id,movie_id" }
      )

    if (error) throw error

    // Increment view count via RPC
    await supabase.rpc("increment_view_count", { movie_id: movieId })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error("[Watch API]", error)
    return NextResponse.json({ error: "Failed to save watch progress" }, { status: 500 })
  }
}

// GET /api/watch?limit=10 — returns Continue Watching list for current user
export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10")

    const supabase = getSupabase()
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json({ results: [] })
    }
    const user = { id: userId }

    const { data, error } = await supabase
      .from("watch_history")
      .select(`
        progress_seconds,
        completed,
        last_watched,
        movie:movies (
          id, title, slug, poster_url, backdrop_url,
          duration_minutes, release_year, genre
        )
      `)
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("last_watched", { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ results: data ?? [] })

  } catch (error: any) {
    console.error("[Watch GET]", error)
    return NextResponse.json({ error: "Failed to get watch history" }, { status: 500 })
  }
}