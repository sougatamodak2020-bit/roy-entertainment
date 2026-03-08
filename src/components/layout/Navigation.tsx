'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Menu, X, LogOut, Settings, Film, Heart, ChevronDown, User, Moon, Sun } from 'lucide-react'
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

export function Navigation() {
  const { user, loading, signOut } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [userRole, setUserRole] = useState<string | null>(null)

  const [menuOpen,    setMenuOpen]    = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQ,     setSearchQ]     = useState('')
  const [scrolled,    setScrolled]    = useState(false)

  const profileRef = useRef<HTMLDivElement>(null)
  const searchRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Fetch user role whenever auth user changes
  // Always hit profiles table — it's the source of truth.
  // user_metadata only gets updated on auth.updateUser(), not when you edit Supabase directly.
  useEffect(() => {
    if (!user) { setUserRole(null); return }
    const sb = createSupabaseBrowserClient()
    sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        const role = data?.role || user.user_metadata?.role || 'audience'
        setUserRole(role)
      })
  }, [user])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50)
  }, [searchOpen])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleSignOut = async () => {
    await signOut()
    setProfileOpen(false)
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`)
      setSearchOpen(false)
      setSearchQ('')
    }
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
            {/* Search */}
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
                  }}>
                    {getUserInitial()}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.84rem', fontWeight: 600, maxWidth: 95, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getUserName()}
                  </span>
                  <ChevronDown style={{ width: 13, height: 13, color: 'var(--text-muted)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 225,
                    background: 'var(--nav-bg)', backdropFilter: 'blur(24px)',
                    border: '1px solid var(--glass-border)', borderRadius: 16, padding: '0.5rem',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,98,0,0.04)',
                    zIndex: 200, animation: 'fadeIn 0.15s ease both',
                  }}>
                    <div style={{ padding: '0.7rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '0.35rem' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{getUserName()}</p>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                    </div>

                    {[
                      { href: '/profile',   Icon: User,     label: 'My Profile',     show: true },
                      { href: '/favorites', Icon: Heart,    label: 'Favorites',       show: true },
                      { href: '/creator',   Icon: Film,     label: 'Creator Studio',  show: true },
                      { href: '/admin',     Icon: Settings, label: 'Admin Panel',     show: userRole === 'admin' },
                    ].filter(item => item.show).map(({ href, Icon, label }) => (
                      <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                        <DropItem Icon={Icon} label={label} onClick={() => setProfileOpen(false)} />
                      </Link>
                    ))}

                    <div style={{ height: 1, background: 'var(--glass-border)', margin: '0.35rem 0' }} />

                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem',
                        padding: '0.6rem 0.7rem', borderRadius: 10, border: 'none',
                        background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
                        fontSize: '0.84rem', fontWeight: 600, fontFamily: 'Outfit,sans-serif', textAlign: 'left', transition: 'background 0.2s',
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

        {/* Search overlay */}
        {searchOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--nav-bg)', backdropFilter: 'blur(24px)',
            borderBottom: '1px solid var(--glass-border)',
            padding: '1rem clamp(1rem, 4vw, 2.5rem)',
            animation: 'fadeIn 0.18s ease',
          }}>
            <form onSubmit={handleSearch}>
              <div className="search-bar" style={{ maxWidth: 620, margin: '0 auto' }}>
                <Search style={{ width: 17, height: 17, color: 'var(--text-muted)', flexShrink: 0 }} />
                <input ref={searchRef} className="search-input" type="text" placeholder="Search movies, series, genres…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                {searchQ && (
                  <button type="button" onClick={() => setSearchQ('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                    <X size={15} />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Mobile full-screen menu */}
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