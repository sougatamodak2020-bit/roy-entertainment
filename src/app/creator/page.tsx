// src/app/(main)/creator/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Film, Upload, Eye, Star, TrendingUp, Clock,
  CheckCircle, AlertCircle, LogOut, ArrowLeft
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const MOCK_FILMS = [
  { id: '1', title: 'My First Film',      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=120', views: 1250, rating: 7.5, status: 'published' },
  { id: '2', title: 'Short Documentary',  poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=120', views: 890,  rating: 8.2, status: 'pending'   },
  { id: '3', title: 'Upcoming Project',   poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=120', views: 0,    rating: 0,   status: 'draft'     },
]

const STATS = [
  { label: 'Total Films',  value: '3',    Icon: Film,       color: 'var(--brand-core)' },
  { label: 'Total Views',  value: '2.1K', Icon: Eye,        color: 'var(--success)'    },
  { label: 'Avg Rating',   value: '7.9',  Icon: Star,       color: 'var(--brand-gold)' },
  { label: 'This Month',   value: '+15%', Icon: TrendingUp, color: '#38BDF8'            },
]

const STATUS_STYLE: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  published: { bg: 'rgba(34,197,94,0.12)',  color: '#4ADE80', icon: <CheckCircle size={13} /> },
  pending:   { bg: 'rgba(255,140,0,0.14)',  color: 'var(--brand-gold)', icon: <Clock size={13} /> },
  draft:     { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', icon: <AlertCircle size={13} /> },
}

export default function CreatorDashboard() {
  const [user,    setUser]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading Studio</p>
      </div>
    )
  }

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Creator'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)' }}>

      {/* Studio header */}
      <header style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 clamp(1rem, 4vw, 2rem)',
        height: 66,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button className="icon-btn" title="Back to site">
              <ArrowLeft size={16} />
            </button>
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
            <button className="btn-fire" style={{ padding: '0.55rem 1.2rem', fontSize: '0.85rem' }}>
              <Upload size={14} /> Upload Film
            </button>
          </Link>
          <button
            className="icon-btn"
            title="Sign out"
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(1.5rem, 4vh, 2.5rem) clamp(1rem, 4vw, 2rem)' }}>

        {/* Welcome banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,98,0,0.12) 0%, rgba(255,183,51,0.07) 100%)',
          border: '1px solid var(--glass-border)',
          borderRadius: 20, padding: 'clamp(1.5rem, 4vw, 2rem)',
          marginBottom: '2rem', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'radial-gradient(circle, var(--glow-sm) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(1.4rem, 4vw, 2rem)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            Welcome back, <span className="gradient-text">{userName}</span>! 🎬
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Ready to share your next masterpiece with the world?
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {STATS.map(({ label, value, Icon, color }) => (
            <div key={label} className="creator-stat">
              <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Icon style={{ width: 18, height: 18, color }} />
              </div>
              <p style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.04em', lineHeight: 1, marginBottom: '0.25rem' }}>
                {value}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* My Films */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 18, padding: 'clamp(1.25rem, 3vw, 1.75rem)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="section-title-bar" style={{ height: '1em' }} />
              My Films
            </h3>
            <Link href="/creator/upload" style={{ textDecoration: 'none' }}>
              <button className="btn-fire" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem' }}>+ Add New</button>
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {MOCK_FILMS.map(film => {
              const ss = STATUS_STYLE[film.status]
              return (
                <div key={film.id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', background: 'var(--bg-card)',
                  border: '1px solid var(--glass-border)', borderRadius: 14,
                  transition: 'border-color 0.2s',
                  flexWrap: 'wrap',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--glass-border-h)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <div style={{ width: 65, height: 90, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)' }}>
                    <Image src={film.poster} alt={film.title} width={65} height={90} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 120 }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{film.title}</h4>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Eye size={12} /> {film.views.toLocaleString()} views
                      </span>
                      {film.rating > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand-gold)' }}>
                          <Star size={12} fill="currentColor" /> {film.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.32rem 0.8rem', borderRadius: 9999,
                    fontSize: '0.78rem', fontWeight: 600,
                    background: ss.bg, color: ss.color, flexShrink: 0,
                  }}>
                    {ss.icon}
                    {film.status.charAt(0).toUpperCase() + film.status.slice(1)}
                  </span>

                  <button className="btn-ghost" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', flexShrink: 0 }}>
                    Edit
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}