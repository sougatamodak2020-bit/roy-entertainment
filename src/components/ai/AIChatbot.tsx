// src/components/ai/AIChatbot.tsx
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle, X, Send, Loader2, Sparkles, Film,
  Minimize2, RefreshCw, AlertCircle, ChevronDown,
} from 'lucide-react'

/* ── Types ── */
interface Message {
  id:      string
  role:    'user' | 'assistant' | 'error'
  content: string
  ts:      number
}

interface ChatState {
  status: 'idle' | 'loading' | 'error'
  error:  string | null
}

/* ── Suggestion chips — cycle through these ── */
const SUGGESTION_SETS = [
  ['Recommend a thriller', 'Best action movies', 'Top rated films', 'New releases'],
  ['Hindi movies', 'Best Tamil films', 'Romantic comedies', 'Award winners'],
  ['Movies like Inception', 'Best directors', 'Classic films', 'Underrated gems'],
]

/* ── Unique ID helper ── */
const uid = () => Math.random().toString(36).slice(2, 9)

/* ── Greeting messages — random each session ── */
const GREETINGS = [
  "Hi! I'm Roy AI 🎬 Your personal movie guide. Ask me for recommendations, plot summaries, or what's trending!",
  "Hey there! Ready to find your next favourite film? 🍿 I know everything on Roy Entertainment — just ask!",
  "Welcome! I'm Roy AI. Tell me your mood and I'll find the perfect movie for you 🎭",
]

export function AIChatbot() {
  const [open,       setOpen]       = useState(false)
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [chatState,  setChatState]  = useState<ChatState>({ status: 'idle', error: null })
  const [unread,     setUnread]     = useState(false)
  const [sugSet,     setSugSet]     = useState(0)
  const [isTyping,   setIsTyping]   = useState(false)
  const [inputRows,  setInputRows]  = useState(1)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  /* ── Init greeting on first open ── */
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
      setUnread(false)
      if (messages.length === 0) {
        const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
        setMessages([{
          id:      uid(),
          role:    'assistant',
          content: greeting,
          ts:      Date.now(),
        }])
      }
    }
  }, [open]) // eslint-disable-line

  /* ── Auto-scroll to bottom ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatState.status])

  /* ── Auto-resize textarea ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const lines = e.target.value.split('\n').length
    const approxRows = Math.min(4, Math.max(1, lines))
    setInputRows(approxRows)
  }

  /* ── Send message ── */
  const send = useCallback(async (text?: string) => {
    const q = (text ?? input).trim()
    if (!q || chatState.status === 'loading') return

    setInput('')
    setInputRows(1)
    setChatState({ status: 'loading', error: null })

    const userMsg: Message = { id: uid(), role: 'user', content: q, ts: Date.now() }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)

    // Cancel any previous in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // Simulate typing indicator briefly
    setIsTyping(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body: JSON.stringify({
          messages: nextMessages
            .filter(m => m.role !== 'error')
            .map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()
      setIsTyping(false)

      if (!res.ok) {
        const errMsg = data.error || `Server error (${res.status})`
        setMessages(prev => [...prev, {
          id:      uid(),
          role:    'error',
          content: errMsg,
          ts:      Date.now(),
        }])
        setChatState({ status: 'error', error: errMsg })
        return
      }

      const reply = data.reply || "I didn't catch that — could you rephrase?"
      const assistantMsg: Message = { id: uid(), role: 'assistant', content: reply, ts: Date.now() }
      setMessages(prev => [...prev, assistantMsg])
      setChatState({ status: 'idle', error: null })

      // If panel is closed, mark unread
      if (!open) setUnread(true)

      // Rotate suggestion set
      setSugSet(s => (s + 1) % SUGGESTION_SETS.length)

    } catch (err: any) {
      setIsTyping(false)
      if (err.name === 'AbortError') {
        setChatState({ status: 'idle', error: null })
        return
      }
      const errMsg = 'Connection error. Check your internet and try again.'
      setMessages(prev => [...prev, { id: uid(), role: 'error', content: errMsg, ts: Date.now() }])
      setChatState({ status: 'error', error: errMsg })
    }
  }, [input, messages, chatState.status, open])

  /* ── Retry last failed message ── */
  const retry = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return
    // Remove error messages at the end
    setMessages(prev => {
      const cleaned = [...prev]
      while (cleaned.length && cleaned[cleaned.length - 1].role === 'error') {
        cleaned.pop()
      }
      return cleaned
    })
    setChatState({ status: 'idle', error: null })
    setTimeout(() => send(lastUser.content), 50)
  }

  /* ── Clear chat ── */
  const clearChat = () => {
    abortRef.current?.abort()
    setMessages([])
    setChatState({ status: 'idle', error: null })
    setInput('')
    setInputRows(1)
    setIsTyping(false)
    // Re-add greeting
    setTimeout(() => {
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
      setMessages([{ id: uid(), role: 'assistant', content: greeting, ts: Date.now() }])
    }, 100)
  }

  /* ── Keyboard handler ── */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const isLoading       = chatState.status === 'loading'
  const showSuggestions = messages.length <= 1 && !isLoading
  const suggestions     = SUGGESTION_SETS[sugSet]

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        style={{
          position:   'fixed', bottom: '1.75rem', right: '1.75rem', zIndex: 9000,
          width: 56,  height: 56, borderRadius: '50%', border: 'none',
          background: open
            ? 'rgba(30,30,40,0.95)'
            : 'linear-gradient(135deg, #FF6200, #FF8C00)',
          boxShadow: open
            ? '0 0 0 2px rgba(255,98,0,0.3), 0 8px 24px rgba(0,0,0,0.5)'
            : '0 4px 24px rgba(255,98,0,0.5), 0 0 0 1px rgba(255,140,0,0.3)',
          cursor:    'pointer',
          display:   'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          transform:  open ? 'scale(0.9) rotate(90deg)' : 'scale(1)',
        }}
      >
        {open
          ? <X style={{ width: 22, height: 22, color: 'white' }} />
          : <MessageCircle style={{ width: 22, height: 22, color: 'white' }} />
        }
        {/* Unread dot */}
        {unread && !open && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 13, height: 13, borderRadius: '50%',
            background: '#FFB733',
            border:  '2.5px solid var(--bg-void, #08080E)',
            animation: 'unreadPulse 2s ease infinite',
          }} />
        )}
        {/* Ripple when closed */}
        {!open && (
          <span style={{
            position: 'absolute', inset: -4,
            borderRadius: '50%',
            border: '2px solid rgba(255,98,0,0.3)',
            animation: 'ripple 2.5s ease-out infinite',
          }} />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position:     'fixed',
          bottom:       '5.5rem',
          right:        '1.75rem',
          zIndex:        8999,
          width:        'min(380px, calc(100vw - 2rem))',
          height:       'min(560px, calc(100vh - 8rem))',
          display:      'flex',
          flexDirection: 'column',
          background:   'rgba(10,10,18,0.97)',
          backdropFilter: 'blur(28px)',
          border:       '1px solid rgba(255,140,0,0.18)',
          borderRadius:  22,
          boxShadow:    '0 28px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,98,0,0.06)',
          overflow:     'hidden',
          animation:    'chatSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* ── Header ── */}
          <div style={{
            padding:    '0.85rem 1rem',
            borderBottom: '1px solid rgba(255,140,0,0.12)',
            display:    'flex', alignItems: 'center', gap: '0.65rem',
            background: 'linear-gradient(135deg, rgba(255,98,0,0.08), rgba(255,140,0,0.04))',
            flexShrink: 0,
          }}>
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(255,98,0,0.35), rgba(255,140,0,0.2))',
              border:     '1.5px solid rgba(255,140,0,0.35)',
              display:    'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow:  '0 0 12px rgba(255,98,0,0.2)',
            }}>
              <Sparkles style={{ width: 16, height: 16, color: '#FFB733' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'white', lineHeight: 1.2 }}>Roy AI</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: isLoading ? '#FFB733' : '#22c55e',
                  animation:  isLoading ? 'statusPulse 1s ease infinite' : 'none',
                }} />
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>
                  {isLoading ? 'Thinking…' : 'Powered by Gemini · Always on'}
                </span>
              </div>
            </div>
            {/* Actions */}
            <button onClick={clearChat} title="New chat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgba(255,255,255,0.3)', display: 'flex', borderRadius: 7, transition: 'color 0.15s' }}
              onMouseOver={e => e.currentTarget.style.color='rgba(255,255,255,0.7)'}
              onMouseOut={e => e.currentTarget.style.color='rgba(255,255,255,0.3)'}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
            </button>
            <button onClick={() => setOpen(false)} title="Minimize"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, color: 'rgba(255,255,255,0.3)', display: 'flex', borderRadius: 7, transition: 'color 0.15s' }}
              onMouseOver={e => e.currentTarget.style.color='rgba(255,255,255,0.7)'}
              onMouseOut={e => e.currentTarget.style.color='rgba(255,255,255,0.3)'}
            >
              <ChevronDown style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {/* ── Messages ── */}
          <div style={{
            flex:        1,
            overflowY:   'auto',
            padding:     '0.85rem 0.9rem',
            display:     'flex', flexDirection: 'column', gap: '0.6rem',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,140,0,0.15) transparent',
          }}>

            {messages.map((msg) => (
              <div key={msg.id} style={{
                display:    'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap:        '0.4rem',
                animation:  'msgFadeIn 0.22s ease',
              }}>
                {/* AI avatar */}
                {(msg.role === 'assistant' || msg.role === 'error') && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'error'
                      ? 'rgba(239,68,68,0.2)'
                      : 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,140,0,0.15))',
                    border: `1px solid ${msg.role === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(255,140,0,0.25)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 2,
                  }}>
                    {msg.role === 'error'
                      ? <AlertCircle style={{ width: 11, height: 11, color: '#f87171' }} />
                      : <Film style={{ width: 11, height: 11, color: '#FF8C00' }} />
                    }
                  </div>
                )}

                <div style={{
                  maxWidth:  '80%',
                  padding:   '0.65rem 0.9rem',
                  borderRadius: msg.role === 'user'
                    ? '18px 18px 4px 18px'
                    : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(255,98,0,0.28), rgba(255,140,0,0.18))'
                    : msg.role === 'error'
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(255,255,255,0.06)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(255,140,0,0.32)'
                    : msg.role === 'error'
                    ? '1px solid rgba(239,68,68,0.2)'
                    : '1px solid rgba(255,255,255,0.07)',
                  fontSize:   '0.84rem',
                  lineHeight: 1.6,
                  color: msg.role === 'user'
                    ? 'rgba(255,255,255,0.95)'
                    : msg.role === 'error'
                    ? '#fca5a5'
                    : 'rgba(220,220,235,0.9)',
                  whiteSpace: 'pre-wrap',
                  wordBreak:  'break-word',
                }}>
                  {msg.content}
                  {/* Retry button on error */}
                  {msg.role === 'error' && (
                    <button onClick={retry}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.5rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '0.3rem 0.65rem', color: '#fca5a5', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>
                      <RefreshCw style={{ width: 11, height: 11 }} /> Retry
                    </button>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(255,98,0,0.4), rgba(255,140,0,0.25))',
                    border: '1px solid rgba(255,140,0,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 2,
                    fontSize: '0.65rem', fontWeight: 800, color: '#FFB733', fontFamily: 'Outfit,sans-serif',
                  }}>
                    U
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {(isLoading || isTyping) && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', animation: 'msgFadeIn 0.2s ease' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,140,0,0.15))', border: '1px solid rgba(255,140,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Film style={{ width: 11, height: 11, color: '#FF8C00' }} />
                </div>
                <div style={{ padding: '0.65rem 0.9rem', borderRadius: '18px 18px 18px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '0.28rem', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,140,0,0.7)', animation: `dotBounce 1.3s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Suggestions ── */}
          {showSuggestions && (
            <div style={{ padding: '0 0.9rem 0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.38rem', flexShrink: 0 }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ padding: '0.28rem 0.7rem', borderRadius: 9999, background: 'rgba(255,98,0,0.09)', border: '1px solid rgba(255,140,0,0.2)', color: 'rgba(255,183,51,0.8)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'Outfit,sans-serif' }}
                  onMouseOver={e => { e.currentTarget.style.background='rgba(255,98,0,0.2)'; e.currentTarget.style.borderColor='rgba(255,140,0,0.4)' }}
                  onMouseOut={e => { e.currentTarget.style.background='rgba(255,98,0,0.09)'; e.currentTarget.style.borderColor='rgba(255,140,0,0.2)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Input area ── */}
          <div style={{
            padding:    '0.65rem 0.8rem',
            borderTop:  '1px solid rgba(255,255,255,0.06)',
            display:    'flex', gap: '0.5rem', flexShrink: 0,
            background: 'rgba(255,255,255,0.015)',
            alignItems: 'flex-end',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              rows={inputRows}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              disabled={isLoading}
              placeholder={isLoading ? 'Roy AI is thinking…' : 'Ask about movies, shows, recommendations…'}
              style={{
                flex:       1,
                background: 'rgba(255,255,255,0.05)',
                border:     '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding:    '0.6rem 0.85rem',
                color:      'white',
                fontSize:   '0.84rem',
                outline:    'none',
                fontFamily: 'Outfit,sans-serif',
                resize:     'none',
                lineHeight: 1.55,
                transition: 'border-color 0.2s, background 0.2s',
                opacity:    isLoading ? 0.6 : 1,
                cursor:     isLoading ? 'not-allowed' : 'text',
              }}
              onFocus={e => { e.target.style.borderColor='rgba(255,140,0,0.5)'; e.target.style.background='rgba(255,255,255,0.07)' }}
              onBlur={e  => { e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.background='rgba(255,255,255,0.05)' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || isLoading}
              title={isLoading ? 'Waiting for response…' : 'Send (Enter)'}
              style={{
                width:      40,
                height:     40,
                borderRadius: 13,
                border:     'none',
                flexShrink: 0,
                background: input.trim() && !isLoading
                  ? 'linear-gradient(135deg, #FF6200, #FF8C00)'
                  : 'rgba(255,255,255,0.06)',
                cursor:     input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display:    'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow:  input.trim() && !isLoading ? '0 2px 14px rgba(255,98,0,0.4)' : 'none',
                transform:  input.trim() && !isLoading ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              {isLoading
                ? <Loader2 style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)', animation: 'spin 1s linear infinite' }} />
                : <Send style={{ width: 15, height: 15, color: input.trim() ? 'white' : 'rgba(255,255,255,0.25)', marginLeft: 1 }} />
              }
            </button>
          </div>

          {/* Powered by footer */}
          <div style={{ textAlign: 'center', paddingBottom: '0.4rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.18)', fontFamily: 'Outfit,sans-serif', letterSpacing: '0.04em' }}>
              Powered by Google Gemini
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.65); opacity: 0.45; }
          40%           { transform: scale(1.1);  opacity: 1;    }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ripple {
          0%   { transform: scale(1);    opacity: 0.5; }
          100% { transform: scale(1.7);  opacity: 0;   }
        }
        @keyframes unreadPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,183,51,0.5); }
          50%      { box-shadow: 0 0 0 5px rgba(255,183,51,0); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>
    </>
  )
}