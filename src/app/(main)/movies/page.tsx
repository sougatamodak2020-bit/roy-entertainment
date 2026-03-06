// src/app/(main)/movies/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Clock, Play, Film, Flame, Sparkles } from 'lucide-react'
import type { Movie } from '@/types'

const ALL_GENRES = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Mystery', 'Adventure', 'Documentary']

export default function MoviesPage() {
  const [movies,      setMovies]      = useState<Movie[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<'all' | 'featured' | 'trending'>('all')
  const [genreFilter, setGenreFilter] = useState('All')

  useEffect(() => { loadMovies() }, [filter, genreFilter])

  const loadMovies = async () => {
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      let query = supabase.from('movies').select('*').eq('is_published', true).order('created_at', { ascending: false })
      if (filter === 'featured') query = query.eq('is_featured', true)
      else if (filter === 'trending') query = query.eq('is_trending', true)
      if (genreFilter !== 'All') query = query.contains('genre', [genreFilter])
      const { data, error } = await query
      if (error) throw error
      setMovies(data || [])
    } catch (err) {
      console.error(err)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      {/* Page hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Animated gradient bar at top */}
        <div className="page-banner-gradient" />

        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: '60%', right: '-5%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, var(--glow-sm) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="page-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 18px var(--glow-sm)',
            }}>
              <Film style={{ width: 20, height: 20, color: 'white' }} />
            </div>
            <h1 className="page-hero-title" style={{ margin: 0 }}>
              <span className="gradient-text">All</span> Movies
            </h1>
          </div>
          <p className="page-hero-sub">
            {movies.length > 0 ? `${movies.length} films available` : 'Browse our complete collection'}
          </p>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {([
              { id: 'all',      label: 'All Movies', icon: null     },
              { id: 'featured', label: 'Featured',   icon: <Sparkles style={{ width: 13, height: 13 }} /> },
              { id: 'trending', label: 'Trending',   icon: <Flame    style={{ width: 13, height: 13 }} /> },
            ] as const).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`filter-pill${filter === id ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Genre pills */}
          <div className="filter-bar">
            {ALL_GENRES.map(g => (
              <button key={g} onClick={() => setGenreFilter(g)} className={`filter-pill${genreFilter === g ? ' active' : ''}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container" style={{ paddingBottom: '4rem' }}>
        {loading ? (
          <LoadingGrid />
        ) : movies.length === 0 ? (
          <EmptyState type="movies" />
        ) : (
          <div className="movie-grid">
            {movies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

/* ── Movie Card ── */
function MovieCard({ movie }: { movie: Movie }) {
  return (
    <Link href={`/watch/${movie.slug}`} style={{ textDecoration: 'none' }}>
      <div className="movie-card-wrapper">
        <div className="movie-card">
          <Image
            src={movie.poster_url || '/placeholder-poster.jpg'}
            alt={movie.title}
            fill style={{ objectFit: 'cover' }}
            unoptimized
          />
          {/* Play button */}
          <div className="movie-play-btn">
            <Play style={{ width: 18, height: 18, fill: 'white', color: 'white', marginLeft: 2 }} />
          </div>
          {/* Overlay */}
          <div className="movie-overlay">
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {movie.genre?.slice(0, 2).map(g => (
                <span key={g} className="badge badge-fire">{g}</span>
              ))}
            </div>
          </div>
          {/* Top badges */}
          <div className="card-badge-group">
            {movie.is_featured && <span className="badge badge-fire">Featured</span>}
            {movie.is_trending && <span className="badge badge-dim" style={{ background: 'rgba(255,69,0,0.22)', borderColor: 'rgba(255,69,0,0.4)', color: '#FF8C69' }}>🔥 Hot</span>}
          </div>
        </div>
        <div className="movie-card-info">
          <p className="movie-card-title">{movie.title}</p>
          <div className="movie-card-meta">
            <span>{movie.release_year}</span>
            {movie.duration_minutes && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Clock style={{ width: 10, height: 10 }} />{movie.duration_minutes}m
                </span>
              </>
            )}
            {(movie.admin_rating || movie.rating) && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span className="movie-card-rating">
                  <Star style={{ width: 10, height: 10, fill: 'currentColor' }} />
                  {movie.admin_rating || movie.rating}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

function LoadingGrid() {
  return (
    <div className="movie-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 0 }} />
          <div style={{ padding: '0.8rem', background: 'var(--card-info-bg)' }}>
            <div className="skeleton" style={{ height: 14, width: '75%', marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 11, width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ type }: { type: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 'clamp(4rem, 10vh, 7rem) 1rem' }}>
      <div style={{
        width: 70, height: 70, borderRadius: 18,
        background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.5rem', boxShadow: '0 0 30px var(--glow-md)',
      }}>
        <Film style={{ width: 32, height: 32, color: 'white' }} />
      </div>
      <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
        No {type} found
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem' }}>
        Try adjusting your filters or{' '}
        <Link href="/admin/upload" style={{ color: 'var(--brand-mid)', textDecoration: 'none' }}>upload new content</Link>.
      </p>
    </div>
  )
}