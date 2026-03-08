import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { createSupabaseServerClient } from "@/lib/supabase-server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const type = searchParams.get("type") || "all"
    const limit = parseInt(searchParams.get("limit") || "20")

    if (!query) {
      return NextResponse.json({ results: [] })
    }

    const supabase = await createSupabaseServerClient()
    const results: any[] = []

    // -------- KEYWORD SEARCH --------
    const searchTerm = `%${query}%`

    if (type === "all" || type === "movies") {
      const { data: movies } = await supabase
        .from("movies")
        .select("*")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(limit)

      results.push(...(movies?.map(m => ({ ...m, type: "movie", source: "keyword" })) || []))
    }

    if (type === "all" || type === "series") {
      const { data: series } = await supabase
        .from("series")
        .select("*")
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(limit)

      results.push(...(series?.map(s => ({ ...s, type: "series", source: "keyword" })) || []))
    }

    // -------- AI SEMANTIC SEARCH --------
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      })

      const queryEmbedding = embeddingResponse.data[0].embedding

      const { data: aiMovies } = await supabase.rpc("search_movies", {
        query_embedding: queryEmbedding,
        match_count: limit,
      })

      if (aiMovies) {
        results.push(
          ...aiMovies.map((m: any) => ({
            ...m,
            type: "movie",
            source: "ai",
          }))
        )
      }

    } catch (aiError) {
      console.warn("AI search failed, falling back to keyword search")
    }

    // -------- REMOVE DUPLICATES --------
    const unique = new Map()

    for (const item of results) {
      if (!unique.has(item.id)) {
        unique.set(item.id, item)
      }
    }

    const finalResults = Array.from(unique.values())

    // -------- SORT RESULTS --------
    finalResults.sort((a: any, b: any) => {

      const aTitle = a.title.toLowerCase().includes(query.toLowerCase())
      const bTitle = b.title.toLowerCase().includes(query.toLowerCase())

      if (aTitle && !bTitle) return -1
      if (!aTitle && bTitle) return 1

      return (b.rating ?? 0) - (a.rating ?? 0)
    })

    return NextResponse.json({
      results: finalResults.slice(0, limit),
    })

  } catch (error) {
    console.error("Search error:", error)

    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    )
  }
}