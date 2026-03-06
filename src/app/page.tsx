'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { AIChatbot } from '@/components/ai/AIChatbot'
import MovieCard from '@/components/movies/MovieCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation as SwiperNavigation, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'
import { Play, Info, ChevronRight, Flame, Sparkles, Clock, Star } from 'lucide-react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

export default function HomePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [featured,         setFeatured]         = useState<any[]>([])
  const [trending,         setTrending]          = useState<any[]>([])
  const [newReleases,      setNewReleases]        = useState<any[]>([])
  const [continueWatching, setContinueWatching]  = useState<any[]>([])
  const [genreSections,    setGenreSections]      = useState<{ title: string; movies: any[] }[]>([])
  const [loading,          setLoading]            = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: allMovies, error } = await supabase
        .from('movies')
        .select('*')
        .eq('is_published', true)
        .limit(60)

      if (error) throw error
      if (!allMovies?.length) return

      setFeatured(allMovies.filter(m => m.is_featured).slice(0, 12))

      const trend = allMovies
        .filter(m => (m.admin_rating || 0) >= 7 || (m.view_count || 0) > 5000)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 12)
      setTrending(trend)

      setNewReleases(
        [...allMovies]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 12)
      )

      const genres = ['Action', 'Thriller', 'Sci-Fi', 'Drama', 'Horror']
      setGenreSections(
        genres
          .map(g => ({ title: g, movies: allMovies.filter(m => m.genre?.includes(g)).slice(0, 10) }))
          .filter(s => s.movies.length > 0)
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: progress } = await supabase
          .from('watch_history')
          .select('*, movie:movies(*)')
          .eq('user_id', user.id)
          .neq('completed', true)
          .order('last_watched', { ascending: false })
          .limit(10)

        setContinueWatching(
          (progress ?? [])
            .filter(p => p.movie && p.progress_seconds < (p.movie.duration_minutes * 60 || Infinity))
            .map(p => p.movie)
        )
      }
    } catch (err) {
      console.error('Error loading homepage:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Hero carousel movies (top 5 trending) ── */
  const heroMovies = trending.slice(0, 5)

  if (loading) {
    return (
      <div className="loading-screen">
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 'clamp(2rem, 8vw, 4rem)',
            letterSpacing: '0.15em',
            background: 'linear-gradient(90deg, #FF6200, #FFB733)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '2rem',
          }}>
            ROY ENTERTAINMENT
          </div>
          <div className="loading-ring" style={{ margin: '0 auto 1rem' }} />
          <p className="loading-text">Loading Cinema</p>
        </div>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-void)', overflow: 'hidden' }}>
      <Navigation />

      {/* ═══════════════════════════════════════════
          HERO CAROUSEL
          ═══════════════════════════════════════════ */}
      {heroMovies.length > 0 ? (
        <section className="hero-section">
          <Swiper
            modules={[Autoplay, Pagination, SwiperNavigation, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            spaceBetween={0}
            slidesPerView={1}
            autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            pagination={{ clickable: true, dynamicBullets: false }}
            navigation
            loop={heroMovies.length > 1}
            style={{ width: '100%', height: '100%' }}
          >
            {heroMovies.map((movie, idx) => (
              <SwiperSlide key={movie.id}>
                {/* Background image */}
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Image
                    src={movie.backdrop_url || movie.poster_url || '/placeholder-wide.jpg'}
                    alt={movie.title}
                    fill
                    priority={idx === 0}
                    style={{
                      objectFit: 'cover',
                      objectPosition: 'center top',
                      filter: 'brightness(0.4) saturate(1.15)',
                      transform: 'scale(1.04)',
                      transition: 'transform 8s ease',
                    }}
                  />
                </div>

                {/* Cinematic gradient overlays */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `
                    linear-gradient(to top, var(--bg-void) 0%, rgba(5,5,7,0.65) 35%, rgba(5,5,7,0.1) 65%, transparent 100%),
                    linear-gradient(to right, rgba(5,5,7,0.75) 0%, rgba(5,5,7,0.2) 50%, transparent 100%)
                  `,
                }} />

                {/* Subtle orange vignette at bottom */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '40%',
                  background: 'linear-gradient(to top, rgba(255,80,0,0.06), transparent)',
                  pointerEvents: 'none',
                }} />

                {/* Content */}
                <div className="hero-content">
                  <div className="hero-text-block">
                    {/* Category line */}
                    <div className="hero-category">
                      <Flame style={{ width: 13, height: 13 }} />
                      Trending
                    </div>

                    {/* Title */}
                    <h1 className="hero-title">{movie.title}</h1>

                    {/* Meta row */}
                    <div className="hero-meta">
                      {movie.release_year && <span>{movie.release_year}</span>}
                      {movie.release_year && movie.duration_minutes && <span className="hero-meta-dot" />}
                      {movie.duration_minutes && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock style={{ width: 13, height: 13 }} />
                          {movie.duration_minutes} min
                        </span>
                      )}
                      {movie.admin_rating && (
                        <>
                          <span className="hero-meta-dot" />
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#FFB733' }}>
                            <Star style={{ width: 13, height: 13, fill: '#FFB733' }} />
                            {movie.admin_rating}
                          </span>
                        </>
                      )}
                      {movie.genre?.slice(0, 2).map((g: string, i: number) => (
                        <span key={i} style={{
                          padding: '0.2rem 0.65rem',
                          borderRadius: 9999,
                          background: 'rgba(255,98,0,0.15)',
                          border: '1px solid rgba(255,140,0,0.25)',
                          color: 'rgba(255,183,51,0.9)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    {movie.description && (
                      <p className="hero-desc">{movie.description}</p>
                    )}

                    {/* CTA Buttons */}
                    <div className="hero-actions">
                      <Link href={`/watch/${movie.slug}`}>
                        <button className="btn-fire" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', gap: '0.5rem' }}>
                          <Play style={{ width: 18, height: 18, fill: 'white' }} />
                          Watch Now
                        </button>
                      </Link>
                      <Link href={`/watch/${movie.slug}`}>
                        <button className="btn-ghost" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', gap: '0.5rem' }}>
                          <Info style={{ width: 18, height: 18 }} />
                          More Info
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      ) : (
        /* Fallback hero if no trending movies yet */
        <section style={{
          height: '100svh',
          minHeight: 500,
          maxHeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at center, rgba(255,98,0,0.12) 0%, var(--bg-void) 60%)',
          textAlign: 'center',
          padding: '0 1.5rem',
        }}>
          <div>
            <div style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 'clamp(3rem, 12vw, 7rem)',
              letterSpacing: '0.08em',
              background: 'linear-gradient(90deg, #FF6200, #FFB733)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
              marginBottom: '1rem',
            }}>
              ROY ENTERTAINMENT
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(1rem, 3vw, 1.25rem)', marginBottom: '2rem' }}>
              Experience Cinema Like Never Before
            </p>
            <Link href="/movies">
              <button className="btn-fire">
                <Play style={{ width: 18, height: 18, fill: 'white' }} />
                Browse Movies
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          CONTENT SECTIONS
          ═══════════════════════════════════════════ */}
      <div className="content-area">
        <div className="container">

          {/* Continue Watching */}
          {continueWatching.length > 0 && (
            <ContentSection
              title="Continue Watching"
              emoji="▶"
              movies={continueWatching}
            />
          )}

          {/* Featured */}
          {featured.length > 0 && (
            <ContentSection
              title="Featured Collection"
              emoji="✦"
              movies={featured}
              viewAllHref="/movies?filter=featured"
            />
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <ContentSection
              title="Trending Now"
              icon={<Flame style={{ width: 18, height: 18, color: '#FF6200' }} />}
              movies={trending}
              viewAllHref="/movies?filter=trending"
            />
          )}

          {/* New Releases */}
          {newReleases.length > 0 && (
            <ContentSection
              title="New Releases"
              icon={<Sparkles style={{ width: 18, height: 18, color: '#FFB733' }} />}
              movies={newReleases}
              viewAllHref="/movies"
            />
          )}

          {/* Genre sections */}
          {genreSections.map((section) => (
            <ContentSection
              key={section.title}
              title={`${section.title} Films`}
              movies={section.movies}
              viewAllHref={`/movies?genre=${encodeURIComponent(section.title)}`}
            />
          ))}

          {/* Empty state */}
          {featured.length === 0 && trending.length === 0 && newReleases.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: 'clamp(4rem, 10vh, 8rem) 1rem',
            }}>
              <div style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                letterSpacing: '0.06em',
                background: 'linear-gradient(90deg, #FF6200, #FFB733)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1rem',
              }}>
                Welcome to Roy Entertainment
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2rem' }}>
                Upload movies in the admin panel to populate your cinema.
              </p>
              <Link href="/admin">
                <button className="btn-fire">Go to Admin Panel</button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <AIChatbot />
    </main>
  )
}

/* ══════════════════════════════════════════
   CONTENT SECTION COMPONENT
   ══════════════════════════════════════════ */
function ContentSection({
  title,
  emoji,
  icon,
  movies,
  viewAllHref,
}: {
  title: string
  emoji?: string
  icon?: React.ReactNode
  movies: any[]
  viewAllHref?: string
}) {
  return (
    <section className="content-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-title-accent" />
          {icon ?? (emoji && <span style={{ fontSize: '1rem' }}>{emoji}</span>)}
          {title}
        </h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="section-view-all">
            See all <ChevronRight style={{ width: 15, height: 15 }} />
          </Link>
        )}
      </div>

      <div className="movie-grid">
        {movies.map((movie, idx) => (
          <MovieCard key={movie.id} movie={movie} priority={idx < 6} />
        ))}
      </div>
    </section>
  )
}