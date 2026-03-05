import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, mood, genres, limit = 10 } = await request.json()
    const supabase = await createSupabaseServerClient()

    // Build query based on preferences
    let query = supabase
      .from('movies')
      .select('*')
      .order('rating', { ascending: false })
      .limit(limit)

    if (genres && genres.length > 0) {
      query = query.overlaps('genre', genres)
    }

    const { data: movies, error } = await query

    if (error) throw error

    // Score recommendations (in production, use ML model)
    const recommendations = movies?.map(movie => ({
      ...movie,
      score: Math.random() * 0.3 + 0.7, // Mock score
      reason: getRecommendationReason(movie, mood),
      mood_match: mood,
    })) || []

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score)

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error('Recommendation error:', error)
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
  }
}

function getRecommendationReason(movie: any, mood?: string): string {
  const reasons = [
    `Highly rated with stellar performances`,
    `Perfect for your ${mood || 'mood'}`,
    `Critically acclaimed with high rating`,
    `Trending among viewers with similar taste`,
    `Award-winning masterpiece`,
  ]
  return reasons[Math.floor(Math.random() * reasons.length)]
}