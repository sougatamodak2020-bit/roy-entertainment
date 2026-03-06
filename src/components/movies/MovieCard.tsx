// components/movies/MovieCard.tsx

import Image from 'next/image'
import Link from 'next/link'
import { Play, Star, Clock } from 'lucide-react'
import type { Movie } from '@/types'

interface MovieCardProps {
  movie: Movie | any
  priority?: boolean
  /** 'wide' = 16:9 (default) | 'poster' = 2:3 */
  aspect?: 'wide' | 'poster'
}

export default function MovieCard({ movie, priority = false, aspect = 'wide' }: MovieCardProps) {
  if (!movie?.slug) {
    return (
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--glass-border)',
        borderRadius: 14,
        aspectRatio: aspect === 'poster' ? '2/3' : '16/9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-dim)', fontSize: '0.8rem',
      }}>
        No data
      </div>
    )
  }

  const imgSrc = aspect === 'poster'
    ? (movie.poster_url   || movie.backdrop_url || '/placeholder-poster.jpg')
    : (movie.backdrop_url || movie.poster_url   || '/placeholder-wide.jpg')

  return (
    <Link href={`/watch/${movie.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="movie-card-wrapper">

        {/* Image — aspect ratio is set via CSS on .movie-card, override here */}
        <div style={{
          position: 'relative',
          aspectRatio: aspect === 'poster' ? '2/3' : '16/9',
          overflow: 'hidden',
        }}>
          <Image
            src={imgSrc}
            alt={movie.title || 'Movie thumbnail'}
            fill
            style={{ objectFit: 'cover' }}
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            quality={80}
            unoptimized
          />

          {/* Play button — shown on hover via parent .movie-card-wrapper:hover */}
          <div className="movie-play-btn">
            <Play style={{ width: 17, height: 17, fill: 'white', color: 'white', marginLeft: 2 }} />
          </div>

          {/* Gradient scrim */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(12,10,7,0.92) 0%, rgba(12,10,7,0.30) 45%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Rating badge — top right */}
          {(movie.admin_rating || movie.rating) && (
            <div style={{
              position: 'absolute', top: '0.55rem', right: '0.55rem',
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,183,51,0.30)',
              borderRadius: 7, padding: '0.22rem 0.55rem',
              display: 'flex', alignItems: 'center', gap: '0.28rem',
            }}>
              <Star style={{ width: 11, height: 11, color: 'var(--brand-gold)', fill: 'var(--brand-gold)' }} />
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--brand-gold)' }}>
                {movie.admin_rating || movie.rating}
              </span>
            </div>
          )}

          {/* Status badges — top left */}
          <div className="card-badge-group">
            {movie.is_featured && <span className="badge badge-fire">Featured</span>}
            {movie.is_trending && (
              <span className="badge" style={{ background: 'rgba(255,69,0,0.22)', border: '1px solid rgba(255,69,0,0.4)', color: '#FF8C69' }}>
                🔥 Hot
              </span>
            )}
          </div>

          {/* Bottom text overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '0.7rem 0.85rem',
          }}>
            <h3 style={{
              fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)',
              marginBottom: '0.28rem', lineHeight: 1.25,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {movie.title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {movie.release_year && <span>{movie.release_year}</span>}
              {movie.duration_minutes > 0 && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Clock style={{ width: 10, height: 10 }} />{movie.duration_minutes}m
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}