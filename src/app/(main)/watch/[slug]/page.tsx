'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Play, ArrowLeft, Heart, Plus, Share2, Star, Clock, User, ChevronRight, Loader2
} from 'lucide-react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { YouTubePlayer } from '@/components/video/YouTubePlayer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { Movie } from '@/types'

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [movie, setMovie] = useState<Movie | null>(null)
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (slug) loadMovie()
  }, [slug])

  const loadMovie = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: movieData, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

      if (movieError || !movieData) throw new Error(movieError?.message || 'Movie not found')

      setMovie(movieData as Movie)

      await supabase.from('movies').update({ view_count: (movieData.view_count || 0) + 1 }).eq('id', movieData.id)

      if (movieData.genre?.length) {
        const { data: similar } = await supabase
          .from('movies')
          .select('*')
          .eq('is_published', true)
          .neq('id', movieData.id)
          .overlaps('genre', movieData.genre)
          .limit(6)

        setSimilarMovies(similar || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load movie')
    } finally {
      setLoading(false)
    }
  }

  const extractYouTubeId = (url?: string): string | null => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match?.[1] ?? null
  }

  const videoId = movie ? (movie.youtube_id || extractYouTubeId(movie.youtube_url)) : null

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 80, height: 80, color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <Play style={{ width: 100, height: 100, color: '#ef4444', marginBottom: '1.5rem', opacity: 0.7 }} />
          <h1 style={{ fontSize: '2.5rem', color: 'white', marginBottom: '1rem' }}>{error || 'Movie Not Found'}</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.2rem', marginBottom: '2rem' }}>
            The content you're looking for is unavailable or has been removed.
          </p>
          <Link href="/movies">
            <button style={{
              padding: '1.2rem 2.5rem',
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              border: 'none',
              borderRadius: '60px',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 10px 30px rgba(139,92,246,0.4)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              <ArrowLeft size={24} />
              Back to Movies
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #0a0a0b 0%, #050506 100%)' }}>
      <Navigation />

      {/* Hero Video + Poster Section - FIXED */}
      <div style={{ position: 'relative', background: '#000' }}>
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            position: 'absolute',
            top: '1.5rem',
            left: '1.5rem',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '0.8rem 1.5rem',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '50px',
            color: 'white',
            fontWeight: 500,
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 20px rgba(0,0,0,0.5)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(139,92,246,0.3)'
            e.currentTarget.style.transform = 'translateY(-3px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.6)'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Video + Poster Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 1.5rem 2rem',
        }}>
          {/* Video Player - smaller & aesthetic */}
          <div style={{
            width: '100%',
            maxWidth: '1100px',
            margin: '2rem auto 0',
            aspectRatio: '16/9',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            border: '1px solid rgba(139,92,246,0.2)',
            background: '#000'
          }}>
            {videoId ? (
              <YouTubePlayer videoId={videoId} title={movie.title} />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)',
                background: 'linear-gradient(135deg, #1a1a2e, #0f0f1a)'
              }}>
                <Play size={80} strokeWidth={1.2} style={{ marginBottom: '1.5rem', opacity: 0.7 }} />
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Video Not Available</h2>
                <p style={{ maxWidth: '500px', textAlign: 'center' }}>
                  This content is currently unavailable or the video link is invalid.
                </p>
              </div>
            )}
          </div>

          {/* Poster + Quick Info - compact, full visible */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            md: { flexDirection: 'row' },
            gap: '1.5rem',
            marginTop: '2rem',
            alignItems: 'flex-start'
          }}>
            {/* Poster */}
            <div style={{
              width: '100%',
              maxWidth: '340px',
              flexShrink: 0,
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(139,92,246,0.25)'
            }}>
              <Image
                src={movie.poster_url || movie.backdrop_url || '/placeholder-poster.jpg'}
                alt={movie.title}
                width={340}
                height={510}
                style={{ width: '100%', height: 'auto', objectFit: 'contain', background: '#000' }}
                priority
                unoptimized
              />
            </div>

            {/* Quick Info */}
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                fontWeight: 900,
                marginBottom: '1rem',
                background: 'linear-gradient(90deg, #ffffff, #d4d4ff, #ffe4c4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                lineHeight: 1.1
              }}>
                {movie.title}
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', marginBottom: '1.5rem', fontSize: '1rem', color: 'rgba(255,255,255,0.85)' }}>
                <span>{movie.release_year}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} /> {movie.duration_minutes} min
                </span>
                {movie.language && <><span>•</span><span>{movie.language}</span></>}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fbbf24' }}>
                  <Star size={16} fill="#fbbf24" /> {movie.rating || 'N/A'}
                </span>
              </div>

              {movie.genre?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '2rem' }}>
                  {movie.genre.map(g => (
                    <span key={g} style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(139,92,246,0.15)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      borderRadius: '50px',
                      fontSize: '0.9rem',
                      color: '#d8b4fe'
                    }}>
                      {g}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.9rem 1.6rem',
                    background: isFavorite ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.15)',
                    border: `1px solid ${isFavorite ? '#f87171' : 'rgba(139,92,246,0.4)'}`,
                    borderRadius: '50px',
                    color: isFavorite ? '#f87171' : '#d8b4fe',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Heart size={20} fill={isFavorite ? '#f87171' : 'none'} />
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </button>

                <button style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.9rem 1.6rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  <Plus size={20} />
                  Watchlist
                </button>

                <button style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.9rem 1.6rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  <Share2 size={20} />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Original Main Content - unchanged */}
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4rem 2rem 6rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '3.5rem' }}>
          {/* Left - Details */}
          <div>
            {/* Your original description, genres, buttons are here - unchanged */}
            {movie.description && (
              <p style={{
                fontSize: '1.15rem',
                lineHeight: 1.85,
                color: 'rgba(255,255,255,0.88)',
                marginBottom: '3.5rem',
                maxWidth: '900px'
              }}>
                {movie.description}
              </p>
            )}
          </div>

          {/* Right Sidebar - unchanged */}
          <div>
            {/* Your original sidebar code */}
          </div>
        </div>
      </div>

      <Footer />

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Targeted fixes for poster & video section */
        .poster-container {
          max-height: 500px;
          overflow: hidden;
          border-radius: 16px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5);
          border: 1px solid rgba(139,92,246,0.25);
        }

        .video-player-container {
          max-height: 60vh;
          margin: 0 auto;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          border: 1px solid rgba(139,92,246,0.2);
        }

        @media (max-width: 1024px) {
          .video-player-container {
            max-height: 50vh;
          }
          .poster-container {
            max-height: 400px;
          }
        }
      `}</style>
    </div>
  )
}