// src/app/api/chat/route.ts
// Roy AI Chat — Groq (FREE, ultra-fast) with Gemini fallback
// POST /api/chat  { messages: [{role, content}] }
//
// Setup:
//   1. Get FREE Groq key → https://console.groq.com  (no billing needed)
//   2. Add to .env.local:  GROQ_API_KEY=gsk_...
//   3. Gemini still used as fallback if you have GEMINI_API_KEY set

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Direct client — no next/headers dependency in API routes
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const SYSTEM_PROMPT = `You are Roy AI 🎬, a movie guide chatbot for Roy Entertainment — a Bengali and Indian streaming platform.
- When greeted (hi/hello/hey), introduce yourself and ask what they want to watch
- Keep replies SHORT (2-4 sentences max)
- Be warm and conversational
- Use 1 emoji max per message
- NEVER say "Not much" or respond to greetings as "how are you" questions
- NEVER mention Netflix, Prime Video, Hotstar or any competitor
- Only recommend movies from the catalog provided
- If asked something unrelated to movies, gently redirect back to movies`

async function getMovieCatalog(): Promise<string> {
  try {
    const supabase = getSupabase()
    const { data } = await supabase
      .from("movies")
      .select("title, genre, language, release_year, rating")
      .eq("is_published", true)
      .order("rating", { ascending: false })
      .limit(15)
    if (!data?.length) return "No movies available yet — platform is growing!"
    return data
      .map(m => `- ${m.title} (${m.release_year ?? "?"}) | ${(m.genre ?? []).join(", ")} | ${m.language ?? "?"}`)
      .join("\n")
  } catch {
    return ""
  }
}

// ── Groq API call (free, uses Llama 3) ──────────────────────────────────────
async function callGroq(
  apiKey: string,
  messages: { role: string; content: string }[],
  systemWithCatalog: string
): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "llama-3.1-8b-instant",  // Free, very fast
        max_tokens:  300,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemWithCatalog },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.warn(`[Chat] Groq ${res.status}:`, err)
      return null
    }

    const data = await res.json()
    return data?.choices?.[0]?.message?.content?.trim() ?? null
  } catch (err) {
    console.warn("[Chat] Groq failed:", err)
    return null
  }
}

// ── Gemini fallback ──────────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  prompt: string
): Promise<string | null> {
  try {
    const models = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.0-pro"]

    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
          }),
        }
      )

      if (res.status === 404 || res.status === 429) {
        console.warn(`[Chat] Gemini ${model} → ${res.status}, trying next...`)
        continue
      }

      if (!res.ok) {
        console.warn(`[Chat] Gemini ${model} error ${res.status}`)
        continue
      }

      const data = await res.json()
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (reply) return reply.replace(/^Roy AI:\s*/i, "").trim()
    }

    return null
  } catch (err) {
    console.warn("[Chat] Gemini failed:", err)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const messages: { role: string; content: string }[] = body.messages ?? []

    if (!messages.length) {
      return NextResponse.json({ reply: "Send me a message! 🎬" })
    }

    const groqKey   = process.env.GROQ_API_KEY
    const geminiKey = process.env.GEMINI_API_KEY

    if (!groqKey && !geminiKey) {
      return NextResponse.json({
        reply: "Roy AI needs a GROQ_API_KEY in .env.local — get one free at console.groq.com 🔧"
      })
    }

    const catalog           = await getMovieCatalog()
    const systemWithCatalog = `${SYSTEM_PROMPT}\n\nRoy Entertainment Movie Catalog:\n${catalog}`

    // ── 1. Try Groq first (free + fast) ─────────────────────────────────────
    if (groqKey) {
      const reply = await callGroq(groqKey, messages, systemWithCatalog)
      if (reply) return NextResponse.json({ reply, provider: "groq" })
    }

    // ── 2. Fallback to Gemini ────────────────────────────────────────────────
    if (geminiKey) {
      const history = messages
        .map(m => `${m.role === "user" ? "User" : "Roy AI"}: ${m.content}`)
        .join("\n")
      const lastMsg = messages.filter(m => m.role === "user").pop()?.content ?? ""
      const prompt  = `${systemWithCatalog}\n\nConversation:\n${history}\n\nReply to: "${lastMsg}"\nRoy AI:`

      const reply = await callGemini(geminiKey, prompt)
      if (reply) return NextResponse.json({ reply, provider: "gemini" })
    }

    // ── Both failed ──────────────────────────────────────────────────────────
    return NextResponse.json({
      reply: "I'm taking a short break 😅 Please try again in a minute!"
    })

  } catch (error: any) {
    console.error("[Chat API] Crash:", error?.message ?? error)
    return NextResponse.json({ reply: "Something went wrong. Please try again! 🙏" })
  }
}

// ── GET /api/chat — health check ─────────────────────────────────────────────
export async function GET() {
  const groqKey   = process.env.GROQ_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  const results: Record<string, string> = {}

  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", max_tokens: 5,
          messages: [{ role: "user", content: "say ok" }],
        }),
      })
      results["groq"] = res.ok ? "✅ working" : `❌ ${res.status}`
    } catch { results["groq"] = "❌ failed" }
  } else {
    results["groq"] = "⚠️ GROQ_API_KEY not set"
  }

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "say ok" }] }], generationConfig: { maxOutputTokens: 5 } }),
        }
      )
      results["gemini"] = res.ok ? "✅ working" : `❌ ${res.status}`
    } catch { results["gemini"] = "❌ failed" }
  } else {
    results["gemini"] = "⚠️ GEMINI_API_KEY not set (optional fallback)"
  }

  return NextResponse.json({ providers: results })
}