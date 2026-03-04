import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query) {
      return NextResponse.json({ results: [] })
    }

    const supabase = await createSupabaseServerClient()
    const results: any[] = []

    if (type === 'all' || type === 'movies') {
      const { data: movies } = await supabase
        .from('movies')
        .select('*')
        .or(\	itle.ilike.%\%,description.ilike.%\%\)
        .limit(limit)

      results.push(...(movies?.map(m => ({ ...m, type: 'movie' })) || []))
    }

    if (type === 'all' || type === 'series') {
      const { data: series } = await supabase
        .from('series')
        .select('*')
        .or(\	itle.ilike.%\%,description.ilike.%\%\)
        .limit(limit)

      results.push(...(series?.map(s => ({ ...s, type: 'series' })) || []))
    }

    // Sort by relevance (title match first)
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(query.toLowerCase())
      const bTitle = b.title.toLowerCase().includes(query.toLowerCase())
      if (aTitle && !bTitle) return -1
      if (!aTitle && bTitle) return 1
      return b.rating - a.rating
    })

    return NextResponse.json({ results: results.slice(0, limit) })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
