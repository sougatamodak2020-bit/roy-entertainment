import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 })
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    
    if (!apiKey) {
      // Return mock data if no API key
      return NextResponse.json({
        title: 'Sample Movie Title',
        description: 'This is a sample description for the movie.',
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration_seconds: 7200,
        channel_title: 'Roy Entertainment',
        view_count: 1000000,
        publish_date: new Date().toISOString(),
      })
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube data')
    }

    const data = await response.json()
    
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const video = data.items[0]
    const snippet = video.snippet
    const contentDetails = video.contentDetails
    const statistics = video.statistics

    // Parse ISO 8601 duration
    const durationMatch = contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    const hours = parseInt(durationMatch?.[1] || '0')
    const minutes = parseInt(durationMatch?.[2] || '0')
    const seconds = parseInt(durationMatch?.[3] || '0')
    const duration_seconds = hours * 3600 + minutes * 60 + seconds

    return NextResponse.json({
      title: snippet.title,
      description: snippet.description,
      thumbnail_url: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url,
      duration_seconds,
      channel_title: snippet.channelTitle,
      view_count: parseInt(statistics.viewCount || '0'),
      publish_date: snippet.publishedAt,
    })
  } catch (error) {
    console.error('YouTube API error:', error)
    return NextResponse.json({ error: 'Failed to fetch video data' }, { status: 500 })
  }
}