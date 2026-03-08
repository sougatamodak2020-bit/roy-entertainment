// src/app/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Film, Tv, Users, TrendingUp, Plus, Search, BarChart3, Eye, Star,
  Upload, Settings, LogOut, Menu, X, Home, Clock, CheckCircle,
  XCircle, AlertCircle, ChevronDown, ChevronUp, Crown
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/* ── Types ───────────────────────────────────────────────── */
interface DashboardStats {
  totalMovies: number
  totalViews: number
  featuredCount: number
  trendingCount: number
  pendingCount: number
}

interface RecentMovie {
  id: string
  title: string
  poster_url: string | null
  view_count: number
  rating: number
  is_published: boolean
}

interface PendingFilm {
  id: string
  title: string
  slug: string
  description: string | null
  poster_url: string | null
  backdrop_url: string | null
  youtube_url: string | null
  youtube_id: string | null
  release_year: number | null
  duration_minutes: number | null
  language: string | null
  director: string | null
  genre: string[] | null
  uploaded_by: string | null
  created_at: string
}

/* ── Sidebar links ───────────────────────────────────────── */
const sidebarLinks = [
  { label: 'Dashboard',  id: 'dashboard',  icon: BarChart3  },
  { label: 'Pending',    id: 'pending',    icon: Clock      },
  { label: 'Movies',     id: 'movies',     icon: Film       },
  { label: 'Upload',     id: 'upload',     icon: Upload     },
  { label: 'Users',      id: 'users',      icon: Users      },
  { label: 'Analytics',  id: 'analytics',  icon: TrendingUp },
  { label: 'Settings',   id: 'settings',   icon: Settings   },
]

const SECTION_HREFS: Record<string, string> = {
  movies:    '/admin/movies',
  upload:    '/admin/upload',
  users:     '/admin/users',
  analytics: '/admin/analytics',
  settings:  '/admin/settings',
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [sidebarOpen,   setSidebarOpen]   = useState(true)
  const [isAdmin,       setIsAdmin]       = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [user,          setUser]          = useState<any>(null)
  const [profile,       setProfile]       = useState<any>(null)
  const [activeSection, setActiveSection] = useState<string>('dashboard')
  const [stats,         setStats]         = useState<DashboardStats>({ totalMovies: 0, totalViews: 0, featuredCount: 0, trendingCount: 0, pendingCount: 0 })
  const [recentMovies,  setRecentMovies]  = useState<RecentMovie[]>([])
  const [pendingFilms,  setPendingFilms]  = useState<PendingFilm[]>([])
  const [expandedFilm,  setExpandedFilm]  = useState<string | null>(null)
  const [rejectReason,  setRejectReason]  = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search,        setSearch]        = useState('')
  const [toast,         setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => { init() }, [])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Init ─────────────────────────────────────────────── */
  const init = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }
      setUser(authUser)

      const { data: p, error: pErr } = await supabase
        .from('profiles').select('*').eq('id', authUser.id).single()

      if (pErr?.code === 'PGRST116' || !p) {
        // Profile not found — definitely not admin
        router.push('/')
        return
      }

      if (p.role !== 'admin') {
        // Not an admin — hard redirect
        router.push('/')
        return
      }

      setProfile(p)
      setIsAdmin(true)

      await Promise.all([loadStats(), loadPending()])
    } finally {
      setLoading(false)
    }
  }

  /* ── Stats ────────────────────────────────────────────── */
  const loadStats = async () => {
    const { data } = await supabase
      .from('movies')
      .select('id, title, poster_url, view_count, rating, admin_rating, is_published, is_featured, is_trending')
      .order('created_at', { ascending: false })

    if (!data) return

    const published = data.filter(m => m.is_published)
    const pending   = data.filter(m => !m.is_published && m.id)

    setStats({
      totalMovies:   published.length,
      totalViews:    published.reduce((s, m) => s + (m.view_count || 0), 0),
      featuredCount: published.filter(m => m.is_featured).length,
      trendingCount: published.filter(m => m.is_trending).length,
      pendingCount:  0, // will be set after loadPending
    })

    setRecentMovies(published.slice(0, 5).map(m => ({
      id:           m.id,
      title:        m.title,
      poster_url:   m.poster_url,
      view_count:   m.view_count || 0,
      rating:       m.admin_rating || m.rating || 0,
      is_published: m.is_published,
    })))
  }

  /* ── Pending ──────────────────────────────────────────── */
  const loadPending = async () => {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, slug, description, poster_url, backdrop_url, youtube_url, youtube_id, release_year, duration_minutes, language, director, genre, uploaded_by, created_at')
      .eq('is_published', false)
      .not('uploaded_by', 'is', null)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); return }
    const films = data ?? []
    setPendingFilms(films)
    setStats(prev => ({ ...prev, pendingCount: films.length }))
  }

  /* ── Approve ──────────────────────────────────────────── */
  const approveFilm = async (film: PendingFilm) => {
    setActionLoading(film.id)
    const { error } = await supabase.from('movies').update({ is_published: true }).eq('id', film.id)
    if (error) {
      showToast('Failed to approve.', 'err')
    } else {
      showToast(`"${film.title}" is now live!`)
      setPendingFilms(prev => prev.filter(f => f.id !== film.id))
      setStats(prev => ({ ...prev, pendingCount: prev.pendingCount - 1, totalMovies: prev.totalMovies + 1 }))
      setExpandedFilm(null)
    }
    setActionLoading(null)
  }

  /* ── Reject ───────────────────────────────────────────── */
  const rejectFilm = async (film: PendingFilm) => {
    if (!rejectReason.trim()) { showToast('Enter a rejection reason first.', 'err'); return }
    setActionLoading(film.id + '_r')
    const { error } = await supabase.from('movies').delete().eq('id', film.id)
    if (error) {
      showToast('Failed to reject.', 'err')
    } else {
      showToast(`"${film.title}" rejected.`, 'err')
      setPendingFilms(prev => prev.filter(f => f.id !== film.id))
      setStats(prev => ({ ...prev, pendingCount: prev.pendingCount - 1 }))
      setExpandedFilm(null)
      setRejectReason('')
    }
    setActionLoading(null)
  }

  /* ── Nav click ────────────────────────────────────────── */
  const handleNav = (id: string) => {
    if (SECTION_HREFS[id]) {
      router.push(SECTION_HREFS[id])
    } else {
      setActiveSection(id)
    }
  }

  /* ── Loading ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-ring" />
      </div>
    )
  }

  const STAT_CARDS = [
    { label: 'Published Films', value: stats.totalMovies.toString(),  icon: Film,       color: '#FF6200' },
    { label: 'Featured',        value: stats.featuredCount.toString(), icon: Star,       color: '#FFB733' },
    { label: 'Trending',        value: stats.trendingCount.toString(), icon: TrendingUp, color: '#38BDF8' },
    { label: 'Total Views',     value: stats.totalViews > 999 ? `${(stats.totalViews / 1000).toFixed(1)}K` : stats.totalViews.toString(), icon: Eye, color: '#4ADE80' },
  ]

  const filteredRecent = recentMovies.filter(m => m.title.toLowerCase().includes(search.toLowerCase()))
  const filteredPending = pendingFilms.filter(f => f.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)' }}>

      {/* ══════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════════ */}
      <aside style={{
        width: sidebarOpen ? 260 : 76, flexShrink: 0,
        background: 'rgba(12,10,7,0.98)',
        borderRight: '1px solid rgba(255,98,0,0.1)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
        transition: 'width 0.3s ease', overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{ padding: '1.35rem', borderBottom: '1px solid rgba(255,98,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,98,0,0.3)', background: 'rgba(255,98,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/images/logo.jpg" alt="RE" width={40} height={40}
              style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              onError={e => {
                const t = e.target as HTMLImageElement
                t.style.display = 'none'
                if (t.parentElement) t.parentElement.innerHTML = `<span style="font-family:'Bebas Neue',sans-serif;font-size:0.95rem;color:white">RE</span>`
              }}
            />
          </div>
          {sidebarOpen && (
            <div>
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1rem', letterSpacing: '0.08em', lineHeight: 1 }}>
                <span className="gradient-text">ROY</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 4, fontSize: '0.72rem', fontFamily: 'Outfit,sans-serif', fontWeight: 500, letterSpacing: 0 }}>Admin</span>
              </p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>Management Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
          {sidebarLinks.map(({ label, id, icon: Icon }) => {
            const active = activeSection === id
            const isPending = id === 'pending'
            return (
              <button key={id} onClick={() => handleNav(id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.72rem 0.9rem', borderRadius: 10, marginBottom: '0.2rem',
                  background: active ? 'rgba(255,98,0,0.14)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(255,140,0,0.3)' : 'transparent'}`,
                  color: active ? '#FFB733' : 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600,
                  transition: 'all 0.18s', position: 'relative',
                }}
                onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseOut={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
                {/* Pending badge */}
                {isPending && stats.pendingCount > 0 && sidebarOpen && (
                  <span style={{ marginLeft: 'auto', background: '#FF6200', color: 'white', fontSize: '0.68rem', fontWeight: 800, borderRadius: 9999, padding: '0.12rem 0.48rem', lineHeight: 1.4 }}>
                    {stats.pendingCount}
                  </span>
                )}
                {isPending && stats.pendingCount > 0 && !sidebarOpen && (
                  <span style={{ position: 'absolute', top: 7, right: 7, width: 8, height: 8, borderRadius: '50%', background: '#FF6200' }} />
                )}
              </button>
            )
          })}
        </nav>

        {/* Back to site */}
        <div style={{ padding: '0.5rem 0.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Home style={{ width: 17, height: 17, flexShrink: 0 }} />
              {sidebarOpen && 'Back to Site'}
            </div>
          </Link>
        </div>

        {/* User */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,98,0,0.08)' }}>
          {sidebarOpen && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: '0.6rem' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6200,#FFB733)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue,sans-serif', fontSize: '1rem', color: 'white', flexShrink: 0 }}>
                {(profile?.full_name || user.email)?.[0]?.toUpperCase() || 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || user.email?.split('@')[0] || 'Admin'}
                </p>
                <p style={{ fontSize: '0.68rem', color: '#FF8C00', textTransform: 'capitalize' }}>{profile?.role || 'user'}</p>
              </div>
            </div>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: '0.65rem', padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <LogOut style={{ width: 16, height: 16 }} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════
          MAIN
      ════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, marginLeft: sidebarOpen ? 260 : 76, transition: 'margin-left 0.3s ease', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(5,5,7,0.97)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,98,0,0.1)',
          padding: '0 clamp(1rem,3vw,2rem)', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSidebarOpen(v => !v)}
              style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sidebarOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
            </button>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1, color: 'white' }}>
                {activeSection === 'pending' ? 'Pending Approvals' : 'Dashboard'}
              </h1>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', lineHeight: 1 }}>
                {activeSection === 'pending' ? `${stats.pendingCount} film${stats.pendingCount !== 1 ? 's' : ''} awaiting review` : `Welcome, ${profile?.full_name || user?.email?.split('@')[0] || 'Admin'}`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,0.3)' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ width: 220, padding: '0.55rem 1rem 0.55rem 36px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', fontSize: '0.88rem', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            {/* Pending alert */}
            {stats.pendingCount > 0 && activeSection !== 'pending' && (
              <button onClick={() => setActiveSection('pending')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(255,98,0,0.12)', border: '1px solid rgba(255,98,0,0.3)', borderRadius: 10, color: '#FFB733', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
                <Clock style={{ width: 14, height: 14 }} />
                {stats.pendingCount} Pending
              </button>
            )}
            <Link href="/admin/upload">
              <button style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.1rem', background: 'linear-gradient(135deg,#FF6200,#FFB733)', border: 'none', borderRadius: 10, color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(255,98,0,0.3)' }}>
                <Plus style={{ width: 16, height: 16 }} /> Add Movie
              </button>
            </Link>
          </div>
        </header>

        <div style={{ padding: 'clamp(1.25rem,3vh,2rem) clamp(1rem,3vw,2rem)', flex: 1 }}>

          {/* Non-admin warning */}
          {!isAdmin && (
            <div style={{ padding: '0.85rem 1.1rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 12, marginBottom: '1.5rem', color: '#fbbf24', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
              You're viewing as a non-admin. Update your role in the profiles table to enable all features.
            </div>
          )}

          {/* ══════ PENDING APPROVALS ═══════════════════════ */}
          {activeSection === 'pending' && (
            <div>
              {filteredPending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'clamp(3rem,10vh,6rem) 1rem' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <CheckCircle style={{ width: 36, height: 36, color: '#4ADE80' }} />
                  </div>
                  <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '2rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>All Clear!</h2>
                  <p style={{ color: 'rgba(255,255,255,0.45)' }}>No films pending review.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filteredPending.map(film => (
                    <PendingCard
                      key={film.id}
                      film={film}
                      expanded={expandedFilm === film.id}
                      onToggle={() => {
                        setExpandedFilm(expandedFilm === film.id ? null : film.id)
                        setRejectReason('')
                      }}
                      onApprove={() => approveFilm(film)}
                      onReject={() => rejectFilm(film)}
                      rejectReason={rejectReason}
                      setRejectReason={setRejectReason}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════ DASHBOARD ══════════════════════════════ */}
          {activeSection === 'dashboard' && (
            <>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} style={{ padding: '1.4rem', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle,${color}25 0%,transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                      <Icon style={{ width: 22, height: 22, color }} />
                    </div>
                    <p style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '2.2rem', letterSpacing: '0.04em', lineHeight: 1, color: 'white', marginBottom: '0.3rem' }}>{value}</p>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Pending banner */}
              {stats.pendingCount > 0 && (
                <button onClick={() => setActiveSection('pending')} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', background: 'rgba(255,98,0,0.08)', border: '1px solid rgba(255,98,0,0.28)',
                  borderRadius: 14, cursor: 'pointer', marginBottom: '1.5rem', color: 'inherit',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Clock style={{ width: 18, height: 18, color: '#FFB733' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFB733' }}>
                        {stats.pendingCount} film{stats.pendingCount !== 1 ? 's' : ''} pending your review
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'rgba(255,183,51,0.6)' }}>Creator submissions waiting for approval</p>
                    </div>
                  </div>
                  <span style={{ padding: '0.35rem 1rem', background: 'rgba(255,98,0,0.15)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 9999, color: '#FFB733', fontSize: '0.82rem', fontWeight: 700 }}>
                    Review Now →
                  </span>
                </button>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: '1.5rem' }}>

                {/* Recent movies */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>Recent Published Films</h2>
                    <Link href="/admin/movies" style={{ color: '#FF8C00', fontSize: '0.82rem', textDecoration: 'none' }}>View All →</Link>
                  </div>
                  {filteredRecent.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'rgba(255,255,255,0.4)' }}>
                      <Film style={{ width: 40, height: 40, margin: '0 auto 0.75rem', opacity: 0.3 }} />
                      <p>No published films yet</p>
                      <Link href="/admin/upload">
                        <button style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg,#FF6200,#FFB733)', border: 'none', borderRadius: 9, color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>Upload First Movie</button>
                      </Link>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {filteredRecent.map(m => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                          <div style={{ width: 52, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
                            {m.poster_url
                              ? <Image src={m.poster_url} alt={m.title} width={52} height={72} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film style={{ width: 20, height: 20, opacity: 0.3 }} /></div>
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Eye style={{ width: 11, height: 11 }} />{m.view_count.toLocaleString()}</span>
                              {m.rating > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#FFB733' }}><Star style={{ width: 11, height: 11, fill: 'currentColor' }} />{m.rating}</span>}
                            </div>
                          </div>
                          <span style={{ padding: '0.22rem 0.65rem', borderRadius: 9999, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(34,197,94,0.1)', color: '#4ADE80' }}>Live</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                  {/* Quick actions */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.35rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Quick Actions</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {[
                        { label: 'Upload New Movie',  href: '/admin/upload', color: 'rgba(255,98,0,0.1)',    border: 'rgba(255,98,0,0.25)',     tc: '#FFB733',              icon: Upload },
                        { label: 'Review Pending',    href: '',              color: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.2)',    tc: '#fbbf24',              icon: Clock  },
                        { label: 'Manage Users',      href: '/admin/users',  color: 'rgba(255,255,255,0.03)',border: 'rgba(255,255,255,0.08)',  tc: 'rgba(255,255,255,0.6)',icon: Users  },
                        { label: 'Analytics',         href: '/admin/analytics',color:'rgba(56,189,248,0.07)',border:'rgba(56,189,248,0.15)',   tc: '#38BDF8',              icon: BarChart3},
                      ].map(({ label, href, color, border, tc, icon: Icon }) => (
                        href
                          ? <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.85rem 1rem', background: color, border: `1px solid ${border}`, borderRadius: 12, color: tc, fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}>
                                <Icon style={{ width: 17, height: 17 }} /> {label}
                              </div>
                            </Link>
                          : <button key={label} onClick={() => setActiveSection('pending')}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.85rem 1rem', background: color, border: `1px solid ${border}`, borderRadius: 12, color: tc, fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer' }}>
                              <Icon style={{ width: 17, height: 17 }} /> {label}
                              {stats.pendingCount > 0 && <span style={{ marginLeft: 'auto', background: '#FF6200', color: 'white', fontSize: '0.68rem', fontWeight: 800, borderRadius: 9999, padding: '0.12rem 0.48rem' }}>{stats.pendingCount}</span>}
                            </button>
                      ))}
                    </div>
                  </div>

                  {/* System status */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.35rem' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>System Status</h2>
                    {[
                      { label: 'Database',      value: 'Connected',              color: '#4ADE80' },
                      { label: 'Your Role',      value: profile?.role || 'user',  color: profile?.role === 'admin' ? '#FF8C00' : '#fbbf24' },
                      { label: 'Pending Films',  value: `${stats.pendingCount}`,  color: stats.pendingCount > 0 ? '#FB923C' : '#4ADE80' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                        <span style={{ fontSize: '0.85rem', color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'capitalize' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          padding: '0.85rem 1.25rem', borderRadius: 14,
          background: toast.type === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.type === 'ok' ? '#4ADE80' : '#f87171',
          fontSize: '0.88rem', fontWeight: 600, backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'ok' ? <CheckCircle style={{ width: 16, height: 16 }} /> : <XCircle style={{ width: 16, height: 16 }} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   PENDING FILM CARD
══════════════════════════════════════════════════════════════ */
function PendingCard({
  film, expanded, onToggle, onApprove, onReject,
  rejectReason, setRejectReason, actionLoading,
}: {
  film: PendingFilm
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  rejectReason: string
  setRejectReason: (v: string) => void
  actionLoading: string | null
}) {
  const approving = actionLoading === film.id
  const rejecting = actionLoading === film.id + '_r'

  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 16, overflow: 'hidden' }}>

      {/* Summary */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', cursor: 'pointer', flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {film.poster_url
            ? <Image src={film.poster_url} alt={film.title} width={56} height={80} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film style={{ width: 22, height: 22, opacity: 0.25 }} /></div>
          }
        </div>

        <div style={{ flex: 1, minWidth: 140 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.98rem', color: 'white', marginBottom: '0.3rem' }}>{film.title}</h3>
          <div style={{ display: 'flex', gap: '0.7rem', fontSize: '0.77rem', color: 'rgba(255,255,255,0.45)', flexWrap: 'wrap' }}>
            {film.release_year && <span>{film.release_year}</span>}
            {film.language && <span>{film.language}</span>}
            {film.genre?.length ? <span>{film.genre.slice(0, 3).join(', ')}</span> : null}
            <span style={{ color: 'rgba(255,140,0,0.65)' }}>
              {new Date(film.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.28rem 0.8rem', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(255,140,0,0.12)', color: '#FFB733', flexShrink: 0 }}>
          <Clock style={{ width: 12, height: 12 }} /> Pending
        </span>
        <div style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
          {expanded ? <ChevronUp style={{ width: 17, height: 17 }} /> : <ChevronDown style={{ width: 17, height: 17 }} />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>

            {/* Preview */}
            <div>
              <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)', marginBottom: '0.85rem', position: 'relative' }}>
                {film.backdrop_url || film.poster_url
                  ? <Image src={(film.backdrop_url || film.poster_url)!} alt={film.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film style={{ width: 48, height: 48, opacity: 0.15 }} /></div>
                }
              </div>
              {(film.youtube_url || film.youtube_id) && (
                <a href={film.youtube_url || `https://youtube.com/watch?v=${film.youtube_id}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.22)', borderRadius: 9, color: '#f87171', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}>
                  ▶ Preview on YouTube
                </a>
              )}
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <Detail label="Director"  value={film.director}  />
              <Detail label="Year"      value={film.release_year?.toString()} />
              <Detail label="Duration"  value={film.duration_minutes ? `${film.duration_minutes} min` : undefined} />
              <Detail label="Language"  value={film.language}  />
              {film.genre?.length ? (
                <div>
                  <p style={labelStyle}>Genres</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {film.genre.map(g => <span key={g} style={{ padding: '0.2rem 0.6rem', borderRadius: 9999, background: 'rgba(255,98,0,0.1)', border: '1px solid rgba(255,140,0,0.2)', color: 'rgba(255,183,51,0.9)', fontSize: '0.74rem', fontWeight: 600 }}>{g}</span>)}
                  </div>
                </div>
              ) : null}
              {film.description && (
                <div>
                  <p style={labelStyle}>Synopsis</p>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{film.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reject reason */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ ...labelStyle, display: 'block', marginBottom: '0.4rem' }}>Rejection Reason (required to reject)</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
              placeholder="e.g. Low video quality, missing description, copyright concern…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.75rem 1rem', color: 'white', fontSize: '0.88rem', outline: 'none', resize: 'vertical', fontFamily: 'Outfit,sans-serif', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={onApprove} disabled={!!actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, color: '#4ADE80', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, opacity: actionLoading ? 0.65 : 1 }}>
              {approving ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> : <CheckCircle style={{ width: 17, height: 17 }} />}
              Approve & Publish
            </button>
            <button onClick={onReject} disabled={!!actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#f87171', cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 700, opacity: actionLoading ? 0.65 : 1 }}>
              {rejecting ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> : <XCircle style={{ width: 17, height: 17 }} />}
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.32)',
  letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.2rem',
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{value}</p>
    </div>
  )
}