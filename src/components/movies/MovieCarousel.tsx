// src/components/movies/MovieCarousel.tsx

'use client'

import { useRef, useState } from 'react'
import { MovieCard3D } from '@/components/3d/MovieCard3D'
import type { Movie } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MovieCarouselProps {
  title: string
  movies: Movie[]
  variant?: 'default' | 'featured' | 'compact'
}

export function MovieCarousel({ title, movies, variant = 'default' }: MovieCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
      setTimeout(checkScrollButtons, 300)
    }
  }

  const cardWidth = variant === 'featured' ? '280px' : variant === 'compact' ? '140px' : '180px'

  if (!movies || movies.length === 0) {
    return null
  }

  return (
    <section style={{ padding: '2rem 0' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '1.5rem' 
        }}>
          <h2 
            style={{
              fontSize: variant === 'featured' ? 'clamp(1.5rem, 3vw, 2rem)' : 'clamp(1.25rem, 3vw, 1.5rem)',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {title}
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: canScrollLeft ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                border: canScrollLeft ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canScrollLeft ? 'pointer' : 'not-allowed',
                color: canScrollLeft ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
                opacity: canScrollLeft ? 1 : 0.5,
              }}
              onMouseOver={(e) => {
                if (canScrollLeft) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = canScrollLeft ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <ChevronLeft style={{ width: '20px', height: '20px' }} />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: canScrollRight ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                border: canScrollRight ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canScrollRight ? 'pointer' : 'not-allowed',
                color: canScrollRight ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
                opacity: canScrollRight ? 1 : 0.5,
              }}
              onMouseOver={(e) => {
                if (canScrollRight) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.3)'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = canScrollRight ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <ChevronRight style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>
        
        {/* Movies Horizontal Scroll Container */}
        <div 
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          style={{
            display: 'flex',
            gap: variant === 'featured' ? '1.5rem' : '1rem',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '1rem',
            paddingTop: '0.5rem',
            marginLeft: '-0.5rem',
            paddingLeft: '0.5rem',
            marginRight: '-0.5rem',
            paddingRight: '0.5rem',
          }}
        >
          {movies.map((movie, index) => (
            <div 
              key={movie.id} 
              style={{ 
                flexShrink: 0,
                width: cardWidth,
              }}
            >
              <MovieCard3D 
                movie={movie} 
                index={index} 
                variant={variant}
              />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}