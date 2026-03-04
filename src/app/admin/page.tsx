// src/app/admin/page.tsx

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Film, Tv, Users, TrendingUp, Plus, Search, BarChart3, Eye, Star,
  Upload, Settings, LogOut, Menu, X, Crown, Home
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/database'

interface DashboardStats {
  totalMovies: number
  totalViews: number
  featuredCount: number
  trendingCount: number
}

interface RecentMovie {
  id: string
  title: string
  poster_url: string | null
  view_count: number
  rating: number
  is_published: boolean
}

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin', icon: BarChart3, active: true },
  { label: 'Movies', href: '/admin/movies', icon: Film },
  { label: 'Series', href: '/admin/series', icon: Tv },
  { label: 'Upload', href: '/admin/upload', icon: Upload },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalMovies: 0,
    totalViews: 0,
    featuredCount: 0,
    trendingCount: 0,
  })
  const [recentMovies, setRecentMovies] = useState<RecentMovie[]>([])
  
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Check if user is admin using profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        // If profile doesn't exist, create one
        if (profileError.code === 'PGRST116') {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              role: 'user'
            })
            .select()
            .single()
          
          if (newProfile) {
            setProfile(newProfile)
          }
        }
      } else {
        setProfile(profileData)
        setIsAdmin(profileData?.role === 'admin')
      }

      // Load dashboard data
      await loadDashboardData()

    } catch (error) {
      console.error('Error checking admin access:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      const { data: movies, error } = await supabase
        .from('movies')
        .select('id, title, poster_url, view_count, rating, is_published, is_featured, is_trending')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && movies) {
        const totalViews = movies.reduce((sum, m) => sum + (m.view_count || 0), 0)
        const featuredCount = movies.filter(m => m.is_featured).length
        const trendingCount = movies.filter(m => m.is_trending).length

        setStats({
          totalMovies: movies.length,
          totalViews,
          featuredCount,
          trendingCount,
        })

        setRecentMovies(movies.slice(0, 4).map(m => ({
          id: m.id,
          title: m.title,
          poster_url: m.poster_url,
          view_count: m.view_count || 0,
          rating: m.rating || 0,
          is_published: m.is_published,
        })))
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(139, 92, 246, 0.3)',
            borderTopColor: '#8b5cf6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading admin panel...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const dashboardStats = [
    { label: 'Total Movies', value: stats.totalMovies.toString(), icon: Film, change: '+12%', color: '#8b5cf6' },
    { label: 'Featured', value: stats.featuredCount.toString(), icon: Star, change: '+8%', color: '#f59e0b' },
    { label: 'Trending', value: stats.trendingCount.toString(), icon: TrendingUp, change: '+24%', color: '#00d4ff' },
    { label: 'Total Views', value: stats.totalViews.toLocaleString(), icon: Eye, change: '+18%', color: '#22c55e' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      {/* Sidebar */}
      <aside style={{
        width: isSidebarOpen ? '260px' : '80px',
        backgroundColor: '#0f0f12',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Crown style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          {isSidebarOpen && (
            <div>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white' }}>ROY Admin</span>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Management Panel</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          {sidebarLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                marginBottom: '0.25rem',
                backgroundColor: link.active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: link.active ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                color: link.active ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}>
                <link.icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                {isSidebarOpen && <span style={{ fontSize: '0.9rem' }}>{link.label}</span>}
              </div>
            </Link>
          ))}
        </nav>

        {/* Back to Site */}
        <div style={{ padding: '0.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
            }}>
              <Home style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              {isSidebarOpen && <span style={{ fontSize: '0.9rem' }}>Back to Site</span>}
            </div>
          </Link>
        </div>

        {/* User Section */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {isSidebarOpen && user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              padding: '0.75rem',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: 'white',
              }}>
                {user.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || user.email?.split('@')[0] || 'Admin'}
                </p>
                <p style={{ fontSize: '0.7rem', color: '#8b5cf6' }}>
                  {profile?.role === 'admin' ? 'Administrator' : 'Creator'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarOpen ? 'flex-start' : 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <LogOut style={{ width: '18px', height: '18px' }} />
            {isSidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isSidebarOpen ? '260px' : '80px',
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Header */}
        <header style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'rgba(10, 10, 11, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              {isSidebarOpen ? <X style={{ width: '20px', height: '20px' }} /> : <Menu style={{ width: '20px', height: '20px' }} />}
            </button>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Dashboard</h1>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                Welcome back, {profile?.full_name || 'Admin'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: 'rgba(255,255,255,0.4)',
              }} />
              <input
                type="text"
                placeholder="Search..."
                style={{
                  width: '250px',
                  padding: '0.6rem 1rem 0.6rem 40px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
            <Link href="/admin/upload">
              <button style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.25rem',
                background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}>
                <Plus style={{ width: '18px', height: '18px' }} />
                Add Movie
              </button>
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <div style={{ padding: '2rem' }}>
          {/* Admin Status Banner */}
          {!isAdmin && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              color: '#fbbf24',
            }}>
              ⚠️ You are viewing as a non-admin user. Some features may be limited.
            </div>
          )}

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {dashboardStats.map((stat) => (
              <div key={stat.label} style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: `radial-gradient(circle, ${stat.color}20 0%, transparent 70%)`,
                }} />
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: `${stat.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <stat.icon style={{ width: '24px', height: '24px', color: stat.color }} />
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '20px',
                  }}>
                    {stat.change}
                  </span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'white' }}>{stat.value}</p>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
            {/* Recent Movies */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '1.5rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
              }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>Recent Movies</h2>
                <Link href="/admin/movies" style={{ color: '#8b5cf6', fontSize: '0.85rem', textDecoration: 'none' }}>
                  View All →
                </Link>
              </div>
              
              {recentMovies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.5)' }}>
                  <Film style={{ width: '48px', height: '48px', margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>No movies yet</p>
                  <Link href="/admin/upload">
                    <button style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                    }}>
                      Upload First Movie
                    </button>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentMovies.map((movie) => (
                    <div key={movie.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}>
                      <div style={{
                        width: '60px',
                        height: '80px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                      }}>
                        {movie.poster_url ? (
                          <Image
                            src={movie.poster_url}
                            alt={movie.title}
                            width={60}
                            height={80}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            unoptimized
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Film style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.3)' }} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem', color: 'white' }}>{movie.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Eye style={{ width: '14px', height: '14px' }} />
                            {movie.view_count.toLocaleString()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24' }}>
                            <Star style={{ width: '14px', height: '14px', fill: '#fbbf24' }} />
                            {movie.rating}
                          </span>
                        </div>
                      </div>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: movie.is_published ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: movie.is_published ? '#22c55e' : '#f59e0b',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        borderRadius: '20px',
                      }}>
                        {movie.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
              }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'white' }}>Quick Actions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <Link href="/admin/upload" style={{ textDecoration: 'none' }}>
                    <button style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '12px',
                      color: '#a78bfa',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}>
                      <Upload style={{ width: '20px', height: '20px' }} />
                      <span>Upload New Movie</span>
                    </button>
                  </Link>
                  <button style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    borderRadius: '12px',
                    color: '#fbbf24',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}>
                    <Tv style={{ width: '20px', height: '20px' }} />
                    <span>Add New Series</span>
                  </button>
                  <button style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}>
                    <Users style={{ width: '20px', height: '20px' }} />
                    <span>Manage Users</span>
                  </button>
                </div>
              </div>

              {/* System Status */}
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
              }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'white' }}>System Status</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Database</span>
                    <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                      Connected
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Your Role</span>
                    <span style={{ 
                      color: profile?.role === 'admin' ? '#8b5cf6' : '#fbbf24',
                      textTransform: 'capitalize'
                    }}>
                      {profile?.role || 'User'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}