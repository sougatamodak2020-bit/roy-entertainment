// src/app/favorites/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, Play, Star, Clock, Search, X, Trash2 } from 'lucide-react'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<any[]>([])
  const [filteredFavorites, setFilteredFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    loadFavorites()
  }, [])

  useEffect(() => {
    filterAndSort()
  }, [favorites, sortBy, searchQuery])

  async function loadFavorites() {
    setLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        window.location.href = '/login'
        return
      }
      setUser(authUser)

      const { data: favData } = await supabase
        .from('favorites')
        .select('id, created_at, movie:movies(*)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })

      const movies = (favData ?? [])
        .filter((f: any) => f.movie && typeof f.movie === 'object' && !Array.isArray(f.movie))
        .map((f: any) => ({ ...f.movie, favorited_at: f.created_at, favorite_id: f.id }))

      setFavorites(movies)
    } catch (err) {
      console.error('Error loading favorites:', err)
    } finally {
      setLoading(false)
    }
  }

  function filterAndSort() {
    let filtered = [...favorites]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((m: any) =>
        m.title?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
      )
    }

    filtered.sort((a: any, b: any) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime()
        case 'rating':
          return (b.admin_rating || b.rating || 0) - (a.admin_rating || a.rating || 0)
        case 'title':
          return (a.title || '').localeCompare(b.title || '')
        case 'year':
          return (b.release_year || 0) - (a.release_year || 0)
        default:
          return 0
      }
    })

    setFilteredFavorites(filtered)
  }

  async function removeFavorite(movieId: string, favoriteId: string) {
    try {
      await supabase.from('favorites').delete().eq('id', favoriteId)
      setFavorites((prev) => prev.filter((m: any) => m.id !== movieId))
    } catch (err) {
      console.error('Remove favorite error:', err)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading Favorites</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'var(--bg-void)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'var(--text-muted)', 
        padding: '2rem' 
      }}>
        Please{' '}
        <Link href="/login" style={{ color: 'var(--brand-mid)', marginLeft: 4, textDecoration: 'none' }}>
          log in
        </Link>{' '}
        to view your favorites.
      </div>
    )
  }

  const totalMinutes = favorites.reduce((sum: number, m: any) => sum + (m.duration_minutes || 0), 0)
  const avgRating = favorites.length > 0
    ? (favorites.reduce((sum: number, m: any) => sum + (m.admin_rating || m.rating || 0), 0) / favorites.length).toFixed(1)
    : '0.0'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      <main style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: 'clamp(5rem, 12vh, 8rem) clamp(1rem, 4vw, 2.5rem) 4rem',
        color: 'var(--text-primary)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: '-60%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '250px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,107,107,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }} />

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 1rem',
            borderRadius: 9999,
            background: 'linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,107,107,0.08))',
            border: '1px solid rgba(255,107,107,0.25)',
            marginBottom: '1.25rem',
          }}>
            <Heart style={{ width: 14, height: 14, fill: '#FF6B6B', color: '#FF6B6B' }} />
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#FF6B6B',
            }}>
              Your Collection
            </span>
          </div>

          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            letterSpacing: '0.04em',
            lineHeight: 1,
            marginBottom: '0.6rem',
          }}>
            <span className="gradient-text">Favorite Movies</span>
          </h1>

          <p style={{
            color: 'var(--text-muted)',
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            maxWidth: 500,
            margin: '0 auto',
          }}>
            {favorites.length > 0
              ? `${favorites.length} film${favorites.length !== 1 ? 's' : ''} you've saved to watch again`
              : 'Heart a movie to add it to your favorites'}
          </p>
        </div>

        {/* Stats */}
        {favorites.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem',
            maxWidth: 500,
            margin: '0 auto 2.5rem',
          }}>
            <StatBox
              icon={<Heart size={22} style={{ color: '#FF6B6B' }} />}
              value={favorites.length.toString()}
              label="Favorites"
            />
            <StatBox
              icon={<Star size={22} style={{ color: '#FFB733' }} />}
              value={avgRating}
              label="Avg Rating"
            />
            <StatBox
              icon={<Clock size={22} style={{ color: '#8B5CF6' }} />}
              value={`${Math.floor(totalMinutes / 60)}h`}
              label="Runtime"
            />
          </div>
        )}

        {/* Toolbar */}
        {favorites.length > 0 && (
          <div style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.65rem',
            alignItems: 'center',
          }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
              <Search style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 14,
                height: 14,
                color: 'var(--text-muted)',
              }} />
              <input
                type="text"
                placeholder="Search favorites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '0.6rem 2rem 0.6rem 36px',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  fontFamily: 'Outfit, sans-serif',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                outline: 'none',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              <option value="recent">Recently Added</option>
              <option value="rating">Highest Rated</option>
              <option value="title">Title (A-Z)</option>
              <option value="year">Release Year</option>
            </select>
          </div>
        )}

        {/* Movies Grid */}
        {filteredFavorites.length > 0 ? (
          <div className="movie-grid">
            {filteredFavorites.map((movie: any) => (
              <FavoriteCard
                key={movie.id}
                movie={movie}
                onRemove={() => removeFavorite(movie.id, movie.favorite_id)}
              />
            ))}
          </div>
        ) : favorites.length > 0 ? (
          <EmptyState
            icon={<Search size={44} />}
            message="No movies match your search"
            sub="Try a different search term"
          />
        ) : (
          <EmptyState
            icon={<Heart size={48} />}
            message="No favorites yet"
            sub="Heart movies you love to save them here"
            ctaText="Browse Movies"
            ctaHref="/movies"
          />
        )}
      </main>

      <Footer />
    </div>
  )
}

/* ═══ Sub Components ═══ */

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,98,0,0.06), rgba(255,183,51,0.03))',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      padding: 'clamp(1rem, 3vw, 1.25rem)',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
        color: 'var(--text-primary)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        {label}
      </div>
    </div>
  )
}

function FavoriteCard({ movie, onRemove }: { movie: any; onRemove: () => void }) {
  const rating = movie.admin_rating || movie.rating || 0

  return (
    <div style={{ position: 'relative' }} className="favorite-card-wrapper">
      <Link href={`/watch/${movie.slug}`} style={{ textDecoration: 'none' }}>
        <div className="movie-card-wrapper">
          <div className="movie-card">
            <Image
              src={movie.poster_url || '/placeholder-poster.jpg'}
              alt={movie.title}
              fill
              style={{ objectFit: 'cover' }}
              unoptimized
            />
            <div className="movie-play-btn">
              <Play style={{ width: 16, height: 16, fill: 'white', color: 'white', marginLeft: 2 }} />
            </div>
          </div>
          <div className="movie-card-info">
            <p className="movie-card-title">{movie.title}</p>
            <div className="movie-card-meta">
              {rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#FFB733', fontWeight: 700 }}>
                  <Star size={10} style={{ fill: '#FFB733' }} />
                  {rating.toFixed(1)}
                </span>
              )}
              {movie.release_year && <span>{movie.release_year}</span>}
              {movie.duration_minutes && <span>{movie.duration_minutes}m</span>}
            </div>
          </div>
        </div>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onRemove()
        }}
        className="remove-favorite-btn"
        title="Remove from favorites"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,107,107,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#FF6B6B',
          backdropFilter: 'blur(8px)',
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
      >
        <Heart size={14} style={{ fill: '#FF6B6B' }} />
      </button>

      <style jsx>{`
        .favorite-card-wrapper:hover .remove-favorite-btn {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}

function EmptyState({ icon, message, sub, ctaText, ctaHref }: {
  icon: React.ReactNode
  message: string
  sub?: string
  ctaText?: string
  ctaHref?: string
}) {
  return (
    <div style={{ textAlign: 'center', padding: 'clamp(4rem, 10vh, 6rem) 1rem' }}>
      <div style={{ marginBottom: '1.25rem', opacity: 0.35, color: 'var(--text-muted)' }}>
        {icon}
      </div>
      <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
        {message}
      </p>
      {sub && (
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: ctaText ? '1.5rem' : 0 }}>
          {sub}
        </p>
      )}
      {ctaText && ctaHref && (
        <Link href={ctaHref} style={{ textDecoration: 'none' }}>
          <button className="btn-fire">{ctaText}</button>
        </Link>
      )}
    </div>
  )
}