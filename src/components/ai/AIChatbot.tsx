// src/components/ai/AIChatbot.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles, Film, Minimize2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Recommend a thriller',
  'Best action movies',
  'Top rated films',
  'New releases',
]

export function AIChatbot() {
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [unread,   setUnread]   = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
      setUnread(false)
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: "Hi! I'm your Roy Entertainment guide 🎬 Ask me anything — movie recommendations, what's trending, or what to watch next.",
        }])
      }
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || loading) return
    setInput('')

    const updated: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      // /api/chat always returns 200 with a reply field (graceful errors included)
      const reply = data.reply ?? "Sorry, I couldn't get a response. Try again!"
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (!open) setUnread(true)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Oops, something went wrong. Please try again in a moment.",
      }])

    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open AI chat"
        style={{
          position: 'fixed', bottom: '1.75rem', right: '1.75rem', zIndex: 9000,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #FF6200, #FF8C00)',
          boxShadow: open
            ? '0 0 0 4px rgba(255,98,0,0.25), 0 8px 32px rgba(255,98,0,0.4)'
            : '0 4px 24px rgba(255,98,0,0.45), 0 0 0 1px rgba(255,140,0,0.3)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          transform: open ? 'scale(0.92) rotate(90deg)' : 'scale(1)',
        }}
      >
        {open
          ? <X style={{ width: 22, height: 22, color: 'white' }} />
          : <MessageCircle style={{ width: 22, height: 22, color: 'white' }} />
        }
        {unread && !open && (
          <span style={{
            position: 'absolute', top: 3, right: 3,
            width: 11, height: 11, borderRadius: '50%',
            background: '#FFB733', border: '2px solid var(--bg-void)',
          }} />
        )}
      </button>

      {/* ── Chat Panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.75rem', zIndex: 8999,
          width: 'min(360px, calc(100vw - 2rem))',
          height: 'min(520px, calc(100vh - 8rem))',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(12,12,20,0.96)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,140,0,0.18)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,98,0,0.08)',
          overflow: 'hidden',
          animation: 'chatSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* Header */}
          <div style={{
            padding: '0.9rem 1rem',
            borderBottom: '1px solid rgba(255,140,0,0.12)',
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            background: 'rgba(255,98,0,0.06)',
            flexShrink: 0,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,98,0,0.3), rgba(255,140,0,0.2))',
              border: '1px solid rgba(255,140,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Sparkles style={{ width: 16, height: 16, color: '#FFB733' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'white', lineHeight: 1.2 }}>Roy AI Guide</p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,183,51,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Online · Ask me anything
              </p>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--text-muted)', display: 'flex', borderRadius: 6,
            }}>
              <Minimize2 style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '0.85rem',
            display: 'flex', flexDirection: 'column', gap: '0.65rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,140,0,0.2) transparent',
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'msgFadeIn 0.2s ease',
              }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,140,0,0.15))',
                    border: '1px solid rgba(255,140,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: '0.45rem', marginTop: 2, alignSelf: 'flex-start',
                  }}>
                    <Film style={{ width: 12, height: 12, color: '#FF8C00' }} />
                  </div>
                )}
                <div style={{
                  maxWidth: '78%',
                  padding: '0.6rem 0.85rem',
                  borderRadius: msg.role === 'user'
                    ? '16px 16px 4px 16px'
                    : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(255,98,0,0.3), rgba(255,140,0,0.2))'
                    : 'rgba(255,255,255,0.06)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(255,140,0,0.35)'
                    : '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.84rem',
                  lineHeight: 1.55,
                  color: msg.role === 'user' ? 'white' : 'var(--text-secondary, #C8C8D8)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,140,0,0.15))',
                  border: '1px solid rgba(255,140,0,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Film style={{ width: 12, height: 12, color: '#FF8C00' }} />
                </div>
                <div style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', gap: '0.3rem', alignItems: 'center',
                }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'rgba(255,140,0,0.6)',
                      animation: `dotBounce 1.2s ease-in-out ${i * 0.18}s infinite`,
                      display: 'inline-block',
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only when just greeting) */}
          {messages.length <= 1 && !loading && (
            <div style={{
              padding: '0 0.85rem 0.6rem',
              display: 'flex', flexWrap: 'wrap', gap: '0.4rem', flexShrink: 0,
            }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: '0.3rem 0.7rem', borderRadius: 9999,
                  background: 'rgba(255,98,0,0.1)', border: '1px solid rgba(255,140,0,0.22)',
                  color: 'rgba(255,183,51,0.85)', fontSize: '0.74rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Outfit,sans-serif',
                }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,98,0,0.18)'; e.currentTarget.style.borderColor = 'rgba(255,140,0,0.4)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,98,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,140,0,0.22)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '0.7rem 0.85rem',
            borderTop: '1px solid rgba(255,140,0,0.1)',
            display: 'flex', gap: '0.5rem', flexShrink: 0,
            background: 'rgba(255,255,255,0.02)',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about movies…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '0.6rem 0.85rem',
                color: 'white', fontSize: '0.85rem', outline: 'none',
                fontFamily: 'Outfit,sans-serif',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 11, border: 'none', flexShrink: 0,
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, #FF6200, #FF8C00)'
                  : 'rgba(255,255,255,0.07)',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: input.trim() && !loading ? '0 2px 12px rgba(255,98,0,0.35)' : 'none',
              }}
            >
              {loading
                ? <Loader2 style={{ width: 16, height: 16, color: 'white', animation: 'spin 1s linear infinite' }} />
                : <Send style={{ width: 16, height: 16, color: input.trim() ? 'white' : 'rgba(255,255,255,0.3)' }} />
              }
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40%           { transform: scale(1);   opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}