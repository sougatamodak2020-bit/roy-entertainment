// src/app/api/chat/route.ts
// Place at: src/app/api/chat/route.ts
// Add GEMINI_API_KEY to your .env.local file

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server' // optional: for pulling real movie data

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

/* ── Rate limiting (in-memory, per IP, resets on server restart) ── */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT    = 20   // requests
const RATE_WINDOW   = 60_000 // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now  = Date.now()
  const data = rateLimitMap.get(ip)
  if (!data || now > data.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (data.count >= RATE_LIMIT) return false
  data.count++
  return true
}

/* ── Fetch real movies from Supabase to give AI context ── */
async function getMovieContext(): Promise<string> {
  try {
    // Dynamically import to avoid crashing if supabase-server isn't configured
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: movies } = await supabase
      .from('movies')
      .select('title, genre, language, release_year, description, admin_rating, is_featured, is_trending, director')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(40)

    const { data: series } = await supabase
      .from('series')
      .select('title, genre, language, release_year, description, admin_rating, is_featured, is_trending')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(20)

    if (!movies?.length && !series?.length) return ''

    const movieList = movies?.map(m =>
      `- "${m.title}" (${m.release_year || 'N/A'}) | ${(m.genre || []).join(', ')} | ${m.language} | Rating: ${m.admin_rating || 'N/A'} | Director: ${m.director || 'N/A'}${m.is_featured ? ' | FEATURED' : ''}${m.is_trending ? ' | TRENDING' : ''}`
    ).join('\n') || 'None'

    const seriesList = series?.map(s =>
      `- "${s.title}" (${s.release_year || 'N/A'}) | ${(s.genre || []).join(', ')} | ${s.language} | Rating: ${s.admin_rating || 'N/A'}${s.is_featured ? ' | FEATURED' : ''}${s.is_trending ? ' | TRENDING' : ''}`
    ).join('\n') || 'None'

    return `\n\n=== AVAILABLE CONTENT ON ROY ENTERTAINMENT ===\nMOVIES:\n${movieList}\n\nSERIES:\n${seriesList}\n=== END OF CATALOG ===`
  } catch {
    return ''
  }
}

/* ── System prompt ── */
function buildSystemPrompt(catalog: string): string {
  return `You are "Roy AI", a friendly and knowledgeable movie guide for Roy Entertainment — a premium streaming platform specializing in Indian and international cinema.

YOUR PERSONALITY:
- Warm, enthusiastic, and cinephile-passionate
- Concise but thorough — never ramble
- Use emojis naturally but sparingly (1-2 max per reply)
- Never mention competitors (Netflix, Amazon, etc.)
- Always recommend content from the Roy Entertainment catalog when relevant

YOUR CAPABILITIES:
1. Recommend movies/series from the catalog based on mood, genre, language, actor, director
2. Provide movie info: plot summaries, genres, ratings, cast
3. Help users decide what to watch ("what mood are you in?")
4. Discuss cinema broadly — history, trivia, awards
5. Guide users to features: watchlist, search, genres, new releases
6. Answer questions about Bollywood, Hollywood, South Indian cinema

RESPONSE RULES:
- If recommending, pick from the catalog below (if available), else suggest popular titles and note they may not be on the platform yet
- Keep recommendations to 2-4 items max unless asked for more
- For plot questions, give a brief spoiler-free 2-sentence summary
- If asked something outside movies/entertainment, gently redirect: "I'm best at movie stuff! But I can help you with..."
- Format lists cleanly — use line breaks, not markdown headers
- Do NOT make up movies that aren't in the catalog as being "on the platform"${catalog}`
}

/* ── POST /api/chat ── */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI service not configured. Add GEMINI_API_KEY to .env.local' },
      { status: 503 }
    )
  }

  let body: { messages: { role: string; content: string }[]; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { messages } = body
  if (!messages?.length) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  // Validate message format
  const validMessages = messages.filter(m =>
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    m.content.trim().length > 0
  )
  if (!validMessages.length) {
    return NextResponse.json({ error: 'No valid messages' }, { status: 400 })
  }

  // Limit conversation history to last 20 messages (prevent token abuse)
  const trimmedMessages = validMessages.slice(-20)

  // Fetch movie catalog for context
  const catalog      = await getMovieContext()
  const systemPrompt = buildSystemPrompt(catalog)

  // Build Gemini request — convert to Gemini's format
  // Gemini uses "user"/"model" roles (not "assistant")
  const geminiContents = trimmedMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const geminiBody = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: geminiContents,
    generationConfig: {
      temperature:     0.8,
      topK:            40,
      topP:            0.95,
      maxOutputTokens: 600,
      stopSequences:   [],
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }

  try {
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(geminiBody),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API error:', geminiRes.status, errText)

      if (geminiRes.status === 400) {
        return NextResponse.json({ error: 'Invalid request to AI service.' }, { status: 400 })
      }
      if (geminiRes.status === 403) {
        return NextResponse.json({ error: 'AI API key invalid or quota exceeded.' }, { status: 503 })
      }
      if (geminiRes.status === 429) {
        return NextResponse.json({ error: 'AI service is busy. Try again in a moment.' }, { status: 429 })
      }
      return NextResponse.json({ error: 'AI service unavailable.' }, { status: 502 })
    }

    const geminiData = await geminiRes.json()

    // Extract text from Gemini response
    const candidate = geminiData.candidates?.[0]
    if (!candidate) {
      return NextResponse.json({ error: 'No response from AI.' }, { status: 502 })
    }

    // Check for safety blocks
    if (candidate.finishReason === 'SAFETY') {
      return NextResponse.json({
        reply: "I can't respond to that, but I'm happy to help you find a great movie to watch! 🎬"
      })
    }

    const text = candidate.content?.parts?.[0]?.text
    if (!text) {
      return NextResponse.json({ error: 'Empty response from AI.' }, { status: 502 })
    }

    return NextResponse.json({ reply: text.trim() })
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

/* ── GET — health check ── */
export async function GET() {
  return NextResponse.json({
    status:    'ok',
    model:     'gemini-2.0-flash',
    configured: !!process.env.GEMINI_API_KEY,
  })
}