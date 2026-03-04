// src/app/(main)/watch/[slug]/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Play, ArrowLeft, Heart, Plus, Share2, Star, Clock, User, Film, 
  ChevronRight, Loader2
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
  
  // State
  const [movie, setMovie] = useState<Movie | null>(null)
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [userRating, setUserRating] = useState(0)

  // Load movie data
  useEffect(() => {
    if (slug) {
      loadMovie()
    }
  }, [slug])

  const loadMovie = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createSupabaseBrowserClient()
      
      // Fetch the movie
      const { data: movieData, error: movieError } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

      if (movieError) {
        console.error('Movie fetch error:', movieError)
        if (movieError.code === 'PGRST116') {
          setError('Movie not found')
        } else {
          setError('Failed to load movie')
        }
        return
      }

      if (!movieData) {
        setError('Movie not found')
        return
      }

      setMovie(movieData as Movie)
      
      // Increment view count (fire and forget)
      supabase
        .from('movies')
        .update({ view_count: (movieData.view_count || 0) + 1 })
        .eq('id', movieData.id)
        .then(() => {})
      
      // Fetch similar movies (same genre)
      if (movieData.genre && movieData.genre.length > 0) {
        const { data: similarData } = await supabase
          .from('movies')
          .select('*')
          .eq('is_published', true)
          .neq('id', movieData.id)
          .overlaps('genre', movieData.genre)
          .limit(4)
        
        if (similarData) {
          setSimilarMovies(similarData as Movie[])
        }
      }
      
    } catch (err) {
      console.error('Error loading movie:', err)
      setError('Failed to load movie')
    } finally {
      setLoading(false)
    }
  }

  const extractYouTubeId = (url?: string): string | null => {
    if (!url) return null
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  const getVideoId = (): string | null => {
    if (!movie) return null
    if (movie.youtube_id) return movie.youtube_id
    if (movie.youtube_url) return extractYouTubeId(movie.youtube_url)
    return null
  }

  // Loading State
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
          <Loader2 style={{ 
            width: '50px', 
            height: '50px', 
            color: '#8b5cf6',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading movie...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Error State
  if (error || !movie) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Play style={{ width: '32px', height: '32px', color: '#ef4444' }} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>
            {error || 'Movie Not Found'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
            The movie you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/movies">
            <button style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <ArrowLeft style={{ width: '18px', height: '18px' }} />
              Browse Movies
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const videoId = getVideoId()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      <Navigation />
      
      {/* Video Player Section */}
      <div style={{ paddingTop: '64px' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#000',
        }}>
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '25px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft style={{ width: '18px', height: '18px' }} />
            Back
          </button>

          {videoId ? (
            <YouTubePlayer
              videoId={videoId}
              title={movie.title}
              onPlay={() => console.log('Playing')}
              onPause={() => console.log('Paused')}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <Play style={{ width: '64px', height: '64px', marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ opacity: 0.5 }}>No video available for this movie</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Movie Details */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          {/* Main Content */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>{movie.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                  <span>{movie.release_year}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock style={{ width: '14px', height: '14px' }} />
                    {movie.duration_minutes} min
                  </span>
                  <span>•</span>
                  <span>{movie.language}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24' }}>
                    <Star style={{ width: '14px', height: '14px', fill: '#fbbf24' }} />
                    {movie.rating}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: isFavorite ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: isFavorite ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: isFavorite ? '#f87171' : 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Heart style={{ width: '18px', height: '18px', fill: isFavorite ? '#f87171' : 'none' }} />
                  {isFavorite ? 'Favorited' : 'Favorite'}
                </button>
                <button style={{
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <Plus style={{ width: '18px', height: '18px' }} />
                  Watchlist
                </button>
                <button style={{
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <Share2 style={{ width: '18px', height: '18px' }} />
                  Share
                </button>
              </div>
            </div>
            
            {/* Genres */}
            {movie.genre && movie.genre.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {movie.genre.map(g => (
                  <span key={g} style={{
                    padding: '0.35rem 1rem',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    color: '#a78bfa',
                  }}>{g}</span>
                ))}
              </div>
            )}
            
            {/* Description */}
            {movie.description && (
              <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: '2rem', fontSize: '1rem' }}>
                {movie.description}
              </p>
            )}

            {/* Director */}
            {movie.director && (
              <div style={{
                padding: '1.25rem',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                marginBottom: '1rem',
              }}>
                <h4 style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User style={{ width: '14px', height: '14px' }} />
                  Director
                </h4>
                <p style={{ fontWeight: 600, color: 'white' }}>{movie.director}</p>
              </div>
            )}
            
            {/* User Rating */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
              marginBottom: '2rem',
            }}>
              <h4 style={{ marginBottom: '1rem', fontWeight: 600, color: 'white' }}>Rate this movie</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button
                    key={n}
                    onClick={() => setUserRating(n)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: userRating >= n ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                      color: userRating >= n ? '#000' : 'rgba(255,255,255,0.5)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {userRating > 0 && (
                <p style={{ marginTop: '1rem', color: '#fbbf24' }}>
                  You rated this movie {userRating}/10
                </p>
              )}
            </div>
          </div>
          
          {/* Sidebar - Similar Movies */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
              Similar Movies
              <Link href="/movies" style={{ fontSize: '0.85rem', color: '#8b5cf6', textDecoration: 'none' }}>
                See all <ChevronRight style={{ width: '14px', height: '14px', display: 'inline' }} />
              </Link>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {similarMovies.length > 0 ? (
                similarMovies.map(m => (
                  <Link key={m.id} href={`/watch/${m.slug}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}>
                      <div style={{ width: '80px', height: '110px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        {m.poster_url ? (
                          <Image src={m.poster_url} alt={m.title} width={80} height={110} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play style={{ width: '24px', height: '24px', color: 'rgba(255,255,255,0.2)' }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'white' }}>{m.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                          {m.release_year} • {m.duration_minutes} min
                        </p>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24', fontSize: '0.85rem' }}>
                          <Star style={{ width: '12px', height: '12px', fill: '#fbbf24' }} />
                          {m.rating}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                  No similar movies found
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}