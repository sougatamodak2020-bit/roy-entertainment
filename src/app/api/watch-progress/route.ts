import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { userId, movieId, episodeId, progressSeconds, durationSeconds } = await request.json()
    
    if (!userId || (!movieId && !episodeId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const completed = progressSeconds / durationSeconds > 0.9

    const { data, error } = await supabase
      .from('watch_progress')
      .upsert({
        user_id: userId,
        movie_id: movieId || null,
        episode_id: episodeId || null,
        progress_seconds: progressSeconds,
        duration_seconds: durationSeconds,
        completed,
        last_watched: new Date().toISOString(),
      }, {
        onConflict: movieId ? 'user_id,movie_id' : 'user_id,episode_id',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ progress: data })
  } catch (error) {
    console.error('Watch progress error:', error)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('watch_progress')
      .select(`
        *,
        movie:movies(*),
        episode:episodes(*, season:seasons(*, series:series(*)))
      `)
      .eq('user_id', userId)
      .eq('completed', false)
      .order('last_watched', { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({ progress: data })
  } catch (error) {
    console.error('Fetch progress error:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}