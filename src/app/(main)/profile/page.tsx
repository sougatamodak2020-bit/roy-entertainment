// src/app/(main)/profile/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { User, Clock, Star, Heart, Play } from 'lucide-react'
import type { Database } from '@/supabase/types'

type WatchHistoryRow = Database['public']['Tables']['watch_history']['Row']
type MovieRow        = Database['public']['Tables']['movies']['Row']
type UserRow        = Database['public']['Tables']['users']['Row']
interface WatchHistoryWithMovie extends WatchHistoryRow { movie: MovieRow | null }

export default function ProfilePage() {
  const [user,         setUser]         = useState<UserRow | null>(null)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryWithMovie[]>([])
  const [favorites,    setFavorites]    = useState<MovieRow[]>([])
  const [stats,        setStats]        = useState({ watched: 0, favorites: 0, totalTime: 0 })
  const [activeTab,    setActiveTab]    = useState<'stats' | 'history' | 'favorites'>('stats')
  const [loading,      setLoading]      = useState(true)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { window.location.href = '/login'; return }

      const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      setUser(profile)

      const { count: watchedCount   } = await supabase.from('watch_history').select('*', { count: 'exact', head: true }).eq('user_id', authUser.id).eq('completed', true)
      const { count: favoritesCount } = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', authUser.id)
      const { data:  progressData   } = await supabase.from('watch_history').select('progress_seconds').eq('user_id', authUser.id).eq('completed', true)

      const totalHours = Math.round((progressData?.reduce((a, c) => a + (c?.progress_seconds ?? 0), 0) ?? 0) / 3600)
      setStats({ watched: watchedCount ?? 0, favorites: favoritesCount ?? 0, totalTime: totalHours })

      const { data: historyRaw } = await supabase
        .from('watch_history')
        .select('id, progress_seconds, last_watched, completed, movie:movies(*)')
        .eq('user_id', authUser.id)
        .order('last_watched', { ascending: false })
        .limit(20)

      const validHistory = (historyRaw as unknown as WatchHistoryWithMovie[]).filter(
        item => item && item.id && item.movie && typeof item.movie === 'object' && !Array.isArray(item.movie)
      )
      setWatchHistory(validHistory)

      const { data: favRaw } = await supabase.from('favorites').select('movie:movies(*)').eq('user_id', authUser.id).limit(20)
      const validFavs = (favRaw as unknown as { movie: MovieRow | null }[])
        .map(f => f.movie)
        .filter((m): m is MovieRow => m !== null && typeof m === 'object' && !Array.isArray(m))
      setFavorites(validFavs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading Profile</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        Please log in to view your profile.
      </div>
    )
  }

  const userName = user.name || user.email?.split('@')[0] || 'User'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      <main style={{ maxWidth: 1300, margin: '0 auto', padding: 'clamp(5rem, 12vh, 8rem) clamp(1rem, 4vw, 2.5rem) 4rem', color: 'var(--text-primary)' }}>

        {/* Profile header */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div className="profile-avatar">
            <User style={{ width: 56, height: 56, color: 'white' }} />
          </div>

          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.2rem, 6vw, 3.5rem)', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            <span className="gradient-text">{userName}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {user.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} · ` : ''}
            Member since {new Date(user.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          {(['stats', 'history', 'favorites'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'btn-fire' : 'btn-ghost'}
              style={{ padding: '0.7rem 1.75rem', fontSize: '0.9rem' }}
            >
              {tab === 'stats' ? '📊' : tab === 'history' ? '🕐' : '❤️'}{' '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats */}
        {activeTab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
            <StatCard
              icon={<Clock size={44} style={{ color: 'var(--brand-gold)' }} />}
              value={`${stats.totalTime}h`}
              label="Total Watch Time"
            />
            <StatCard
              icon={<Play size={44} style={{ color: 'var(--brand-mid)' }} />}
              value={stats.watched.toString()}
              label="Films Completed"
            />
            <StatCard
              icon={<Heart size={44} style={{ color: '#FF6B6B' }} />}
              value={stats.favorites.toString()}
              label="Favorites"
            />
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              Recently <span className="gradient-text">Watched</span>
            </h2>
            {watchHistory.length === 0 ? (
              <EmptyTabState message="No watch history yet. Start watching something!" />
            ) : (
              <div className="movie-grid">
                {watchHistory.map(item => (
                  <MiniCard
                    key={item.id}
                    href={`/watch/${item.movie?.slug ?? ''}`}
                    poster={item.movie?.poster_url}
                    title={item.movie?.title || 'Unknown'}
                    sub={item.last_watched ? new Date(item.last_watched).toLocaleDateString() : ''}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites */}
        {activeTab === 'favorites' && (
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              Your <span className="gradient-text">Favorites</span>
            </h2>
            {favorites.length === 0 ? (
              <EmptyTabState message="No favorites yet. Heart a movie to save it here!" />
            ) : (
              <div className="movie-grid">
                {favorites.map(movie => (
                  <MiniCard
                    key={movie.id}
                    href={`/watch/${movie.slug}`}
                    poster={movie.poster_url}
                    title={movie.title}
                    sub={movie.admin_rating || movie.rating ? `★ ${movie.admin_rating || movie.rating}` : ''}
                    subColor="var(--brand-gold)"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-card">
      <div style={{ marginBottom: '1.1rem' }}>{icon}</div>
      <div style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2.2rem, 5vw, 3rem)', letterSpacing: '0.04em', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function MiniCard({ href, poster, title, sub, subColor }: { href: string; poster?: string | null; title: string; sub?: string; subColor?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="movie-card-wrapper">
        <div className="movie-card">
          <Image src={poster || '/placeholder-poster.jpg'} alt={title} fill style={{ objectFit: 'cover' }} unoptimized />
          <div className="movie-play-btn">
            <Play style={{ width: 16, height: 16, fill: 'white', color: 'white', marginLeft: 2 }} />
          </div>
        </div>
        <div className="movie-card-info">
          <p className="movie-card-title">{title}</p>
          {sub && <p style={{ fontSize: '0.72rem', color: subColor || 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
        </div>
      </div>
    </Link>
  )
}

function EmptyTabState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
      <p style={{ fontSize: '1rem' }}>{message}</p>
    </div>
  )
}