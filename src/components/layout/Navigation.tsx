'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Menu, X, LogOut, Settings, Film, Heart, ChevronDown, User, Clock, TrendingUp, Star } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { createSupabaseBrowserClient } from '@/lib/supabase'

/* ── Theme hook ── */
function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = (localStorage.getItem('re-theme') as 'dark' | 'light') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('re-theme', next)
  }

  return { theme, toggle }
}

/* ── Types ── */
interface MovieSuggestion {
  id: string
  title: string
  slug: string
  poster_url: string | null
  release_year: number | null
  genre: string[] | null
  rating: number | null
  is_trending: boolean
}

/* ── Debounce hook ── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function Navigation() {
  const { user, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [userRole,   setUserRole]   = useState<string | null>(null)
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null)

  const [menuOpen,    setMenuOpen]    = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQ,     setSearchQ]     = useState('')
  const [scrolled,    setScrolled]    = useState(false)

  // Live search state
  const [suggestions,    setSuggestions]    = useState<MovieSuggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [activeIndex,    setActiveIndex]    = useState(-1)
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const profileRef    = useRef<HTMLDivElement>(null)
  const searchRef     = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const debouncedQ    = useDebounce(searchQ, 220)

  /* ── Scroll ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* ── User role ── */
  useEffect(() => {
    if (!user) { setUserRole(null); return }
    const sb = createSupabaseBrowserClient()
    sb.from('profiles').select('role, avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        const role = data?.role || user.user_metadata?.role || 'audience'
        setUserRole(role)
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null)
      })
  }, [user])

  /* ── Close profile dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Close search dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Focus input when search opens ── */
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50)
      try {
        const stored = JSON.parse(localStorage.getItem('re-recent-searches') || '[]')
        setRecentSearches(stored.slice(0, 5))
      } catch {}
    } else {
      setShowDropdown(false)
      setSuggestions([])
      setSearchQ('')
      setActiveIndex(-1)
    }
  }, [searchOpen])

  /* ── Mobile body lock ── */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  /* ── Live search fetch ── */
  useEffect(() => {
    if (!debouncedQ.trim()) {
      setSuggestions([])
      setShowDropdown(searchOpen && recentSearches.length > 0)
      setSuggestLoading(false)
      return
    }

    setSuggestLoading(true)
    setShowDropdown(true)
    setActiveIndex(-1)

    const sb = createSupabaseBrowserClient()
    sb.from('movies')
      .select('id, title, slug, poster_url, release_year, genre, rating, is_trending')
      .ilike('title', `%${debouncedQ.trim()}%`)
      .eq('is_published', true)
      .order('is_trending', { ascending: false })
      .order('rating', { ascending: false })
      .limit(7)
      .then(({ data, error }) => {
        setSuggestLoading(false)
        if (!error && data) setSuggestions(data as MovieSuggestion[])
        else setSuggestions([])
      })
  }, [debouncedQ, searchOpen])

  /* ── Save recent search ── */
  const saveRecentSearch = useCallback((q: string) => {
    if (!q.trim()) return
    try {
      const existing: string[] = JSON.parse(localStorage.getItem('re-recent-searches') || '[]')
      const updated = [q.trim(), ...existing.filter(s => s.toLowerCase() !== q.trim().toLowerCase())].slice(0, 8)
      localStorage.setItem('re-recent-searches', JSON.stringify(updated))
      setRecentSearches(updated.slice(0, 5))
    } catch {}
  }, [])

  /* ── Navigate to movie ── */
  const goToMovie = useCallback((slug: string, title: string) => {
    saveRecentSearch(title)
    setSearchOpen(false)
    setSearchQ('')
    setSuggestions([])
    router.push(`/watch/${slug}`)
  }, [router, saveRecentSearch])

  /* ── Submit search (Enter key / form submit) ── */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = activeIndex >= 0 && suggestions[activeIndex]
      ? suggestions[activeIndex].title
      : searchQ.trim()
    if (!q) return
    saveRecentSearch(q)
    router.push(`/search?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
    setSearchQ('')
    setSuggestions([])
  }

  /* ── Keyboard navigation ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1))
      setShowDropdown(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setActiveIndex(-1)
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault()
      goToMovie(suggestions[activeIndex].slug, suggestions[activeIndex].title)
    }
  }

  /* ── Highlight matching text ── */
  const highlight = (text: string, query: string) => {
    if (!query.trim()) return <>{text}</>
    const idx = text.toLowerCase().indexOf(query.toLowerCase().trim())
    if (idx === -1) return <>{text}</>
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ color: 'var(--brand-gold)', fontWeight: 700 }}>
          {text.slice(idx, idx + query.trim().length)}
        </span>
        {text.slice(idx + query.trim().length)}
      </>
    )
  }

  const getUserInitial = () =>
    user?.user_metadata?.name?.charAt(0).toUpperCase() ||
    user?.email?.charAt(0).toUpperCase() || 'U'

  const getUserName = () =>
    user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href)

  const navLinks = [
    { href: '/',        label: 'Home'    },
    { href: '/movies',  label: 'Movies'  },
    { href: '/series',  label: 'Series'  },
    ...(user ? [{ href: '/creator', label: 'Studio' }] : []),
    ...(userRole === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const showSuggestions = showDropdown && (
    suggestions.length > 0 ||
    suggestLoading ||
    (!searchQ.trim() && recentSearches.length > 0)
  )

  return (
    <>
      <header className={`nav-root${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">

          {/* ── Logo ── */}
          <Link href="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
            <div className="nav-logo-icon">
              <Image
                src="/images/logo.jpg"
                alt="Roy Entertainment"
                width={38} height={38}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                priority
                onError={(e) => {
                  const t = e.target as HTMLImageElement
                  t.style.display = 'none'
                  if (t.parentElement) {
                    t.parentElement.innerHTML = `<span style="font-family:'Bebas Neue',sans-serif;font-size:1rem;color:white;letter-spacing:0.05em">RE</span>`
                  }
                }}
              />
            </div>
            <span className="nav-logo-text">
              <span className="gradient-text">ROY</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 5, fontSize: '0.92rem', fontFamily: 'Outfit,sans-serif', fontWeight: 500, letterSpacing: 0 }}>
                Entertainment
              </span>
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="nav-links" id="re-desktop-nav" style={{ display: 'none' }}>
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className={`nav-link${isActive(href) ? ' active' : ''}`}>
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Right actions ── */}
          <div className="nav-actions">

            {/* Search icon */}
            <button className="icon-btn" onClick={() => setSearchOpen(v => !v)} aria-label="Search">
              <Search style={{ width: 16, height: 16 }} />
            </button>

            {/* Theme toggle */}
            <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme" title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
              <span className="theme-toggle-knob">
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </button>

            {/* Auth */}
            {loading ? (
              <div className="skeleton" style={{ width: 88, height: 34, borderRadius: 99 }} />
            ) : user ? (
              <div ref={profileRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.55rem',
                    padding: '0.32rem 0.75rem 0.32rem 0.32rem',
                    background: profileOpen ? 'rgba(255,140,0,0.12)' : 'var(--glass-bg)',
                    border: `1px solid ${profileOpen ? 'var(--glass-border-h)' : 'var(--glass-border)'}`,
                    borderRadius: 9999, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.82rem', fontWeight: 800, color: 'white', flexShrink: 0,
                    overflow: 'hidden',
                  }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : getUserInitial()}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 600, maxWidth: 95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getUserName()}
                  </span>
                  <ChevronDown style={{ width: 13, height: 13, color: 'var(--text-muted)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
                </button>

                {profileOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 225,
                    background: 'var(--nav-bg)', backdropFilter: 'blur(24px)',
                    border: '1px solid var(--glass-border)', borderRadius: 16, padding: '0.5rem',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    zIndex: 200, animation: 'fadeIn 0.15s ease both',
                  }}>
                    <div style={{ padding: '0.7rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                        background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.95rem', fontWeight: 800, color: 'white',
                      }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : getUserInitial()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getUserName()}</p>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                      </div>
                    </div>

                    {[
                      { href: '/profile',   Icon: User,     label: 'My Profile',    show: true },
                      { href: '/favorites', Icon: Heart,    label: 'Favorites',      show: true },
                      { href: '/creator',   Icon: Film,     label: 'Creator Studio', show: true },
                      { href: '/admin',     Icon: Settings, label: 'Admin Panel',    show: userRole === 'admin' },
                    ].filter(item => item.show).map(({ href, Icon, label }) => (
                      <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                        <DropItem Icon={Icon} label={label} onClick={() => setProfileOpen(false)} />
                      </Link>
                    ))}

                    <div style={{ height: 1, background: 'var(--glass-border)', margin: '0.35rem 0' }} />

                    <button
                      onClick={async () => {
                        await signOut()
                        setProfileOpen(false)
                        setMenuOpen(false)
                        router.push('/')
                        router.refresh()
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem',
                        padding: '0.6rem 0.7rem', borderRadius: 10, border: 'none',
                        background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
                        fontSize: '0.84rem', fontWeight: 600, fontFamily: 'Outfit,sans-serif',
                        textAlign: 'left', transition: 'background 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.09)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={15} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login">
                <button className="btn-fire" style={{ padding: '0.52rem 1.3rem', fontSize: '0.855rem' }}>
                  Sign In
                </button>
              </Link>
            )}

            {/* Hamburger */}
            <button className="icon-btn" id="re-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
              {menuOpen ? <X style={{ width: 17, height: 17 }} /> : <Menu style={{ width: 17, height: 17 }} />}
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════
            SEARCH OVERLAY + LIVE SUGGESTIONS
        ════════════════════════════════════ */}
        {searchOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--nav-bg)', backdropFilter: 'blur(24px)',
            borderBottom: showSuggestions ? 'none' : '1px solid var(--glass-border)',
            padding: '1rem clamp(1rem, 4vw, 2.5rem)',
            animation: 'fadeIn 0.18s ease',
            zIndex: 150,
          }}>
            <div ref={searchWrapRef} style={{ maxWidth: 620, margin: '0 auto', position: 'relative' }}>

              {/* Search input */}
              <form onSubmit={handleSearch}>
                <div
                  className="search-bar"
                  style={{
                    borderRadius: showSuggestions ? '14px 14px 0 0' : 14,
                    transition: 'border-radius 0.15s',
                    borderBottom: showSuggestions ? '1px solid rgba(255,140,0,0.15)' : undefined,
                  }}
                >
                  <Search style={{
                    width: 17, height: 17,
                    color: suggestLoading ? 'var(--brand-mid)' : 'var(--text-muted)',
                    flexShrink: 0, transition: 'color 0.2s',
                  }} />
                  <input
                    ref={searchRef}
                    className="search-input"
                    type="text"
                    placeholder="Search movies, series, genres…"
                    value={searchQ}
                    onChange={e => { setSearchQ(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {/* Spinner */}
                  {suggestLoading && (
                    <div style={{
                      width: 16, height: 16,
                      border: '2px solid rgba(255,140,0,0.2)',
                      borderTopColor: 'var(--brand-mid)',
                      borderRadius: '50%',
                      animation: 're-spin 0.6s linear infinite',
                      flexShrink: 0,
                    }} />
                  )}
                  {/* Clear */}
                  {searchQ && !suggestLoading && (
                    <button
                      type="button"
                      onClick={() => { setSearchQ(''); setSuggestions([]); setShowDropdown(recentSearches.length > 0); searchRef.current?.focus() }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </form>

              {/* Dropdown */}
              {showSuggestions && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--nav-bg)', backdropFilter: 'blur(28px)',
                  border: '1px solid var(--glass-border)', borderTop: 'none',
                  borderRadius: '0 0 16px 16px',
                  boxShadow: '0 28px 56px rgba(0,0,0,0.65)',
                  overflow: 'hidden', zIndex: 160,
                  animation: 'reSlideDown 0.18s ease',
                  maxHeight: 420, overflowY: 'auto',
                }}>

                  {/* ── Recent searches (empty input) ── */}
                  {!searchQ.trim() && recentSearches.length > 0 && (
                    <>
                      <div style={{ padding: '0.75rem 1rem 0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                          Recent Searches
                        </span>
                        <button
                          onClick={() => { localStorage.removeItem('re-recent-searches'); setRecentSearches([]); setShowDropdown(false) }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'Outfit,sans-serif' }}
                        >
                          Clear all
                        </button>
                      </div>
                      {recentSearches.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => { setSearchQ(q); searchRef.current?.focus() }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.6rem 1rem', background: 'none', border: 'none',
                            color: 'var(--text-secondary)', cursor: 'pointer', textAlign: 'left',
                            fontSize: '0.875rem', fontFamily: 'Outfit,sans-serif', transition: 'background 0.15s',
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,140,0,0.06)'}
                          onMouseOut={e => e.currentTarget.style.background = 'none'}
                        >
                          <Clock size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          {q}
                        </button>
                      ))}
                      <div style={{ height: 1, background: 'var(--glass-border)', margin: '0.3rem 0' }} />
                    </>
                  )}

                  {/* ── No results ── */}
                  {searchQ.trim() && suggestions.length === 0 && !suggestLoading && (
                    <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 4 }}>
                        No results for
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>&ldquo;{searchQ}&rdquo;</p>
                    </div>
                  )}

                  {/* ── Movie results ── */}
                  {suggestions.map((movie, i) => (
                    <button
                      key={movie.id}
                      onClick={() => goToMovie(movie.slug, movie.title)}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(-1)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem',
                        padding: '0.6rem 1rem',
                        background: i === activeIndex ? 'rgba(255,140,0,0.09)' : 'transparent',
                        borderLeft: `2px solid ${i === activeIndex ? 'var(--brand-mid)' : 'transparent'}`,
                        borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s, border-color 0.12s',
                        fontFamily: 'Outfit,sans-serif',
                      }}
                    >
                      {/* Poster */}
                      <div style={{
                        width: 36, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                        background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                      }}>
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Film size={13} style={{ color: 'var(--text-muted)' }} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)',
                          marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {highlight(movie.title, searchQ)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                          {movie.release_year && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {movie.release_year}
                            </span>
                          )}
                          {movie.genre?.[0] && (
                            <span style={{
                              fontSize: '0.67rem', padding: '1px 7px', borderRadius: 99,
                              background: 'rgba(255,140,0,0.1)', color: 'var(--brand-mid)',
                              border: '1px solid rgba(255,140,0,0.2)', fontWeight: 600,
                            }}>
                              {movie.genre[0]}
                            </span>
                          )}
                          {movie.rating != null && movie.rating > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', color: 'var(--brand-gold)' }}>
                              <Star size={9} fill="currentColor" /> {movie.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Trending badge */}
                      {movie.is_trending && (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          fontSize: '0.67rem', color: 'var(--brand-mid)',
                          fontWeight: 700, flexShrink: 0,
                        }}>
                          <TrendingUp size={11} /> Trending
                        </span>
                      )}
                    </button>
                  ))}

                  {/* ── View all results ── */}
                  {searchQ.trim() && suggestions.length > 0 && (
                    <button
                      onClick={() => {
                        saveRecentSearch(searchQ)
                        router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`)
                        setSearchOpen(false)
                      }}
                      style={{
                        width: '100%', padding: '0.8rem 1rem',
                        border: 'none', borderTop: '1px solid var(--glass-border)',
                        background: 'none',
                        color: 'var(--brand-mid)', cursor: 'pointer',
                        fontSize: '0.84rem', fontWeight: 600,
                        fontFamily: 'Outfit,sans-serif',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem',
                        transition: 'background 0.15s',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,140,0,0.06)'}
                      onMouseOut={e => e.currentTarget.style.background = 'none'}
                    >
                      <Search size={13} />
                      See all results for &ldquo;{searchQ}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile full-screen menu ── */}
      {menuOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'var(--nav-bg)', backdropFilter: 'blur(28px)',
          display: 'flex', flexDirection: 'column',
          padding: '74px 1.5rem 2rem',
          animation: 'fadeIn 0.2s ease', overflowY: 'auto',
        }}>
          <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: 380, height: 380, background: 'radial-gradient(circle, var(--glow-sm) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '2rem' }}>
            {navLinks.map(({ href, label }, i) => (
              <Link
                key={href} href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block', padding: '0.95rem 1.2rem', borderRadius: 14,
                  textDecoration: 'none', fontSize: '1.25rem', fontWeight: 700,
                  color: isActive(href) ? 'var(--brand-gold)' : 'var(--text-secondary)',
                  background: isActive(href) ? 'rgba(255,140,0,0.09)' : 'transparent',
                  transition: 'all 0.2s',
                  animation: `fadeInUp 0.3s ${i * 0.07}s both`,
                }}
              >{label}</Link>
            ))}
          </nav>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {theme === 'dark' ? 'Dark mode' : 'Light mode'}
            </span>
            <button className="theme-toggle" onClick={toggle}>
              <span className="theme-toggle-knob">{theme === 'dark' ? '🌙' : '☀️'}</span>
            </button>
          </div>

          {!user && (
            <Link href="/login" onClick={() => setMenuOpen(false)}>
              <button className="btn-fire" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
                Sign In
              </button>
            </Link>
          )}
        </div>
      )}

      <style jsx global>{`
        @media (min-width: 768px) {
          #re-desktop-nav { display: flex !important; }
          #re-hamburger   { display: none  !important; }
        }
        @keyframes reSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes re-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}

function DropItem({ Icon, label, onClick }: { Icon: any; label: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.55rem',
        padding: '0.6rem 0.7rem', borderRadius: 10,
        color: 'var(--text-secondary)', cursor: 'pointer',
        fontSize: '0.84rem', fontWeight: 500, transition: 'background 0.15s, color 0.15s',
      }}
      onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,140,0,0.07)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      <span style={{ color: 'var(--brand-mid)', opacity: 0.85 }}><Icon size={15} /></span>
      {label}
    </div>
  )
}