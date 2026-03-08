// src/app/(auth)/signup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Flame, Users, Film } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type AccountType = 'audience' | 'creator'

export default function SignupPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [accountType,  setAccountType]  = useState<AccountType>('audience')
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading,    setIsLoading]    = useState(false)
  const [agreed,       setAgreed]       = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState(false)
  const [mousePos,     setMousePos]     = useState({ x: 0, y: 0 })
  const [mounted,      setMounted]      = useState(false)

  useEffect(() => {
    setMounted(true)
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const getStrength = () => {
    if (password.length < 6) return 0
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (/[^A-Za-z0-9]/.test(password)) s++
    return s
  }
  const strengthColor = ['#ef4444','#f97316','#eab308','#22c55e']
  const strengthLabel = ['Weak','Fair','Good','Strong']
  const strength = getStrength()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { setError('Please agree to the terms and conditions'); return }
    setError(''); setIsLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim(), full_name: name.trim(), role: accountType },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signUpError) {
        setError(signUpError.message.includes('already registered')
          ? 'This email is already registered. Please sign in instead.'
          : signUpError.message)
        return
      }
      if (data.user) {
        if (data.user.identities?.length === 0) {
          setError('This email is already registered. Please sign in instead.')
          return
        }
        // Also upsert role in profiles
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: name.trim(),
          role: accountType,
        })
        if (data.session) {
          router.push(accountType === 'creator' ? '/creator' : '/')
          router.refresh()
        } else {
          setSuccess(true)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{
          maxWidth: 420, width: '100%',
          background: 'var(--bg-elevated)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(34,197,94,0.3)', borderRadius: 24,
          padding: '2.5rem', textAlign: 'center',
        }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle style={{ width: 40, height: 40, color: '#22c55e' }} />
          </div>
          <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '2rem', letterSpacing: '0.05em', marginBottom: '0.75rem', color: 'white' }}>Check Your Email</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '2rem', fontSize: '0.92rem' }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            Click it to verify your account and start watching.
          </p>
          <Link href="/login">
            <button className="btn-fire" style={{ width: '100%', justifyContent: 'center', padding: '0.9rem' }}>
              Go to Sign In
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const isCreator = accountType === 'creator'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-void)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>

      {/* Ambient background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: mounted
          ? `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,98,0,0.07) 0%, transparent 55%),
             radial-gradient(circle at 75% 15%, rgba(255,183,51,0.08) 0%, transparent 45%),
             radial-gradient(circle at 20% 80%, rgba(255,98,0,0.06) 0%, transparent 40%)`
          : 'radial-gradient(circle at 50% 30%, rgba(255,98,0,0.08) 0%, transparent 50%)',
      }} />
      <div style={{
        position: 'absolute', width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,98,0,0.1) 0%, transparent 70%)',
        filter: 'blur(80px)', top: '10%', right: '5%',
        animation: 'floatOrb 12s ease-in-out infinite', pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 460,
        margin: '2rem 1rem',
        padding: '2.5rem',
        background: 'rgba(14,14,24,0.82)',
        backdropFilter: 'blur(24px)',
        borderRadius: 24,
        border: '1px solid rgba(255,140,0,0.15)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,98,0,0.06)',
      }}>

        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: -1, left: '15%', right: '15%', height: 2,
          background: 'linear-gradient(90deg, transparent, #FF6200, #FFB733, #FF6200, transparent)',
          borderRadius: 100,
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <Link href="/">
            <div style={{
              width: 58, height: 58, borderRadius: '50%', overflow: 'hidden',
              margin: '0 auto 1rem', border: '2px solid rgba(255,140,0,0.3)',
              boxShadow: '0 0 24px rgba(255,98,0,0.25)',
              cursor: 'pointer',
            }}>
              <Image src="/images/logo.jpg" alt="Roy Entertainment" width={58} height={58} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </div>
          </Link>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '2rem', letterSpacing: '0.08em',
            background: 'linear-gradient(90deg, #FF6200, #FFB733)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem',
          }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Join Roy Entertainment
          </p>
        </div>

        {/* Account Type Toggle */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '0.35rem',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {([
            { type: 'audience' as AccountType, Icon: Users, label: 'Audience',  desc: 'Watch films' },
            { type: 'creator'  as AccountType, Icon: Film,  label: 'Creator',   desc: 'Upload films' },
          ]).map(({ type, Icon, label, desc }) => {
            const active = accountType === type
            return (
              <button key={type} type="button" onClick={() => setAccountType(type)} style={{
                padding: '0.65rem 0.5rem',
                borderRadius: 10, border: 'none',
                background: active
                  ? 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,183,51,0.15))'
                  : 'transparent',
                boxShadow: active ? 'inset 0 0 0 1px rgba(255,140,0,0.35)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
              }}>
                <Icon style={{ width: 18, height: 18, color: active ? '#FF8C00' : 'var(--text-muted)', transition: 'color 0.2s' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: active ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'color 0.2s' }}>{label}</span>
                <span style={{ fontSize: '0.67rem', color: active ? 'rgba(255,183,51,0.7)' : 'var(--text-dim, rgba(255,255,255,0.25))' }}>{desc}</span>
              </button>
            )
          })}
        </div>

        {/* Creator badge */}
        {isCreator && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 0.9rem', borderRadius: 10, marginBottom: '1.25rem',
            background: 'rgba(255,98,0,0.08)', border: '1px solid rgba(255,140,0,0.2)',
          }}>
            <Flame style={{ width: 14, height: 14, color: '#FF8C00', flexShrink: 0 }} />
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,183,51,0.8)', lineHeight: 1.4 }}>
              Creator accounts can upload films and manage a studio. Subject to admin review.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
            padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.28)', borderRadius: 12, marginBottom: '1.25rem',
          }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#f87171', flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#fca5a5', fontSize: '0.86rem' }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignup}>

          {/* Name */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative' }}>
              <User style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Full name" required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Lock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)" required minLength={6}
                style={{ ...inputStyle, paddingRight: 48 }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 0, display: 'flex',
              }}>
                {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
              </button>
            </div>

            {/* Password strength */}
            {password && (
              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i < strength ? strengthColor[strength - 1] : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
                {strength > 0 && (
                  <p style={{ fontSize: '0.72rem', color: strengthColor[strength - 1] }}>
                    {strengthLabel[strength - 1]}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Terms */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
            <div
              onClick={() => setAgreed(!agreed)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                border: `2px solid ${agreed ? '#FF8C00' : 'rgba(255,255,255,0.2)'}`,
                background: agreed ? 'rgba(255,140,0,0.2)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s', cursor: 'pointer',
              }}
            >
              {agreed && <CheckCircle style={{ width: 11, height: 11, color: '#FFB733' }} />}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              I agree to the{' '}
              <Link href="/terms" style={{ color: 'var(--brand-gold, #FFB733)', textDecoration: 'none' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: 'var(--brand-gold, #FFB733)', textDecoration: 'none' }}>Privacy Policy</Link>
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !agreed}
            className="btn-fire"
            style={{
              width: '100%', justifyContent: 'center',
              padding: '0.95rem', fontSize: '0.95rem', fontWeight: 700,
              opacity: isLoading || !agreed ? 0.65 : 1,
              cursor: isLoading || !agreed ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading
              ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
              : isCreator ? '🎬 Create Creator Account' : 'Create Account'
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1.5rem', fontSize: '0.86rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--brand-gold, #FFB733)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>

      <style jsx>{`
        @keyframes floatOrb {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-20px, 25px) scale(1.06); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '0.85rem 1rem 0.85rem 44px',
  color: 'white',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'Outfit, sans-serif',
  transition: 'border-color 0.2s',
}