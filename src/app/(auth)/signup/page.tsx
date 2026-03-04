'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Eye, EyeOff, Loader2, Crown, Check, AlertCircle, CheckCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)
  
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    setMounted(true)
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) {
      setError('Please agree to the terms and conditions')
      return
    }
    
    setError('')
    setIsLoading(true)
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            full_name: name.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Please login instead.')
        } else {
          setError(signUpError.message)
        }
        return
      }
      
      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities?.length === 0) {
          setError('This email is already registered. Please login instead.')
          return
        }
        
        // Check if session exists (email confirmation disabled)
        if (data.session) {
          router.push('/')
          router.refresh()
        } else {
          // Email confirmation required
          setSuccess(true)
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = () => {
    if (password.length < 6) return 0
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e']
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']
  const strength = getPasswordStrength()

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#030305',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: '440px',
          padding: '2.5rem',
          background: 'rgba(15, 15, 20, 0.7)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <CheckCircle style={{ width: '40px', height: '40px', color: '#22c55e' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Check Your Email</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            We have sent a confirmation link to <strong style={{ color: 'white' }}>{email}</strong>. 
            Please click the link to verify your account.
          </p>
          <Link href="/login">
            <button style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
            }}>
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#030305',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: mounted ? `
          radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.1) 0%, transparent 40%)
        ` : 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
      }} />
      
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(245, 158, 11, 0.1))',
        filter: 'blur(100px)',
        top: '20%',
        right: '10%',
        animation: 'float1 10s ease-in-out infinite',
      }} />

      {/* Signup Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '440px',
        margin: '2rem 1rem',
        padding: '2.5rem',
        background: 'rgba(15, 15, 20, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(139, 92, 246, 0.1)',
      }}>
        <div style={{
          position: 'absolute',
          top: '-1px',
          left: '20%',
          right: '20%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), rgba(245, 158, 11, 0.8), transparent)',
          borderRadius: '100%',
        }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
          }}>
            <Crown style={{ width: '35px', height: '35px', color: 'white' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            <span className="gradient-text">Create Account</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Join the premium cinema experience
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            marginBottom: '1.5rem',
          }}>
            <AlertCircle style={{ width: '20px', height: '20px', color: '#f87171', flexShrink: 0 }} />
            <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <User style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: 'rgba(139, 92, 246, 0.6)',
              }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0.9rem 1rem 0.9rem 48px',
                  color: 'white',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Mail style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: 'rgba(139, 92, 246, 0.6)',
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0.9rem 1rem 0.9rem 48px',
                  color: 'white',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Lock style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: 'rgba(139, 92, 246, 0.6)',
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                required
                minLength={6}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0.9rem 48px 0.9rem 48px',
                  color: 'white',
                  fontSize: '0.95rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
              </button>
            </div>
            
            {/* Password Strength */}
            {password && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        background: i < strength ? strengthColors[strength - 1] : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                      }}
                    />
                  ))}
                </div>
                {strength > 0 && (
                  <p style={{ fontSize: '0.75rem', color: strengthColors[strength - 1] }}>
                    {strengthLabels[strength - 1]}
                  </p>
                )}
              </div>
            )}
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: '4px', accentColor: '#8b5cf6', width: '16px', height: '16px' }}
            />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              I agree to the{' '}
              <Link href="/terms" style={{ color: '#a78bfa', textDecoration: 'none' }}>Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" style={{ color: '#a78bfa', textDecoration: 'none' }}>Privacy Policy</Link>
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading || !agreed}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: (isLoading || !agreed) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !agreed) ? 0.6 : 1,
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
            }}
          >
            {isLoading ? (
              <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>

      <style jsx>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 30px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}