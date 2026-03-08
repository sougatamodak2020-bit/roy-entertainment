// src/app/(main)/creator/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Film, Upload, Eye, Star, TrendingUp, Clock,
  CheckCircle, AlertCircle, LogOut, ArrowLeft, XCircle, Loader2
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type FilmStatus = 'published' | 'pending' | 'rejected' | 'draft'

interface CreatorFilm {
  id: string
  title: string
  poster_url: string | null
  view_count: number | null
  admin_rating: number | null
  rating: number | null
  status: FilmStatus
  created_at: string
  rejection_reason?: string | null
}

const STATUS_STYLE: Record<FilmStatus, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  published: { bg: 'rgba(34,197,94,0.12)',   color: '#4ADE80',            icon: <CheckCircle  size={13} />, label: 'Published' },
  pending:   { bg: 'rgba(255,140,0,0.14)',   color: 'var(--brand-gold)',  icon: <Clock        size={13} />, label: 'Pending Review' },
  rejected:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171',            icon: <XCircle      size={13} />, label: 'Rejected' },
  draft:     { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)',  icon: <AlertCircle  size={13} />, label: 'Draft' },
}

export default function CreatorDashboard() {
  const [user,       setUser]       = useState<any>(null)
  const [films,      setFilms]      = useState<CreatorFilm[]>([])
  const [loading,    setLoading]    = useState(true)
  const [notCreator,  setNotCreator]  = useState(false)
  const [upgrading,   setUpgrading]   = useState(false)
  const [upgraded,    setUpgraded]    = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [stats,      setStats]      = useState({ total: 0, totalViews: 0, avgRating: 0, pending: 0 })
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }

    // Check creator role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', authUser.id).maybeSingle()
    const role = profile?.role || authUser.user_metadata?.role
    if (role !== 'creator' && role !== 'admin') {
      // Don't silently redirect — show upgrade screen instead
      setCurrentUser(authUser)
      setLoading(false)
      setNotCreator(true)
      return
    }

    setUser(authUser)
    setCurrentUser(authUser)
    await loadFilms(authUser.id)
    setLoading(false)
  }

  const becomeCreator = async () => {
    if (!currentUser) return
    setUpgrading(true)
    try {
      await supabase.from('profiles').upsert({
        id:    currentUser.id,
        email: currentUser.email,
        role:  'creator',
      })
      // Also update user metadata so Navigation picks it up
      await supabase.auth.updateUser({ data: { role: 'creator' } })
      setUpgraded(true)
      // Brief pause then reload as creator
      setTimeout(() => {
        setNotCreator(false)
        setUpgraded(false)
        setLoading(true)
        loadFilms(currentUser.id).then(() => setLoading(false))
      }, 1200)
    } catch (err) {
      console.error(err)
    } finally {
      setUpgrading(false)
    }
  }

  const loadFilms = async (userId: string) => {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, poster_url, view_count, admin_rating, rating, is_published, created_at')
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); return }

    // Map is_published to status logic:
    // is_published=true → published
    // is_published=false + uploaded_by set → pending (admin hasn't approved yet)
    // We'll use a convention: if the movie has is_published=false and was recently uploaded, it's pending
    const mapped: CreatorFilm[] = (data ?? []).map((m: any) => ({
      id:           m.id,
      title:        m.title,
      poster_url:   m.poster_url,
      view_count:   m.view_count,
      admin_rating: m.admin_rating,
      rating:       m.rating,
      status:       m.is_published ? 'published' : 'pending',
      created_at:   m.created_at,
    }))

    setFilms(mapped)

    const published = mapped.filter(f => f.status === 'published')
    const totalViews = mapped.reduce((a, f) => a + (f.view_count || 0), 0)
    const ratings = published.filter(f => f.admin_rating || f.rating).map(f => f.admin_rating || f.rating || 0)
    const avgRating = ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0

    setStats({
      total:      mapped.length,
      totalViews,
      avgRating,
      pending:    mapped.filter(f => f.status === 'pending').length,
    })
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading Studio</p>
      </div>
    )
  }

  if (notCreator) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>

          {/* Animated icon */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'rgba(255,98,0,0.1)', border: '2px solid rgba(255,140,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.75rem',
            boxShadow: '0 0 40px rgba(255,98,0,0.12)',
          }}>
            {upgraded
              ? <CheckCircle style={{ width: 42, height: 42, color: '#22c55e' }} />
              : <Film style={{ width: 42, height: 42, color: 'var(--brand-core)' }} />
            }
          </div>

          <h2 style={{
            fontFamily: 'Bebas Neue,sans-serif', fontSize: '2.6rem',
            letterSpacing: '0.06em', marginBottom: '0.6rem',
            background: 'linear-gradient(90deg,#FF6200,#FFB733)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {upgraded ? 'Welcome, Creator!' : 'Become a Creator'}
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 380, margin: '0 auto 2rem' }}>
            {upgraded
              ? 'Your creator access is ready. Loading your studio…'
              : 'Unlock your studio to upload films, track views, and build your audience on Roy Entertainment.'
            }
          </p>

          {/* Feature pills */}
          {!upgraded && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
              {['Upload Films', 'Track Views', 'Manage Cast', 'Earn Audience'].map(f => (
                <span key={f} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.3rem 0.85rem', borderRadius: 9999,
                  background: 'rgba(255,98,0,0.1)', border: '1px solid rgba(255,140,0,0.2)',
                  fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,183,51,0.85)',
                }}>
                  ✦ {f}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {!upgraded && (
              <button
                onClick={becomeCreator}
                disabled={upgrading}
                className="btn-fire"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.9rem 2rem', fontSize: '1rem', fontWeight: 700,
                  opacity: upgrading ? 0.75 : 1, cursor: upgrading ? 'not-allowed' : 'pointer',
                }}
              >
                {upgrading
                  ? <><Loader2 style={{ width: 17, height: 17, animation: 'spin 1s linear infinite' }} /> Activating…</>
                  : <><Film style={{ width: 17, height: 17 }} /> Activate Creator Access</>
                }
              </button>
            )}
            <button onClick={() => router.push('/')} className="btn-ghost" style={{ padding: '0.9rem 1.5rem' }}>
              Back to Home
            </button>
          </div>

          {!upgraded && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Free to activate · Uploads reviewed by admin before going live
            </p>
          )}
        </div>
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Creator'

  const STAT_CARDS = [
    { label: 'Total Films',   value: stats.total.toString(),                           color: 'var(--brand-core)' },
    { label: 'Total Views',   value: stats.totalViews > 999 ? `${(stats.totalViews/1000).toFixed(1)}K` : stats.totalViews.toString(), color: '#38BDF8' },
    { label: 'Avg Rating',    value: stats.avgRating > 0 ? stats.avgRating.toString() : '—',                     color: 'var(--brand-gold)' },
    { label: 'Pending Review',value: stats.pending.toString(),                          color: 'rgba(255,140,0,0.9)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <header style={{
        background: 'var(--nav-bg)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 clamp(1rem,4vw,2rem)', height: 66,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="icon-btn" title="Back to site"><ArrowLeft size={16} /></button>
          </Link>
          <div style={{ width: 1, height: 28, background: 'var(--glass-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px var(--glow-sm)' }}>
              <Film style={{ width: 16, height: 16, color: 'white' }} />
            </div>
            <div>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', letterSpacing: '0.08em', lineHeight: 1 }}>
                <span className="gradient-text">Creator</span> Studio
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1 }}>Manage your content</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link href="/creator/upload">
            <button className="btn-fire" style={{ padding: '0.55rem 1.2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Upload size={14} /> Upload Film
            </button>
          </Link>
          <button className="icon-btn" title="Sign out"
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(1.5rem,4vh,2.5rem) clamp(1rem,4vw,2rem)' }}>

        {/* Welcome banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,98,0,0.12), rgba(255,183,51,0.07))',
          border: '1px solid var(--glass-border)', borderRadius: 20,
          padding: 'clamp(1.5rem,4vw,2rem)', marginBottom: '2rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, background: 'radial-gradient(circle, var(--glow-sm) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(1.4rem,4vw,2rem)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Welcome back, <span className="gradient-text">{userName}</span>! 🎬
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Your films are reviewed by our admin team before going live. Upload your next masterpiece!
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {STAT_CARDS.map(({ label, value, color }) => (
            <div key={label} className="creator-stat">
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '2.2rem', letterSpacing: '0.04em', lineHeight: 1, marginBottom: '0.3rem', color }}>{value}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Pending notice */}
        {stats.pending > 0 && (
          <div style={{
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
            padding: '1rem 1.25rem', borderRadius: 14, marginBottom: '1.5rem',
            background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.25)',
          }}>
            <Clock style={{ width: 17, height: 17, color: 'var(--brand-gold)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--brand-gold)', marginBottom: '0.2rem' }}>
                {stats.pending} film{stats.pending > 1 ? 's' : ''} pending admin review
              </p>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,200,80,0.7)' }}>
                Our team reviews every upload to ensure quality. This usually takes 24–48 hours.
              </p>
            </div>
          </div>
        )}

        {/* Film list */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 18, padding: 'clamp(1.25rem,3vw,1.75rem)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="section-title-bar" style={{ height: '1em' }} />
              My Films
            </h3>
            <Link href="/creator/upload" style={{ textDecoration: 'none' }}>
              <button className="btn-fire" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>+ Add New</button>
            </Link>
          </div>

          {films.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Film style={{ width: 48, height: 48, margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '1rem', marginBottom: '1rem' }}>No films uploaded yet.</p>
              <Link href="/creator/upload">
                <button className="btn-fire">Upload Your First Film</button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {films.map(film => {
                const ss = STATUS_STYLE[film.status]
                return (
                  <div key={film.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: 14, flexWrap: 'wrap', transition: 'border-color 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--glass-border-h)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  >
                    {/* Poster */}
                    <div style={{ width: 60, height: 85, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)', background: 'var(--bg-deep)' }}>
                      {film.poster_url
                        ? <Image src={film.poster_url} alt={film.title} width={60} height={85} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film style={{ width: 22, height: 22, color: 'var(--text-dim)' }} /></div>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>{film.title}</h4>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Eye size={11} /> {(film.view_count || 0).toLocaleString()} views
                        </span>
                        {(film.admin_rating || film.rating) ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--brand-gold)' }}>
                            <Star size={11} fill="currentColor" /> {film.admin_rating || film.rating}
                          </span>
                        ) : null}
                        <span style={{ color: 'var(--text-dim)' }}>
                          {new Date(film.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      {film.rejection_reason && (
                        <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.35rem' }}>
                          Reason: {film.rejection_reason}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: 9999, fontSize: '0.77rem', fontWeight: 600, background: ss.bg, color: ss.color, flexShrink: 0 }}>
                      {ss.icon} {ss.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}