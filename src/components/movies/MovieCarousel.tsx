// src/components/movies/MovieCarousel.tsx
'use client'

import { useRef, useState } from 'react'
import { MovieCard3D } from '@/components/3d/MovieCard3D'
import type { Movie } from '@/types'
import { ChevronLeft, ChevronRight, ChevronRight as ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface MovieCarouselProps {
  title: string
  emoji?: string
  movies: Movie[]
  /** 'wide' = 16:9 cards (default) | 'poster' = 2:3 cards */
  cardMode?: 'wide' | 'poster'
  viewAllHref?: string
}

export function MovieCarousel({
  title,
  emoji,
  movies,
  cardMode = 'wide',
  viewAllHref,
}: MovieCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(true)

  const CARD_W_WIDE   = 320 // px — 16:9 card width in carousel
  const CARD_W_POSTER = 160 // px — 2:3 card width in carousel
  const cardWidth = cardMode === 'poster' ? CARD_W_POSTER : CARD_W_WIDE

  const checkButtons = () => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    setCanLeft(scrollLeft > 5)
    setCanRight(scrollLeft < scrollWidth - clientWidth - 5)
  }

  const scroll = (dir: 'left' | 'right') => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({ left: dir === 'left' ? -cardWidth * 2.5 : cardWidth * 2.5, behavior: 'smooth' })
    setTimeout(checkButtons, 320)
  }

  if (!movies || movies.length === 0) return null

  return (
    <section className="content-section">
      {/* ── Section header ── */}
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-title-bar" />
          {emoji && <span style={{ fontSize: '1rem' }}>{emoji}</span>}
          {title}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {viewAllHref && (
            <Link href={viewAllHref} className="section-view-all">
              See all <ArrowRight style={{ width: 13, height: 13 }} />
            </Link>
          )}

          {/* Scroll buttons */}
          <button
            onClick={() => scroll('left')}
            disabled={!canLeft}
            className="icon-btn"
            style={{
              opacity: canLeft ? 1 : 0.3,
              cursor: canLeft ? 'pointer' : 'not-allowed',
              background: canLeft ? 'rgba(255,140,0,0.10)' : 'var(--glass-bg)',
              borderColor: canLeft ? 'var(--glass-border-h)' : 'var(--glass-border)',
              color: canLeft ? 'var(--brand-gold)' : 'var(--text-dim)',
            }}
            aria-label="Scroll left"
          >
            <ChevronLeft style={{ width: 17, height: 17 }} />
          </button>

          <button
            onClick={() => scroll('right')}
            disabled={!canRight}
            className="icon-btn"
            style={{
              opacity: canRight ? 1 : 0.3,
              cursor: canRight ? 'pointer' : 'not-allowed',
              background: canRight ? 'rgba(255,140,0,0.10)' : 'var(--glass-bg)',
              borderColor: canRight ? 'var(--glass-border-h)' : 'var(--glass-border)',
              color: canRight ? 'var(--brand-gold)' : 'var(--text-dim)',
            }}
            aria-label="Scroll right"
          >
            <ChevronRight style={{ width: 17, height: 17 }} />
          </button>
        </div>
      </div>

      {/* ── Horizontal scroll row ── */}
      <div
        ref={containerRef}
        onScroll={checkButtons}
        style={{
          display: 'flex',
          gap: cardMode === 'poster' ? '0.75rem' : '1rem',
          overflowX: 'auto',
          overflowY: 'visible', // allow card lift
          paddingBottom: '1rem',
          paddingTop: '0.5rem',
          paddingLeft: '2px',   // stop clipping glow
          marginLeft: '-2px',
          paddingRight: '2px',
          marginRight: '-2px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}
      >
        {movies.map((movie, i) => (
          <div
            key={movie.id}
            style={{ flexShrink: 0, width: cardWidth }}
          >
            <MovieCard3D
              movie={movie}
              index={i}
              variant={cardMode === 'poster' ? 'poster' : 'default'}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}