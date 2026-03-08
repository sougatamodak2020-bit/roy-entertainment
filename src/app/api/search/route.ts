// src/app/api/search/route.ts
// Hybrid Search: keyword (Supabase ilike) + semantic (local embeddings via Xenova)
// + optional Gemini re-ranking on top
// GET /api/search?q=thriller&type=all&limit=20

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/* ── Local embedding helper (same model as generateEmbeddings.ts) ──────────
   We call the Xenova model at runtime via a small helper.
   On Vercel/serverless this is heavy — use OpenAI embeddings there.
   For local dev it works perfectly.
────────────────────────────────────────────────────────────────────────── */
async function getQueryEmbedding(text: string): Promise<number[] | null> {
  // ── Option A: OpenAI (fast, works on Vercel, requires OPENAI_API_KEY) ──
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      const OpenAI = (await import("openai")).default
      const openai = new OpenAI({ apiKey: openaiKey })
      // NOTE: OpenAI embeddings are 1536-dim but our DB column is 384-dim.
      // If you want to use OpenAI embeddings, you must re-run generateEmbeddings
      // with OpenAI and change the DB column to vector(1536).
      // For now we use the Xenova path which matches the stored 384-dim vectors.
      void openai // silence unused warning — kept for future switch
    } catch {}
  }

  // ── Option B: Xenova local model (matches stored 384-dim vectors) ──────
  try {
    const { pipeline } = await import("@xenova/transformers")
    const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
    const output = await extractor(text, { pooling: "mean", normalize: true })
    return Array.from(output.data) as number[]
  } catch (err) {
    console.warn("[Search] Embedding generation failed:", err)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const type  = searchParams.get("type") || "all"
    const limit = parseInt(searchParams.get("limit") || "20")

    if (!query?.trim()) {
      return NextResponse.json({ results: [] })
    }

    const supabase    = getSupabase()
    const results: any[] = []
    const searchTerm  = `%${query}%`

    // ══════════════════════════════════════════════════════
    // STEP 1 — Keyword search (instant, always runs)
    // ══════════════════════════════════════════════════════
    if (type === "all" || type === "movies") {
      const { data: movies } = await supabase
        .from("movies")
        .select("id, title, slug, description, poster_url, release_year, genre, rating, is_trending")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .eq("is_published", true)
        .limit(limit)

      results.push(...(movies?.map(m => ({ ...m, type: "movie", source: "keyword" })) ?? []))
    }

    // No separate series table — all content lives in movies
    if (type === "series") {
      const { data: series } = await supabase
        .from("movies")
        .select("id, title, slug, description, poster_url, release_year, genre, rating, is_trending")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .eq("is_published", true)
        .limit(limit)

      results.push(...(series?.map(s => ({ ...s, type: "series", source: "keyword" })) ?? []))
    }

    // ══════════════════════════════════════════════════════
    // STEP 2 — AI Semantic search (vector similarity)
    //          finds movies that MEAN what the user typed
    //          e.g. "dark mystery bengali film" → ASUR
    // ══════════════════════════════════════════════════════
    const queryEmbedding = await getQueryEmbedding(query)
    if (queryEmbedding) {
      try {
        const { data: aiResults, error: aiErr } = await supabase.rpc("search_movies", {
          query_embedding:  queryEmbedding,
          match_count:      limit,
          match_threshold:  0.25,
        })

        if (!aiErr && aiResults?.length) {
          // Add AI results not already found by keyword
          const existingIds = new Set(results.map((r: any) => r.id))
          for (const m of aiResults) {
            if (!existingIds.has(m.id)) {
              results.push({ ...m, type: "movie", source: "semantic" })
            } else {
              // Boost existing result if AI also found it
              const existing = results.find((r: any) => r.id === m.id)
              if (existing) existing._aiBoost = (m.similarity ?? 0)
            }
          }
        }
      } catch (aiErr) {
        console.warn("[Search] Vector search error:", aiErr)
      }
    }

    // ══════════════════════════════════════════════════════
    // STEP 3 — Deduplicate
    // ══════════════════════════════════════════════════════
    const seen   = new Map<string, any>()
    for (const item of results) {
      if (!seen.has(item.id)) seen.set(item.id, item)
    }
    let finalResults = Array.from(seen.values())

    // ══════════════════════════════════════════════════════
    // STEP 4 — Gemini re-ranking (optional, improves order)
    //          Uses Gemini to re-order results intelligently
    // ══════════════════════════════════════════════════════
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey && finalResults.length > 1) {
      try {
        const titles = finalResults
          .slice(0, 20)
          .map((m, i) => `${i + 1}. ${m.title} [${(m.genre ?? []).join(", ")}]`)
          .join("\n")

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text:
                `User searched for: "${query}"\n\nRank these movies by relevance. Return ONLY a JSON array of 1-based positions, most relevant first. Example: [3,1,2]\n\nMovies:\n${titles}`
              }]}],
              generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
            }),
          }
        )

        if (geminiRes.ok) {
          const gd  = await geminiRes.json()
          const txt = gd?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
          const m   = txt.match(/\[[\d,\s]+\]/)
          if (m) {
            const order: number[] = JSON.parse(m[0])
            const top20    = finalResults.slice(0, 20)
            const reranked: any[] = []
            const used     = new Set<number>()
            for (const pos of order) {
              const idx = pos - 1
              if (idx >= 0 && idx < top20.length && !used.has(idx)) {
                reranked.push(top20[idx]); used.add(idx)
              }
            }
            top20.forEach((r, i) => { if (!used.has(i)) reranked.push(r) })
            reranked.push(...finalResults.slice(20))
            finalResults = reranked

            return NextResponse.json({ results: finalResults.slice(0, limit), aiRanked: true, source: "gemini" })
          }
        }
      } catch (rankErr) {
        console.warn("[Search] Gemini re-ranking failed:", rankErr)
      }
    }

    // ══════════════════════════════════════════════════════
    // STEP 5 — Fallback sort: title match > AI boost > rating
    // ══════════════════════════════════════════════════════
    finalResults.sort((a: any, b: any) => {
      const aTitle = a.title.toLowerCase().includes(query.toLowerCase())
      const bTitle = b.title.toLowerCase().includes(query.toLowerCase())
      if (aTitle && !bTitle) return -1
      if (!aTitle && bTitle) return 1
      const aBoost = a._aiBoost ?? 0
      const bBoost = b._aiBoost ?? 0
      if (bBoost !== aBoost) return bBoost - aBoost
      return (b.rating ?? 0) - (a.rating ?? 0)
    })

    return NextResponse.json({
      results: finalResults.slice(0, limit),
      aiRanked: !!queryEmbedding,
      source: queryEmbedding ? "hybrid" : "keyword",
    })

  } catch (error) {
    console.error("[Search API]", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}