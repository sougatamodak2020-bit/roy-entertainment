// src/app/(auth)/login/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, Loader2, Sparkles, AlertCircle, Users, Video } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type AccountType = 'audience' | 'creator'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [accountType,    setAccountType]    = useState<AccountType>('audience')
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPassword,   setShowPassword]   = useState(false)
  const [isLoading,      setIsLoading]      = useState(false)
  const [googleLoading,  setGoogleLoading]  = useState(false)
  const [error,          setError]          = useState('')
  const [mousePos,       setMousePos]       = useState({ x: 0, y: 0 })
  const [mounted,        setMounted]        = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!authLoading && user) router.push('/')
  }, [user, authLoading, router])

  // Auto-select Creator tab if ?mode=creator in URL
  useEffect(() => {
    if (searchParams.get('mode') === 'creator') {
      setAccountType('creator')
    }
  }, [searchParams])

  useEffect(() => {
    setMounted(true)
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      })
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password.')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please confirm your email before signing in.')
        } else {
          setError(signInError.message)
        }
        return
      }
      if (data.user) {
        // Check if creator role matches
        if (accountType === 'creator') {
          // Check profiles table for role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle()
          const role = profile?.role || data.user.user_metadata?.role
          if (role !== 'creator' && role !== 'admin') {
            // Update role to creator in profiles
            await supabase.from('profiles').upsert({
              id: data.user.id,
              role: 'creator',
              email: data.user.email,
            })
          }
          router.push('/creator')
        } else {
          router.push('/')
        }
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) {
        setError(error.message.includes('provider is not enabled')
          ? 'Google login is not configured. Use email/password.'
          : error.message)
        setGoogleLoading(false)
      }
    } catch {
      setError('Google login failed.')
      setGoogleLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030305', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-ring" />
      </div>
    )
  }
  if (user) return null

  const isCreator = accountType === 'creator'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030305',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Dynamic background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: mounted
          ? `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, ${isCreator ? 'rgba(255,98,0,0.13)' : 'rgba(255,140,0,0.10)'} 0%, transparent 50%),
             radial-gradient(circle at 20% 80%, rgba(255,98,0,0.08) 0%, transparent 40%),
             radial-gradient(circle at 80% 20%, rgba(255,183,51,0.07) 0%, transparent 40%)`
          : 'radial-gradient(circle at 50% 50%, rgba(255,98,0,0.08) 0%, transparent 50%)',
        transition: 'background 0.3s ease',
      }} />

      {/* Floating orbs */}
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,183,51,0.15))', filter: 'blur(90px)', top: '8%', left: '8%', animation: 'float1 9s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,183,51,0.15), rgba(255,98,0,0.2))', filter: 'blur(110px)', bottom: '8%', right: '8%', animation: 'float2 11s ease-in-out infinite' }} />

      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,98,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,98,0,0.025) 1px, transparent 1px)', backgroundSize: '52px 52px', opacity: 0.6 }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 460,
        margin: '0 1rem',
        padding: '2.5rem',
        background: 'rgba(12,10,7,0.82)',
        backdropFilter: 'blur(24px)',
        borderRadius: 24,
        border: `1px solid ${isCreator ? 'rgba(255,98,0,0.3)' : 'rgba(255,140,0,0.2)'}`,
        boxShadow: `0 25px 60px rgba(0,0,0,0.6), 0 0 80px ${isCreator ? 'rgba(255,98,0,0.12)' : 'rgba(255,140,0,0.08)'}`,
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>
        {/* Top glow line */}
        <div style={{
          position: 'absolute', top: -1, left: '15%', right: '15%', height: 2,
          background: 'linear-gradient(90deg, transparent, var(--brand-core), var(--brand-gold), transparent)',
          borderRadius: '100%',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%',
            overflow: 'hidden', margin: '0 auto 1rem',
            boxShadow: '0 0 30px rgba(255,98,0,0.4)',
            border: '2px solid rgba(255,140,0,0.35)',
          }}>
            <Image src="/images/logo.jpg" alt="Roy Entertainment" width={68} height={68}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              onError={(e) => {
                const t = e.target as HTMLImageElement
                t.style.display = 'none'
                if (t.parentElement) t.parentElement.innerHTML = `<span style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;color:white;display:flex;align-items:center;justify-content:center;height:100%">RE</span>`
              }}
            />
          </div>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.9rem', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
            <span className="gradient-text">Welcome Back</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.88rem' }}>Sign in to Roy Entertainment</p>
        </div>

        {/* ── Account Type Toggle ─────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem', marginBottom: '1.75rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '0.35rem',
        }}>
          {([
            { type: 'audience' as AccountType, label: 'Audience',       Icon: Users, desc: 'Watch content' },
            { type: 'creator'  as AccountType, label: 'Creator',        Icon: Video, desc: 'Upload films'  },
          ]).map(({ type, label, Icon, desc }) => {
            const active = accountType === type
            return (
              <button
                key={type}
                onClick={() => { setAccountType(type); setError('') }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '0.25rem', padding: '0.8rem 0.5rem',
                  borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: active ? 'linear-gradient(135deg, rgba(255,98,0,0.22), rgba(255,140,0,0.14))' : 'transparent',
                  outline: active ? '1px solid rgba(255,140,0,0.4)' : '1px solid transparent',
                  transition: 'all 0.25s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: active ? 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.25s',
                  boxShadow: active ? '0 0 14px rgba(255,98,0,0.4)' : 'none',
                }}>
                  <Icon style={{ width: 17, height: 17, color: active ? 'white' : 'rgba(255,255,255,0.4)' }} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? 'white' : 'rgba(255,255,255,0.45)', transition: 'color 0.25s' }}>{label}</span>
                <span style={{ fontSize: '0.7rem', color: active ? 'rgba(255,183,51,0.8)' : 'rgba(255,255,255,0.25)' }}>{desc}</span>
              </button>
            )
          })}
        </div>

        {/* Creator notice */}
        {isCreator && (
          <div style={{
            display: 'flex', gap: '0.6rem', alignItems: 'flex-start',
            padding: '0.75rem 1rem', borderRadius: 12, marginBottom: '1.25rem',
            background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)',
          }}>
            <Video style={{ width: 15, height: 15, color: 'var(--brand-gold)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,200,80,0.85)', lineHeight: 1.5 }}>
              Creator accounts can upload films. Your uploads are reviewed by our admin team before going live.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 12, marginBottom: '1.25rem' }}>
            <AlertCircle style={{ width: 17, height: 17, color: '#f87171', flexShrink: 0 }} />
            <p style={{ color: '#fca5a5', fontSize: '0.85rem' }}>{error}</p>
          </div>
        )}

        {/* Google */}
        <button onClick={handleGoogleLogin} disabled={googleLoading} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem',
          padding: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, color: 'white', fontSize: '0.92rem',
          cursor: googleLoading ? 'not-allowed' : 'pointer', marginBottom: '1.25rem',
          opacity: googleLoading ? 0.6 : 1, transition: 'background 0.2s',
        }}
        onMouseOver={e => { if (!googleLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          {googleLoading ? <Loader2 style={{ width: 19, height: 19, animation: 'spin 1s linear infinite' }} /> : (
            <>
              <svg width="19" height="19" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, color: 'rgba(255,140,0,0.55)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" required
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.88rem 1rem 0.88rem 46px', color: 'white', fontSize: '0.92rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, color: 'rgba(255,140,0,0.55)' }} />
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password" required
                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.88rem 46px', color: 'white', fontSize: '0.92rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0 }}>
                {showPassword ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-fire" style={{
            width: '100%', justifyContent: 'center',
            padding: '1rem', fontSize: '1rem', fontWeight: 700,
            opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer',
          }}>
            {isLoading
              ? <Loader2 style={{ width: 19, height: 19, animation: 'spin 1s linear infinite' }} />
              : <><Sparkles style={{ width: 17, height: 17 }} /> Sign In as {accountType === 'creator' ? 'Creator' : 'Audience'}</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '1.4rem', fontSize: '0.88rem' }}>
          New here?{' '}
          <Link href="/signup" style={{ color: 'var(--brand-gold)', textDecoration: 'none', fontWeight: 600 }}>
            Create account
          </Link>
        </p>
      </div>

      <style jsx>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(28px,-28px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-35px,35px)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}