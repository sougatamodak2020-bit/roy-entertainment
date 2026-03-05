// src/app/(main)/profile/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { User, Clock, Star, Heart, Play, Loader2 } from 'lucide-react'
import type { Database } from '@/supabase/types'

// Generated types (your latest version)
type WatchHistoryRow = Database['public']['Tables']['watch_history']['Row']
type MovieRow = Database['public']['Tables']['movies']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

// Joined type - movie is single object or null (we force this shape)
interface WatchHistoryWithMovie extends WatchHistoryRow {
  movie: MovieRow | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserRow | null>(null)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryWithMovie[]>([])
  const [favorites, setFavorites] = useState<MovieRow[]>([])
  const [stats, setStats] = useState({ watched: 0, favorites: 0, totalTime: 0 })
  const [activeTab, setActiveTab] = useState<'stats' | 'history' | 'favorites'>('stats')
  const [loading, setLoading] = useState(true)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      // Get authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        window.location.href = '/login'
        return
      }

      // Fetch profile from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(profile)

      // Stats: completed watches
      const { count: watchedCount } = await supabase
        .from('watch_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .eq('completed', true)

      // Favorites count
      const { count: favoritesCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id)

      // Total watch time (completed only)
      const { data: progressData } = await supabase
        .from('watch_history')
        .select('progress_seconds')
        .eq('user_id', authUser.id)
        .eq('completed', true)

      const totalSeconds = progressData?.reduce((acc, curr) => acc + (curr?.progress_seconds ?? 0), 0) ?? 0
      const totalTimeHours = Math.round(totalSeconds / 3600)

      setStats({
        watched: watchedCount ?? 0,
        favorites: favoritesCount ?? 0,
        totalTime: totalTimeHours
      })

      // Watch History - joined with movie
      const { data: historyRaw } = await supabase
        .from('watch_history')
        .select(`
          id,
          progress_seconds,
          last_watched,
          completed,
          movie:movies(*)
        `)
        .eq('user_id', authUser.id)
        .order('last_watched', { ascending: false })
        .limit(20)

      // Double assertion to override Supabase's any[] bug on joins
      const historyItems = historyRaw as unknown as WatchHistoryWithMovie[]

      // Runtime safety filter
      const validHistory = historyItems.filter(item => {
        return (
          item &&
          item.id &&
          item.movie &&
          typeof item.movie === 'object' &&
          item.movie !== null &&
          !Array.isArray(item.movie) // explicit check against array inference bug
        )
      })

      setWatchHistory(validHistory)

      // Favorites - joined with movie
      const { data: favRaw } = await supabase
        .from('favorites')
        .select(`
          movie:movies(*)
        `)
        .eq('user_id', authUser.id)
        .limit(20)

      // Double assertion + filter
      const favItems = favRaw as unknown as { movie: MovieRow | null }[]

      const validFavorites = favItems
        .map(f => f.movie)
        .filter((m): m is MovieRow => 
          m !== null && 
          typeof m === 'object' && 
          m !== null &&
          !Array.isArray(m)
        )

      setFavorites(validFavorites)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 60, height: 60, color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b', color: 'white', textAlign: 'center', padding: '4rem' }}>
        Please log in to view your profile.
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #0a0a0b, #050506)' }}>
      <Navigation />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '100px 2rem 4rem', color: 'white' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '4.5rem' }}>
          <div style={{
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa, #f59e0b)',
            margin: '0 auto 1.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 60px rgba(139,92,246,0.5)'
          }}>
            <User style={{ width: 80, height: 80, color: 'white' }} />
          </div>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 3.8rem)',
            fontWeight: 800,
            marginBottom: '0.6rem',
            background: 'linear-gradient(90deg, #fff, #d4d4ff, #f5d5b5)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {user.name || user.email?.split('@')[0] || 'User'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.15rem' }}>
            {user.role ? `Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)} • ` : ''}
            Member since {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
          {(['stats', 'history', 'favorites'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.9rem 2.2rem',
                borderRadius: '50px',
                background: activeTab === tab ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'rgba(255,255,255,0.06)',
                color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.75)',
                border: 'none',
                fontWeight: 600,
                fontSize: '1.05rem',
                cursor: 'pointer',
                transition: 'all 0.35s ease',
                boxShadow: activeTab === tab ? '0 0 25px rgba(139,92,246,0.5)' : 'none'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            <StatCard icon={<Clock size={52} />} value={`${stats.totalTime}h`} label="Total Watched" color="#f59e0b" />
            <StatCard icon={<Play size={52} />} value={stats.watched.toString()} label="Movies Completed" color="#8b5cf6" />
            <StatCard icon={<Heart size={52} />} value={stats.favorites.toString()} label="Favorites" color="#ec4899" />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '2rem', fontWeight: 700 }}>Recently Watched</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.8rem' }}>
              {watchHistory.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', gridColumn: '1 / -1', padding: '4rem 0' }}>
                  No watch history yet
                </p>
              ) : (
                watchHistory.map(item => (
                  <Link key={item.id} href={`/watch/${item.movie?.slug ?? ''}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      transition: 'all 0.4s ease',
                      border: '1px solid rgba(139,92,246,0.12)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-10px)'
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.12)'
                    }}>
                      <div style={{ position: 'relative', aspectRatio: '2/3' }}>
                        <Image
                          src={item.movie?.poster_url || '/placeholder-poster.jpg'}
                          alt={item.movie?.title || 'Movie'}
                          fill
                          style={{ objectFit: 'cover' }}
                          unoptimized
                        />
                      </div>
                      <div style={{ padding: '1.2rem', textAlign: 'center' }}>
                        <h3 style={{ color: 'white', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                          {item.movie?.title || 'Unknown Title'}
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem' }}>
                          {item.last_watched 
                            ? new Date(item.last_watched).toLocaleDateString() 
                            : 'Never'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '2rem', fontWeight: 700 }}>Your Favorites</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.8rem' }}>
              {favorites.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', gridColumn: '1 / -1', padding: '4rem 0' }}>
                  No favorites yet
                </p>
              ) : (
                favorites.map(movie => (
                  <Link key={movie.id} href={`/watch/${movie.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '18px',
                      overflow: 'hidden',
                      transition: 'all 0.4s ease',
                      border: '1px solid rgba(139,92,246,0.12)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-10px)'
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.12)'
                    }}>
                      <div style={{ position: 'relative', aspectRatio: '2/3' }}>
                        <Image
                          src={movie.poster_url || '/placeholder-poster.jpg'}
                          alt={movie.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          unoptimized
                        />
                      </div>
                      <div style={{ padding: '1.2rem', textAlign: 'center' }}>
                        <h3 style={{ color: 'white', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                          {movie.title}
                        </h3>
                        <p style={{ color: '#fbbf24', fontSize: '0.95rem' }}>
                          ★ {movie.admin_rating || movie.rating || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(245,158,11,0.08))',
      borderRadius: '24px',
      padding: '2.8rem 1.8rem',
      textAlign: 'center',
      border: '1px solid rgba(139,92,246,0.2)',
      backdropFilter: 'blur(12px)',
      transition: 'all 0.4s ease',
      boxShadow: '0 10px 35px rgba(0,0,0,0.35)'
    }}
    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-12px)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ color, marginBottom: '1.2rem', opacity: 0.9 }}>{icon}</div>
      <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.6rem', color: 'white' }}>{value}</div>
      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.15rem', fontWeight: 500 }}>{label}</div>
    </div>
  )
}