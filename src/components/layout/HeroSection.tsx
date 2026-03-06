'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Play, Info, ChevronDown } from 'lucide-react'
import type { Movie } from '@/types'

interface HeroSectionProps {
  movie?: Movie | null
  /** fallback: show brand splash if no movie */
  showBrandFallback?: boolean
}

export function HeroSection({ movie, showBrandFallback = true }: HeroSectionProps) {
  /* ── If we have a movie, render cinematic Netflix-style hero ── */
  if (movie) {
    const backdropSrc = movie.backdrop_url || movie.poster_url || ''

    return (
      <section className="hero-section">
        {/* Backdrop image */}
        {backdropSrc && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <Image
              src={backdropSrc}
              alt={movie.title}
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
              priority
              unoptimized
            />
          </div>
        )}

        {/* Amber-fire gradient overlay — matches reference: dark left + bottom */}
        <div className="hero-gradient-overlay" style={{ zIndex: 1 }} />

        {/* Animated fire glow behind text */}
        <div className="hero-fire-glow" style={{ zIndex: 1 }} />

        {/* Content */}
        <div className="hero-content" style={{ zIndex: 2 }}>
          <div className="hero-text-block">

            {/* Eyebrow */}
            <div className="hero-eyebrow">
              {movie.is_trending ? '🔥 Trending Now' : movie.is_featured ? '✦ Featured' : '▶ Now Showing'}
            </div>

            {/* Title */}
            <h1 className="hero-title">{movie.title}</h1>

            {/* Meta row */}
            <div className="hero-meta">
              {movie.release_year && <span>{movie.release_year}</span>}
              {movie.release_year && movie.duration_minutes && <span className="hero-meta-dot" />}
              {movie.duration_minutes && <span>{movie.duration_minutes} min</span>}
              {movie.language && (
                <>
                  <span className="hero-meta-dot" />
                  <span style={{ padding: '0.1rem 0.55rem', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, fontSize: '0.78rem' }}>
                    {movie.language.toUpperCase()}
                  </span>
                </>
              )}
              {movie.genre?.slice(0, 2).map(g => (
                <span key={g} className="badge badge-fire">{g}</span>
              ))}
            </div>

            {/* Description */}
            {movie.description && (
              <p className="hero-desc">{movie.description}</p>
            )}

            {/* CTAs */}
            <div className="hero-actions">
              <Link href={`/watch/${movie.slug}`}>
                <button className="btn-fire" style={{ gap: '0.65rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
                  <Play style={{ width: 18, height: 18, fill: 'white' }} />
                  Play Now
                </button>
              </Link>
              <Link href={`/watch/${movie.slug}`}>
                <button className="btn-ghost" style={{ gap: '0.65rem' }}>
                  <Info style={{ width: 17, height: 17 }} />
                  More Info
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <ScrollHint />
      </section>
    )
  }

  /* ── Brand splash fallback (no movies yet) ── */
  if (!showBrandFallback) return null

  return (
    <section className="hero-section" style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
      {/* Dark gradient bg */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 120% 80% at 50% 60%, rgba(255,98,0,0.12) 0%, transparent 65%), var(--bg-void)',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 1.5rem', maxWidth: 800 }}>
        <p style={{ fontSize: '0.78rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--brand-gold)', marginBottom: '1.2rem', fontWeight: 600 }}>
          ✦ Welcome to
        </p>
        <h1 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 'clamp(3rem, 10vw, 7rem)',
          letterSpacing: '0.06em', lineHeight: 0.9,
          marginBottom: '1.5rem',
        }}>
          <span className="gradient-text">ROY</span>
          <br />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.55em', letterSpacing: '0.18em' }}>ENTERTAINMENT</span>
        </h1>

        <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          Premium cinema, curated for you.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/movies">
            <button className="btn-fire" style={{ padding: '1rem 2.2rem', fontSize: '1rem' }}>
              <Play style={{ width: 18, height: 18, fill: 'white' }} />
              Browse Movies
            </button>
          </Link>
          <Link href="/series">
            <button className="btn-ghost" style={{ padding: '1rem 2.2rem', fontSize: '1rem' }}>
              Browse Series
            </button>
          </Link>
        </div>
      </div>

      <ScrollHint />
    </section>
  )
}

function ScrollHint() {
  return (
    <div style={{
      position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem',
      zIndex: 5, opacity: 0.55,
    }}>
      <span style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Scroll
      </span>
      <ChevronDown style={{ width: 16, height: 16, color: 'var(--brand-gold)', animation: 'heroScrollBounce 1.6s ease-in-out infinite' }} />
      <style jsx global>{`
        @keyframes heroScrollBounce {
          0%, 100% { transform: translateY(0);   opacity: 0.55; }
          50%       { transform: translateY(6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}