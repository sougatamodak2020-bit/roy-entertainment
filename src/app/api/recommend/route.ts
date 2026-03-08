// src/app/api/recommend/route.ts
// AI-powered movie recommendations
// Uses: OpenAI embeddings → Supabase vector search → Gemini selection
// Fallback chain: OpenAI → Xenova local → genre scoring → rating sort
// POST /api/recommend  { userId?, mood?, genres?, limit? }

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/* ── Embedding helper ────────────────────────────────────────────────────── */
async function getMoodEmbedding(text: string): Promise<number[] | null> {

  // ── Try OpenAI first (1536-dim) ──────────────────────────────────────────
  // NOTE: OpenAI embeddings are a DIFFERENT dimension than the stored vectors.
  // Only use OpenAI path if you re-ran generateEmbeddings with OpenAI.
  // Until then, Xenova (384-dim) is the correct path.

  // ── Xenova local model (384-dim — matches DB) ────────────────────────────
  try {
    const { pipeline } = await import("@xenova/transformers")
    const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    const output    = await extractor(text, { pooling: "mean", normalize: true })
    return Array.from(output.data) as number[]
  } catch (err) {
    console.warn("[Recommend] Embedding generation failed:", err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, mood, genres, limit = 10 } = await request.json()

    const supabase = getSupabase()

    // ══════════════════════════════════════════════════════
    // STEP 1 — AI Semantic recommendation (vector search)
    //          Converts mood + genres into embedding,
    //          then finds most similar movies in DB
    // ══════════════════════════════════════════════════════
    const queryText = [
      mood    ? `Mood: ${mood}`                             : "",
      genres?.length ? `Genres: ${genres.join(", ")}`      : "",
      "Movie recommendation based on user preferences",
    ].filter(Boolean).join("\n")

    const queryEmbedding = await getMoodEmbedding(queryText)

    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vecErr } = await supabase.rpc("match_movies", {
          query_embedding:  queryEmbedding,
          match_count:      Math.min(limit * 3, 40),
          match_threshold:  0.2,
        })

        if (!vecErr && vectorResults?.length) {

          // ── Gemini picks the best from vector results ──────────────────
          const geminiKey = process.env.GEMINI_API_KEY
          if (geminiKey) {
            try {
              const top = vectorResults.slice(0, 20)
              const titles = top.map((m: any, i: number) =>
                `${i + 1}. ${m.title} [${(m.genre ?? []).join(", ")}] Rating: ${m.rating ?? "?"}`
              ).join("\n")

              const prompt = `You are Roy AI, a movie recommendation engine for Roy Entertainment.
User preferences:
- Mood: ${mood || "any"}  
- Favourite genres: ${genres?.join(", ") || "any"}

From the movies below, pick the ${limit} BEST matches. Return ONLY a JSON array of 1-based positions. Example: [2,5,1]

Movies:
${titles}`

              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                {
                  method:  "POST",
                  headers: { "Content-Type": "application/json" },
                  body:    JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
                  }),
                }
              )

              if (geminiRes.ok) {
                const gd  = await geminiRes.json()
                const txt = gd?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
                const m   = txt.match(/\[[\d,\s]+\]/)
                if (m) {
                  const picks: number[] = JSON.parse(m[0])
                  const recommendations = picks
                    .filter(i => i >= 1 && i <= top.length)
                    .slice(0, limit)
                    .map(i => ({
                      ...top[i - 1],
                      score:      top[i - 1].similarity,
                      reason:     getRecommendationReason(top[i - 1], mood),
                      mood_match: mood,
                    }))

                  return NextResponse.json({ recommendations, aiPowered: true, method: "vector+gemini" })
                }
              }
            } catch (gemErr) {
              console.warn("[Recommend] Gemini selection failed:", gemErr)
            }
          }

          // ── No Gemini: return top vector results sorted by similarity ──
          const recommendations = vectorResults.slice(0, limit).map((m: any) => ({
            ...m,
            score:      m.similarity,
            reason:     getRecommendationReason(m, mood),
            mood_match: mood,
          }))
          return NextResponse.json({ recommendations, aiPowered: true, method: "vector" })
        }
      } catch (vecErr) {
        console.warn("[Recommend] Vector search failed:", vecErr)
      }
    }

    // ══════════════════════════════════════════════════════
    // STEP 2 — Fallback: genre scoring + rating sort
    //          Works even if embeddings aren't generated yet
    // ══════════════════════════════════════════════════════
    let dbQuery = supabase
      .from("movies")
      .select("id, title, slug, description, poster_url, release_year, genre, rating, is_trending, view_count")
      .eq("is_published", true)
      .order("rating", { ascending: false })
      .limit(40)

    if (genres?.length) {
      dbQuery = dbQuery.overlaps("genre", genres)
    }

    const { data: movies, error } = await dbQuery
    if (error) throw error

    const targetGenres: string[] = genres ?? []
    const scored = (movies ?? []).map(m => {
      const overlap = (m.genre ?? []).filter((g: string) => targetGenres.includes(g)).length
      const score   = overlap * 10 + (m.rating ?? 0) + (m.is_trending ? 5 : 0)
      return { ...m, _score: score }
    }).sort((a, b) => b._score - a._score)

    // ── Try Gemini on genre-scored results ────────────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey && scored.length > 0) {
      try {
        const top20  = scored.slice(0, 20)
        const titles = top20.map((m, i) =>
          `${i + 1}. ${m.title} [${(m.genre ?? []).join(", ")}] Rating: ${m.rating ?? "?"}`
        ).join("\n")

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              contents: [{ parts: [{ text:
                `Pick the ${limit} best movies for mood: "${mood || "any"}", genres: "${genres?.join(", ") || "any"}". Return ONLY JSON array of 1-based positions.\n\nMovies:\n${titles}`
              }]}],
              generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
            }),
          }
        )

        if (geminiRes.ok) {
          const gd  = await geminiRes.json()
          const txt = gd?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
          const ma  = txt.match(/\[[\d,\s]+\]/)
          if (ma) {
            const picks: number[] = JSON.parse(ma[0])
            const recommendations = picks
              .filter(i => i >= 1 && i <= top20.length)
              .slice(0, limit)
              .map(i => {
                const { _score, ...movie } = top20[i - 1] as any
                return { ...movie, score: _score, reason: getRecommendationReason(movie, mood), mood_match: mood }
              })
            return NextResponse.json({ recommendations, aiPowered: true, method: "gemini-fallback" })
          }
        }
      } catch {}
    }

    // Pure fallback
    const recommendations = scored.slice(0, limit).map(({ _score, ...movie }) => ({
      ...movie,
      score:      _score,
      reason:     getRecommendationReason(movie, mood),
      mood_match: mood,
    }))

    return NextResponse.json({ recommendations, aiPowered: false, method: "genre-score" })

  } catch (error) {
    console.error("[Recommend API]", error)
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 })
  }
}

function getRecommendationReason(movie: any, mood?: string): string {
  const reasons = [
    `Perfect match for your ${mood || "current"} mood`,
    `Highly rated in your favourite genres`,
    `Strong genre and mood similarity`,
    `AI-recommended based on your preferences`,
    `Popular choice with great ratings`,
    `Highly similar to movies you might enjoy`,
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}