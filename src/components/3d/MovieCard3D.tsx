// src/components/3d/MovieCard3D.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Star, Clock, Eye, Sparkles, Flame } from 'lucide-react'
import type { Movie } from '@/types'

interface MovieCard3DProps {
  movie: Movie
  index?: number
  /** 'default' = 16:9 wide  |  'poster' = 2:3  |  'compact' = 16:9 shorter */
  variant?: 'default' | 'featured' | 'compact' | 'poster'
}

export function MovieCard3D({ movie, index = 0, variant = 'default' }: MovieCard3DProps) {
  const [hovered,    setHovered]    = useState(false)
  const [imgError,   setImgError]   = useState(false)

  /* ── Aspect & image source ── */
  const isPoster  = variant === 'poster'
  const aspectRatio = isPoster ? '2/3' : '16/9'

  // For wide cards prefer backdrop, for poster prefer poster
  const imgSrc = imgError
    ? '/placeholder-wide.jpg'
    : isPoster
      ? (movie.poster_url || movie.backdrop_url || '/placeholder-poster.jpg')
      : (movie.backdrop_url || movie.poster_url  || '/placeholder-wide.jpg')

  const showBadges  = variant !== 'compact'
  const showDetails = variant !== 'compact'

  return (
    <Link href={`/watch/${movie.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          cursor: 'pointer',
          transform: hovered ? 'translateY(-8px) scale(1.03)' : 'none',
          transition: 'all 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          boxShadow: hovered
            ? '0 22px 48px rgba(0,0,0,0.55), 0 0 0 1px var(--glass-border-h), 0 0 38px var(--glow-md)'
            : '0 4px 18px rgba(0,0,0,0.35)',
          background: 'var(--bg-card)',
          border: `1px solid ${hovered ? 'var(--glass-border-h)' : 'rgba(255,255,255,0.05)'}`,
          willChange: 'transform',
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', aspectRatio, overflow: 'hidden' }}>
          <Image
            src={imgSrc}
            alt={movie.title}
            fill
            style={{
              objectFit: 'cover',
              transition: 'transform 0.65s ease, filter 0.45s',
              transform: hovered ? 'scale(1.10)' : 'scale(1)',
              filter: hovered ? 'brightness(0.52) saturate(1.2)' : 'brightness(1)',
            }}
            onError={() => setImgError(true)}
            unoptimized
          />

          {/* Gradient scrim */}
          <div style={{
            position: 'absolute', inset: 0,
            background: hovered
              ? 'linear-gradient(to top, rgba(12,10,7,0.96) 0%, rgba(255,98,0,0.12) 50%, transparent 100%)'
              : 'linear-gradient(to top, rgba(12,10,7,0.88) 0%, rgba(12,10,7,0.22) 55%, transparent 100%)',
            transition: 'background 0.35s ease',
          }} />

          {/* Play button */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: hovered
              ? 'translate(-50%, -50%) scale(1)'
              : 'translate(-50%, -50%) scale(0.55)',
            opacity: hovered ? 1 : 0,
            transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: 5,
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 35px var(--glow-md)',
              border: '2px solid rgba(255,255,255,0.22)',
            }}>
              <Play style={{ width: 22, height: 22, color: 'white', fill: 'white', marginLeft: 3 }} />
            </div>
          </div>

          {/* Top badges */}
          {showBadges && (
            <div className="card-badge-group">
              {movie.is_featured && (
                <span className="badge badge-fire" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Sparkles style={{ width: 9, height: 9 }} />Featured
                </span>
              )}
              {movie.is_trending && (
                <span className="badge" style={{ background: 'rgba(255,69,0,0.22)', border: '1px solid rgba(255,69,0,0.45)', color: '#FF8C69', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Flame style={{ width: 9, height: 9 }} />Trending
                </span>
              )}
            </div>
          )}

          {/* Rating badge */}
          {(movie.rating > 0 || movie.admin_rating) && (
            <div style={{
              position: 'absolute', top: '0.6rem', right: '0.6rem',
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
              borderRadius: 7, padding: '0.22rem 0.55rem',
              display: 'flex', alignItems: 'center', gap: 3,
              border: '1px solid rgba(255,183,51,0.28)',
            }}>
              <Star style={{ width: 11, height: 11, color: 'var(--brand-gold)', fill: 'var(--brand-gold)' }} />
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--brand-gold)' }}>
                {(movie.admin_rating || movie.rating)?.toFixed?.(1) ?? (movie.admin_rating || movie.rating)}
              </span>
            </div>
          )}

          {/* Bottom content overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: variant === 'compact' ? '0.7rem' : '1rem',
            transform: hovered ? 'translateY(0)' : 'translateY(6px)',
            transition: 'transform 0.3s ease',
          }}>
            <h3 style={{
              fontSize: variant === 'featured' ? '1rem' : '0.9rem',
              fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: showDetails ? '0.4rem' : 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            }}>
              {movie.title}
            </h3>

            {showDetails && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)',
                marginBottom: hovered ? '0.5rem' : 0,
                transition: 'margin 0.3s',
              }}>
                {movie.release_year && <span>{movie.release_year}</span>}
                {movie.duration_minutes > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Clock style={{ width: 10, height: 10 }} />{movie.duration_minutes}m
                  </span>
                )}
                {(movie.view_count ?? 0) > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Eye style={{ width: 10, height: 10 }} />
                    {movie.view_count >= 1000
                      ? `${(movie.view_count / 1000).toFixed(1)}K`
                      : movie.view_count}
                  </span>
                )}
              </div>
            )}

            {/* Genre tags — slide in on hover */}
            {showDetails && movie.genre && movie.genre.length > 0 && (
              <div style={{
                display: 'flex', gap: '0.35rem', flexWrap: 'wrap',
                opacity: hovered ? 1 : 0,
                transform: hovered ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all 0.3s ease 0.08s',
                maxHeight: hovered ? 60 : 0, overflow: 'hidden',
              }}>
                {movie.genre.slice(0, 2).map((g) => (
                  <span key={g} className="badge badge-fire" style={{ fontSize: '0.65rem' }}>{g}</span>
                ))}
                {movie.language && (
                  <span className="badge badge-dim" style={{ fontSize: '0.65rem' }}>{movie.language}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Outer glow ring on hover */}
        <div style={{
          position: 'absolute', inset: -2, borderRadius: 18, zIndex: -1,
          background: hovered
            ? 'linear-gradient(135deg, rgba(255,98,0,0.38), rgba(255,183,51,0.18))'
            : 'transparent',
          opacity: hovered ? 1 : 0,
          transition: 'all 0.35s ease',
          filter: 'blur(10px)',
        }} />
      </div>
    </Link>
  )
}