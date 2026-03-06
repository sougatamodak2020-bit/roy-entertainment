'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Play, ArrowLeft, Heart, Plus, Share2, Star, Clock,
  Globe, Film, ChevronRight,
} from 'lucide-react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { YouTubePlayer } from '@/components/video/YouTubePlayer'
import { MovieCarousel } from '@/components/movies/MovieCarousel'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { Movie } from '@/types'

export default function WatchPage() {
  const params   = useParams()
  const router   = useRouter()
  const slug     = params?.slug as string

  const [movie,   setMovie]   = useState<Movie | null>(null)
  const [similar, setSimilar] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [fav,     setFav]     = useState(false)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => { if (slug) loadMovie() }, [slug])

  const loadMovie = async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: err } = await supabase
        .from('movies').select('*')
        .eq('slug', slug).eq('is_published', true).single()
      if (err || !data) throw new Error(err?.message || 'Movie not found')
      setMovie(data as Movie)
      supabase.from('movies').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id)
      if (data.genre?.length) {
        const { data: sim } = await supabase
          .from('movies').select('*')
          .eq('is_published', true).neq('id', data.id)
          .overlaps('genre', data.genre).limit(10)
        setSimilar(sim || [])
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  const extractYTId = (url?: string) => {
    if (!url) return null
    return url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1] ?? null
  }

  const videoId = movie ? (movie.youtube_id || extractYTId(movie.youtube_url)) : null

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading</p>
      </div>
    )
  }

  /* ── Error ── */
  if (error || !movie) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 40px var(--glow-md)',
          }}>
            <Film style={{ width: 38, height: 38, color: 'white' }} />
          </div>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            {error || 'Not Found'}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
            This content is unavailable or has been removed.
          </p>
          <Link href="/movies">
            <button className="btn-fire" style={{ gap: '0.6rem' }}>
              <ArrowLeft size={17} /> Back to Movies
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      {/* ════════════════════════════════════════
          VIDEO SECTION
          ════════════════════════════════════════ */}
      <div style={{ background: '#000', paddingTop: 66 /* nav height */ }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(1rem, 3vw, 2rem) 0' }}>

          {/* Back button */}
          <div style={{ paddingTop: '1.25rem', paddingBottom: '0.75rem' }}>
            <button
              onClick={() => router.back()}
              className="btn-ghost"
              style={{ padding: '0.55rem 1.2rem', fontSize: '0.875rem', gap: '0.5rem' }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          </div>

          {/* Video player */}
          <div className="video-wrapper" style={{ marginBottom: '0' }}>
            {videoId ? (
              <YouTubePlayer videoId={videoId} title={movie.title} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-deep))',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', gap: '1rem',
              }}>
                <div style={{
                  width: 70, height: 70, borderRadius: 18,
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={30} style={{ opacity: 0.5 }} />
                </div>
                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Video Not Available</p>
                <p style={{ fontSize: '0.875rem', opacity: 0.6 }}>No valid video source found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOVIE INFO SECTION
          ════════════════════════════════════════ */}
      <div style={{ background: 'var(--bg-void)' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: 'clamp(2rem, 4vh, 3.5rem) clamp(1rem, 3vw, 2rem)' }}>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'clamp(180px, 22vw, 300px) 1fr',
            gap: 'clamp(1.5rem, 4vw, 3rem)',
            alignItems: 'flex-start',
          }}>

            {/* ── Poster ── */}
            <div style={{
              borderRadius: 16, overflow: 'hidden',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.55), 0 0 30px var(--glow-sm)',
              flexShrink: 0,
            }}>
              <Image
                src={movie.poster_url || movie.backdrop_url || '/placeholder-poster.jpg'}
                alt={movie.title}
                width={300} height={450}
                style={{ width: '100%', height: 'auto', objectFit: 'cover', display: 'block' }}
                priority unoptimized
              />
            </div>

            {/* ── Info ── */}
            <div>

              {/* Category pill */}
              {(movie.is_trending || movie.is_featured) && (
                <div style={{ marginBottom: '0.85rem' }}>
                  {movie.is_trending && <span className="badge badge-fire" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>🔥 Trending</span>}
                  {movie.is_featured && !movie.is_trending && <span className="badge badge-fire">✦ Featured</span>}
                </div>
              )}

              {/* Title */}
              <h1 style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 'clamp(2rem, 5.5vw, 4.5rem)',
                letterSpacing: '0.03em', lineHeight: 0.92,
                color: 'var(--text-primary)', marginBottom: '1.1rem',
              }}>
                <span className="gradient-text-warm">{movie.title}</span>
              </h1>

              {/* Meta row */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                gap: '0.65rem', marginBottom: '1.25rem',
                fontSize: '0.9rem', color: 'var(--text-secondary)',
              }}>
                {movie.release_year && <span>{movie.release_year}</span>}
                {movie.duration_minutes > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={14} />{movie.duration_minutes} min
                  </span>
                )}
                {movie.language && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Globe size={14} />{movie.language}
                  </span>
                )}
                {(movie.admin_rating || movie.rating) && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--brand-gold)', fontWeight: 700 }}>
                    <Star size={14} fill="var(--brand-gold)" />
                    {movie.admin_rating || movie.rating}
                  </span>
                )}
              </div>

              {/* Genres */}
              {movie.genre?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.75rem' }}>
                  {movie.genre.map(g => (
                    <span key={g} className="badge badge-fire">{g}</span>
                  ))}
                </div>
              )}

              {/* Description */}
              {movie.description && (
                <p style={{
                  fontSize: 'clamp(0.9rem, 1.8vw, 1.05rem)',
                  lineHeight: 1.8, color: 'var(--text-secondary)',
                  marginBottom: '2rem', maxWidth: 720,
                }}>
                  {movie.description}
                </p>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {videoId && (
                  <a href={`#player`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <button className="btn-fire" style={{ gap: '0.6rem', padding: '0.9rem 2rem' }}>
                      <Play size={17} fill="white" /> Play Now
                    </button>
                  </a>
                )}

                <button
                  onClick={() => setFav(v => !v)}
                  className="btn-ghost"
                  style={{
                    gap: '0.55rem',
                    borderColor: fav ? '#EF4444' : 'var(--glass-border)',
                    color: fav ? '#EF4444' : 'var(--text-secondary)',
                    background: fav ? 'rgba(239,68,68,0.10)' : 'var(--glass-bg)',
                  }}
                >
                  <Heart size={17} fill={fav ? '#EF4444' : 'none'} />
                  {fav ? 'Favorited' : 'Favorite'}
                </button>

                <button className="btn-ghost" style={{ gap: '0.55rem' }}>
                  <Plus size={17} /> Watchlist
                </button>

                <button className="btn-ghost" style={{ gap: '0.55rem' }}>
                  <Share2 size={17} /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          SIMILAR MOVIES
          ════════════════════════════════════════ */}
      {similar.length > 0 && (
        <div style={{ borderTop: '1px solid var(--glass-border)' }}>
          <div className="container">
            <MovieCarousel
              title="You Might Also Like"
              emoji="🎬"
              movies={similar}
              cardMode="wide"
              viewAllHref="/movies"
            />
          </div>
        </div>
      )}

      <Footer />

      <style jsx global>{`
        @media (max-width: 640px) {
          /* Stack poster + info vertically on mobile */
          .watch-info-grid {
            grid-template-columns: 1fr !important;
          }
          .watch-poster {
            max-width: 220px;
            margin: 0 auto;
          }
        }
      `}</style>
    </div>
  )
}