// src/app/(main)/movies/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Clock, Play } from 'lucide-react'
import type { Movie } from '@/types'

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'featured' | 'trending'>('all')
  const [genreFilter, setGenreFilter] = useState<string>('All')

  const allGenres = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Mystery', 'Adventure', 'Documentary']

  useEffect(() => {
    loadMovies()
  }, [filter, genreFilter])

  const loadMovies = async () => {
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      
      let query = supabase
        .from('movies')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (filter === 'featured') {
        query = query.eq('is_featured', true)
      } else if (filter === 'trending') {
        query = query.eq('is_trending', true)
      }

      if (genreFilter !== 'All') {
        query = query.contains('genre', [genreFilter])
      }

      const { data, error } = await query

      if (error) throw error

      setMovies(data || [])
    } catch (error) {
      console.error('Error loading movies:', error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      <Navigation />
      
      <main style={{ paddingTop: '80px', maxWidth: '1400px', margin: '0 auto', padding: '100px 2rem 2rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2rem', color: 'white' }}>
          All Movies
        </h1>

        {/* Filters */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            {(['all', 'featured', 'trending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: filter === f ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                  color: filter === f ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'all' ? 'All Movies' : f}
              </button>
            ))}
          </div>

          {/* Genre Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {allGenres.map(genre => (
              <button
                key={genre}
                onClick={() => setGenreFilter(genre)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '15px',
                  border: 'none',
                  fontSize: '0.85rem',
                  backgroundColor: genreFilter === genre ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                  color: genreFilter === genre ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid rgba(139, 92, 246, 0.3)',
              borderTop: '3px solid #8b5cf6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }} />
            <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.5)' }}>Loading movies...</p>
          </div>
        )}

        {/* Movies Grid */}
        {!loading && movies.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ fontSize: '1.25rem', color: 'rgba(255,255,255,0.5)' }}>
              No movies found. Try changing filters or{' '}
              <Link href="/admin/upload" style={{ color: '#8b5cf6' }}>upload a new movie</Link>.
            </p>
          </div>
        )}

        {!loading && movies.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1.5rem',
          }}>
            {movies.map(movie => (
              <Link key={movie.id} href={`/watch/${movie.slug}`} style={{ textDecoration: 'none' }}>
                <div 
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)'
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                  }}
                >
                  <div style={{ position: 'relative', aspectRatio: '2/3', overflow: 'hidden' }}>
                    <Image
                      src={movie.poster_url || 'https://via.placeholder.com/300x450?text=No+Poster'}
                      alt={movie.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.3s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                    >
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(139, 92, 246, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Play style={{ width: '24px', height: '24px', fill: 'white', color: 'white', marginLeft: '4px' }} />
                      </div>
                    </div>
                    
                    {/* Badges */}
                    <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                      {movie.is_featured && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'rgba(139, 92, 246, 0.9)',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          color: 'white',
                        }}>
                          Featured
                        </span>
                      )}
                      {movie.is_trending && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          color: 'white',
                        }}>
                          Trending
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem', color: 'white' }}>
                      {movie.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                      <span>{movie.release_year}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock style={{ width: '12px', height: '12px' }} />
                        {movie.duration_minutes}m
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24' }}>
                        <Star style={{ width: '12px', height: '12px', fill: '#fbbf24' }} />
                        {movie.rating}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {movie.genre?.slice(0, 2).map(g => (
                        <span key={g} style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'rgba(139, 92, 246, 0.15)',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          color: '#a78bfa',
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
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