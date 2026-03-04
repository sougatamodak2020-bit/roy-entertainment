// src/components/3d/MovieCard3D.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play, Star, Clock, Eye, TrendingUp, Sparkles } from 'lucide-react'
import type { Movie } from '@/types'

interface MovieCard3DProps {
  movie: Movie
  index: number
  variant?: 'default' | 'featured' | 'compact'
}

export function MovieCard3D({ movie, index, variant = 'default' }: MovieCard3DProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const cardHeight = variant === 'featured' ? '380px' : variant === 'compact' ? '200px' : '260px'
  const showBadges = variant !== 'compact'
  const showDetails = variant !== 'compact'

  return (
    <Link href={`/watch/${movie.slug}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          cursor: 'pointer',
          transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: isHovered 
            ? '0 20px 40px rgba(139, 92, 246, 0.3), 0 0 60px rgba(139, 92, 246, 0.1)' 
            : '0 4px 20px rgba(0, 0, 0, 0.3)',
          background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.9), rgba(15, 15, 20, 0.95))',
          border: isHovered ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Poster Image */}
        <div style={{ 
          position: 'relative', 
          height: cardHeight,
          overflow: 'hidden',
        }}>
          {movie.poster_url && !imageError ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              fill
              style={{ 
                objectFit: 'cover',
                transition: 'transform 0.5s ease',
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              }}
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Play style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.2)' }} />
            </div>
          )}

          {/* Gradient Overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: isHovered 
              ? 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
            transition: 'background 0.3s ease',
          }} />

          {/* Badges */}
          {showBadges && (
            <div style={{ 
              position: 'absolute', 
              top: '0.75rem', 
              left: '0.75rem', 
              display: 'flex', 
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}>
              {movie.is_featured && (
                <span style={{
                  padding: '0.25rem 0.6rem',
                  backgroundColor: 'rgba(139, 92, 246, 0.9)',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                }}>
                  <Sparkles style={{ width: '10px', height: '10px' }} />
                  Featured
                </span>
              )}
              {movie.is_trending && (
                <span style={{
                  padding: '0.25rem 0.6rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.9)',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: 'white',
                  backdropFilter: 'blur(4px)',
                }}>
                  <TrendingUp style={{ width: '10px', height: '10px' }} />
                  Trending
                </span>
              )}
            </div>
          )}

          {/* Rating Badge */}
          {movie.rating > 0 && (
            <div style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              padding: '0.35rem 0.6rem',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}>
              <Star style={{ width: '12px', height: '12px', color: '#fbbf24', fill: '#fbbf24' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24' }}>
                {movie.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Play Button on Hover */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: isHovered ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0)',
            opacity: isHovered ? 1 : 0,
            transition: 'all 0.3s ease',
            zIndex: 10,
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.9))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}>
              <Play style={{ width: '24px', height: '24px', color: 'white', fill: 'white', marginLeft: '3px' }} />
            </div>
          </div>

          {/* Content Overlay */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '1rem',
            transform: isHovered ? 'translateY(0)' : 'translateY(10px)',
            opacity: isHovered ? 1 : 0.9,
            transition: 'all 0.3s ease',
          }}>
            {/* Title */}
            <h3 style={{
              fontSize: variant === 'featured' ? '1.1rem' : '0.95rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {movie.title}
            </h3>

            {/* Meta Info */}
            {showDetails && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '0.5rem',
              }}>
                <span>{movie.release_year}</span>
                {movie.duration_minutes > 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock style={{ width: '11px', height: '11px' }} />
                    {movie.duration_minutes}m
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Eye style={{ width: '11px', height: '11px' }} />
                  {movie.view_count >= 1000 
                    ? `${(movie.view_count / 1000).toFixed(1)}K` 
                    : movie.view_count}
                </span>
              </div>
            )}

            {/* Genre Tags */}
            {showDetails && movie.genre && movie.genre.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '0.4rem',
                flexWrap: 'wrap',
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? 'translateY(0)' : 'translateY(10px)',
                transition: 'all 0.3s ease 0.1s',
              }}>
                {movie.genre.slice(0, 2).map((genre) => (
                  <span 
                    key={genre}
                    style={{
                      padding: '0.2rem 0.5rem',
                      backgroundColor: 'rgba(139, 92, 246, 0.3)',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      color: '#c4b5fd',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    {genre}
                  </span>
                ))}
                {movie.language && (
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}>
                    {movie.language}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Glow Effect */}
        <div style={{
          position: 'absolute',
          inset: '-2px',
          borderRadius: '18px',
          background: isHovered 
            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(245, 158, 11, 0.2))' 
            : 'transparent',
          opacity: isHovered ? 1 : 0,
          transition: 'all 0.3s ease',
          zIndex: -1,
          filter: 'blur(8px)',
        }} />
      </div>
    </Link>
  )
}