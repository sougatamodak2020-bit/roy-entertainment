'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Crown, Search, Bell, User, Menu, X, LogOut, Settings, Film, Heart } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'

export function Navigation() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setIsProfileOpen(false)
    router.push('/')
    router.refresh()
  }

  const getUserInitial = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const getUserName = () => {
    return user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  }

  return (
    <header 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'rgba(10, 10, 11, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <nav 
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0.875rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
            }}
          >
            <Crown style={{ width: '22px', height: '22px', color: 'white' }} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-cinzel), serif' }}>
            <span className="gradient-text">ROY</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', marginLeft: '4px' }}>Entertainment</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="hidden md:flex">
          <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, transition: 'color 0.2s' }}>Home</Link>
          <Link href="/movies" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}>Movies</Link>
          <Link href="/series" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}>Series</Link>
          {user && (
            <Link href="/creator" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }}>Creator Studio</Link>
          )}
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Search */}
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            style={{
              padding: '0.6rem',
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s',
            }}
          >
            <Search style={{ width: '18px', height: '18px' }} />
          </button>

          {loading ? (
            // Loading skeleton
            <div style={{
              width: '100px',
              height: '38px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              animation: 'pulse 2s infinite',
            }} />
          ) : user ? (
            // Logged in - Show Profile
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.4rem 0.75rem 0.4rem 0.4rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  color: 'white',
                }}>
                  {getUserInitial()}
                </div>
                <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 500 }}>
                  {getUserName()}
                </span>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '220px',
                  background: 'rgba(20, 20, 25, 0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '0.5rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  zIndex: 100,
                }}>
                  {/* User Info */}
                  <div style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '0.5rem',
                  }}>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{getUserName()}</p>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <Link href="/profile" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <User style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontSize: '0.9rem' }}>My Profile</span>
                    </div>
                  </Link>

                  <Link href="/favorites" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Heart style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontSize: '0.9rem' }}>My Favorites</span>
                    </div>
                  </Link>

                  <Link href="/creator" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Film style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontSize: '0.9rem' }}>Creator Studio</span>
                    </div>
                  </Link>

                  <Link href="/admin" style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      color: 'rgba(255,255,255,0.8)',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Settings style={{ width: '18px', height: '18px' }} />
                      <span style={{ fontSize: '0.9rem' }}>Admin Panel</span>
                    </div>
                  </Link>

                  <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />

                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'transparent',
                      color: '#f87171',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.9rem',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut style={{ width: '18px', height: '18px' }} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Not logged in - Show Sign In button
            <Link href="/login">
              <button
                style={{
                  padding: '0.6rem 1.5rem',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.2s',
                }}
              >
                Sign In
              </button>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'none',
              padding: '0.5rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
            }}
            className="md:hidden"
          >
            {isMenuOpen ? <X style={{ width: '24px', height: '24px' }} /> : <Menu style={{ width: '24px', height: '24px' }} />}
          </button>
        </div>
      </nav>

      {/* Search Bar (Expandable) */}
      {isSearchOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          padding: '1rem 1.5rem',
          backgroundColor: 'rgba(10, 10, 11, 0.98)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
            <Search style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '20px',
              color: 'rgba(255,255,255,0.4)',
            }} />
            <input
              type="text"
              placeholder="Search movies, series, actors..."
              autoFocus
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 50px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (min-width: 768px) {
          .md\\:flex { display: flex !important; }
          .md\\:hidden { display: none !important; }
        }
        @media (max-width: 767px) {
          .hidden { display: none !important; }
        }
      `}</style>
    </header>
  )
}