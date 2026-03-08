'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { AIChatbot } from '@/components/ai/AIChatbot'
import MovieCard from '@/components/movies/MovieCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation as SwiperNavigation, EffectFade, EffectCreative } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'
import 'swiper/css/effect-creative'
import {
  Play, Info, ChevronRight, ChevronLeft, Flame, Sparkles,
  Clock, Star, History, TrendingUp, Award, Volume2, VolumeX
} from 'lucide-react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

interface ContinueWatchingItem {
  movie: any
  progress_seconds: number
  duration_minutes: number
  progress_percent: number
}

export default function HomePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [featured, setFeatured] = useState<any[]>([])
  const [trending, setTrending] = useState<any[]>([])
  const [newReleases, setNewReleases] = useState<any[]>([])
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([])
  const [genreSections, setGenreSections] = useState<{ title: string; movies: any[] }[]>([])
  const [heroMovies, setHeroMovies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const [isHeroHovered, setIsHeroHovered] = useState(false)
  const swiperRef = useRef<SwiperType | null>(null)

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

      // Build hero movies - prioritize: featured + trending + high rated
      const heroSelection = buildHeroMovies(allMovies)
      setHeroMovies(heroSelection)

      setFeatured(allMovies.filter(m => m.is_featured).slice(0, 12))

      const trend = allMovies
        .filter(m => m.is_trending || (m.admin_rating || 0) >= 7 || (m.view_count || 0) > 5000)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 12)
      setTrending(trend)

      setNewReleases(
        [...allMovies]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 12)
      )

      const genres = ['Action', 'Thriller', 'Sci-Fi', 'Drama', 'Horror', 'Comedy', 'Romance']
      setGenreSections(
        genres
          .map(g => ({ title: g, movies: allMovies.filter(m => m.genre?.includes(g)).slice(0, 10) }))
          .filter(s => s.movies.length > 0)
      )

      // Load continue watching
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: progress } = await supabase
          .from('watch_history')
          .select('*, movie:movies(*)')
          .eq('user_id', user.id)
          .eq('completed', false)
          .gt('progress_seconds', 30)
          .order('last_watched', { ascending: false })
          .limit(10)

        if (progress?.length) {
          const items: ContinueWatchingItem[] = progress
            .filter(p => p.movie && p.movie.is_published)
            .map(p => {
              const durationSeconds = (p.movie.duration_minutes || 120) * 60
              const progressPercent = Math.min(95, (p.progress_seconds / durationSeconds) * 100)
              return {
                movie: p.movie,
                progress_seconds: p.progress_seconds,
                duration_minutes: p.movie.duration_minutes || 120,
                progress_percent: progressPercent
              }
            })
            .filter(item => item.progress_percent < 95)

          setContinueWatching(items)
        }
      }
    } catch (err) {
      console.error('Error loading homepage:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build the best 5 movies for hero carousel
  const buildHeroMovies = (movies: any[]): any[] => {
    const scored = movies.map(m => {
      let score = 0
      // Featured movies get highest priority
      if (m.is_featured) score += 100
      // Trending movies get high priority
      if (m.is_trending) score += 80
      // High rated movies
      if (m.admin_rating) score += m.admin_rating * 5
      if (m.rating) score += m.rating * 3
      // Popular by views
      if (m.view_count) score += Math.min(m.view_count / 100, 30)
      // Recent uploads get slight boost
      const daysOld = (Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysOld < 7) score += 20
      else if (daysOld < 30) score += 10
      // Must have a backdrop or poster
      if (!m.backdrop_url && !m.poster_url) score -= 50

      return { ...m, _score: score }
    })

    return scored
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
  }

  const getMovieBadge = (movie: any) => {
    if (movie.is_featured) return { label: 'Featured', icon: Award, color: '#FFB733' }
    if (movie.is_trending) return { label: 'Trending', icon: TrendingUp, color: '#FF6200' }
    if ((movie.admin_rating || 0) >= 8) return { label: 'Top Rated', icon: Star, color: '#22C55E' }
    return { label: 'New', icon: Sparkles, color: '#8B5CF6' }
  }

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
          CINEMATIC HERO CAROUSEL
          ═══════════════════════════════════════════ */}
      {heroMovies.length > 0 ? (
        <section
          className="hero-section"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
        >
          <Swiper
            onSwiper={(swiper) => { swiperRef.current = swiper }}
            onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
            modules={[Autoplay, Pagination, SwiperNavigation, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            spaceBetween={0}
            slidesPerView={1}
            autoplay={{
              delay: 6000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            pagination={false}
            navigation={{
              prevEl: '.hero-nav-prev',
              nextEl: '.hero-nav-next',
            }}
            loop={heroMovies.length > 1}
            speed={1200}
            style={{ width: '100%', height: '100%' }}
          >
            {heroMovies.map((movie, idx) => {
              const badge = getMovieBadge(movie)
              const BadgeIcon = badge.icon

              return (
                <SwiperSlide key={movie.id}>
                  {({ isActive }) => (
                    <>
                      {/* Background image with Ken Burns effect */}
                      <div
                        className="hero-backdrop"
                        style={{
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          transition: 'transform 8s ease-out',
                        }}
                      >
                        <Image
                          src={movie.backdrop_url || movie.poster_url || '/placeholder-wide.jpg'}
                          alt={movie.title}
                          fill
                          priority={idx === 0}
                          sizes="100vw"
                          quality={90}
                          style={{
                            objectFit: 'cover',
                            objectPosition: 'center 20%',
                          }}
                        />
                        {/* Color grading overlay */}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(45deg, rgba(255,98,0,0.08) 0%, transparent 50%)',
                          mixBlendMode: 'overlay',
                        }} />
                      </div>

                      {/* Multi-layer gradient overlays */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `
                          linear-gradient(to top,
                            var(--bg-void) 0%,
                            rgba(12,10,7,0.95) 8%,
                            rgba(12,10,7,0.7) 25%,
                            rgba(12,10,7,0.3) 50%,
                            rgba(12,10,7,0.1) 70%,
                            transparent 100%
                          )
                        `,
                        zIndex: 2,
                      }} />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: `
                          linear-gradient(to right,
                            rgba(12,10,7,0.9) 0%,
                            rgba(12,10,7,0.6) 25%,
                            rgba(12,10,7,0.2) 50%,
                            transparent 70%
                          )
                        `,
                        zIndex: 2,
                      }} />

                      {/* Ambient fire glow */}
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '60%',
                        height: '50%',
                        background: 'radial-gradient(ellipse at bottom left, rgba(255,98,0,0.15) 0%, transparent 70%)',
                        zIndex: 3,
                        pointerEvents: 'none',
                        opacity: isActive ? 1 : 0,
                        transition: 'opacity 1s ease',
                      }} />

                      {/* Content */}
                      <div className="hero-content" style={{ zIndex: 10 }}>
                        <div
                          className="hero-text-block"
                          style={{
                            opacity: isActive ? 1 : 0,
                            transform: isActive ? 'translateY(0)' : 'translateY(30px)',
                            transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s',
                          }}
                        >
                          {/* Badge */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 1rem',
                            borderRadius: 9999,
                            background: `linear-gradient(135deg, ${badge.color}22, ${badge.color}11)`,
                            border: `1px solid ${badge.color}44`,
                            marginBottom: '1.25rem',
                            backdropFilter: 'blur(10px)',
                          }}>
                            <BadgeIcon style={{ width: 14, height: 14, color: badge.color }} />
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              letterSpacing: '0.15em',
                              textTransform: 'uppercase',
                              color: badge.color,
                            }}>
                              {badge.label}
                            </span>
                          </div>

                          {/* Title */}
                          <h1 style={{
                            fontFamily: 'Bebas Neue, sans-serif',
                            fontSize: 'clamp(2.2rem, 6vw, 4.5rem)',
                            letterSpacing: '0.03em',
                            lineHeight: 0.95,
                            color: 'white',
                            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                            marginBottom: '1rem',
                            maxWidth: '90%',
                          }}>
                            {movie.title}
                          </h1>

                          {/* Meta row */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            marginBottom: '1.25rem',
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)',
                          }}>
                            {movie.release_year && (
                              <span style={{
                                padding: '0.25rem 0.7rem',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 6,
                                fontWeight: 600,
                              }}>
                                {movie.release_year}
                              </span>
                            )}
                            {movie.duration_minutes && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Clock style={{ width: 14, height: 14, opacity: 0.7 }} />
                                {movie.duration_minutes} min
                              </span>
                            )}
                            {movie.admin_rating && (
                              <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: '#FFB733',
                                fontWeight: 700,
                              }}>
                                <Star style={{ width: 14, height: 14, fill: '#FFB733' }} />
                                {movie.admin_rating.toFixed(1)}
                              </span>
                            )}
                            {movie.language && (
                              <span style={{
                                padding: '0.2rem 0.6rem',
                                background: 'rgba(255,255,255,0.08)',
                                borderRadius: 4,
                                fontSize: '0.8rem',
                              }}>
                                {movie.language}
                              </span>
                            )}
                          </div>

                          {/* Genres */}
                          {movie.genre?.length > 0 && (
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              flexWrap: 'wrap',
                              marginBottom: '1.25rem',
                            }}>
                              {movie.genre.slice(0, 3).map((g: string, i: number) => (
                                <span key={i} style={{
                                  padding: '0.3rem 0.85rem',
                                  borderRadius: 9999,
                                  background: 'linear-gradient(135deg, rgba(255,98,0,0.2), rgba(255,183,51,0.1))',
                                  border: '1px solid rgba(255,140,0,0.3)',
                                  color: '#FFD080',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  letterSpacing: '0.02em',
                                }}>
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Description */}
                          {movie.description && (
                            <p style={{
                              fontSize: 'clamp(0.88rem, 1.8vw, 1.05rem)',
                              color: 'rgba(255,255,255,0.75)',
                              lineHeight: 1.7,
                              marginBottom: '2rem',
                              maxWidth: 540,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}>
                              {movie.description}
                            </p>
                          )}

                          {/* CTA Buttons */}
                          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                            <Link href={`/watch/${movie.slug}`}>
                              <button
                                className="btn-fire"
                                style={{
                                  fontSize: '1rem',
                                  padding: '1rem 2.2rem',
                                  gap: '0.6rem',
                                  boxShadow: '0 8px 32px rgba(255,98,0,0.4), 0 0 0 1px rgba(255,183,51,0.2)',
                                }}
                              >
                                <Play style={{ width: 20, height: 20, fill: 'white' }} />
                                Watch Now
                              </button>
                            </Link>
                            <Link href={`/watch/${movie.slug}`}>
                              <button
                                className="btn-ghost"
                                style={{
                                  fontSize: '0.95rem',
                                  padding: '1rem 1.8rem',
                                  gap: '0.5rem',
                                  background: 'rgba(255,255,255,0.08)',
                                  backdropFilter: 'blur(20px)',
                                }}
                              >
                                <Info style={{ width: 18, height: 18 }} />
                                More Info
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </SwiperSlide>
              )
            })}
          </Swiper>

          {/* Custom Navigation Arrows */}
          {heroMovies.length > 1 && (
            <>
              <button
                className="hero-nav-prev"
                style={{
                  position: 'absolute',
                  left: 'clamp(1rem, 3vw, 2.5rem)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 20,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  opacity: isHeroHovered ? 1 : 0,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,98,0,0.5)'
                  e.currentTarget.style.borderColor = 'rgba(255,140,0,0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.4)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                }}
              >
                <ChevronLeft style={{ width: 24, height: 24 }} />
              </button>
              <button
                className="hero-nav-next"
                style={{
                  position: 'absolute',
                  right: 'clamp(1rem, 3vw, 2.5rem)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 20,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  opacity: isHeroHovered ? 1 : 0,
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,98,0,0.5)'
                  e.currentTarget.style.borderColor = 'rgba(255,140,0,0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.4)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                }}
              >
                <ChevronRight style={{ width: 24, height: 24 }} />
              </button>
            </>
          )}

          {/* Custom Slide Indicators */}
          {heroMovies.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: 'clamp(2rem, 5vh, 4rem)',
              right: 'clamp(2rem, 5vw, 4rem)',
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {heroMovies.map((movie, idx) => (
                <button
                  key={movie.id}
                  onClick={() => swiperRef.current?.slideToLoop(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: activeSlide === idx
                      ? 'linear-gradient(90deg, rgba(255,98,0,0.3), rgba(255,140,0,0.2))'
                      : 'rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(10px)',
                    border: activeSlide === idx
                      ? '1px solid rgba(255,140,0,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    minWidth: 160,
                  }}
                  onMouseEnter={(e) => {
                    if (activeSlide !== idx) {
                      e.currentTarget.style.background = 'rgba(255,98,0,0.15)'
                      e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeSlide !== idx) {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.3)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  {/* Progress indicator */}
                  <div style={{
                    width: 3,
                    height: 32,
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: activeSlide === idx ? '100%' : '0%',
                      background: 'linear-gradient(to top, #FF6200, #FFB733)',
                      borderRadius: 2,
                      transition: activeSlide === idx ? 'height 6s linear' : 'height 0.3s ease',
                    }} />
                  </div>
                  {/* Movie info */}
                  <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: activeSlide === idx ? '#FFB733' : 'rgba(255,255,255,0.5)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: '0.15rem',
                    }}>
                      {String(idx + 1).padStart(2, '0')}
                    </p>
                    <p style={{
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: activeSlide === idx ? 'white' : 'rgba(255,255,255,0.6)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {movie.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Bottom fade gradient */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: 'linear-gradient(to top, var(--bg-void), transparent)',
            zIndex: 8,
            pointerEvents: 'none',
          }} />
        </section>
      ) : (
        /* Fallback hero if no movies */
        <section style={{
          height: 'calc(100svh - var(--nav-height))',
          marginTop: 'var(--nav-height)',
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
      <div style={{ height: 'clamp(2rem, 4vh, 3rem)' }} />
      <div className="content-area" style={{ paddingTop: 0 }}>
        <div className="container">

          {/* Continue Watching */}
          {continueWatching.length > 0 && (
            <ContinueWatchingSection items={continueWatching} />
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

      {/* ═══════════════════════════════════════════
          BECOME A CREATOR BANNER
          ═══════════════════════════════════════════ */}
      <section style={{
        margin: '0',
        padding: 'clamp(3rem, 7vh, 5rem) clamp(1rem, 5vw, 3rem)',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,98,0,0.08) 0%, rgba(5,5,7,0) 50%, rgba(255,183,51,0.06) 100%)',
        borderTop: '1px solid rgba(255,140,0,0.1)',
      }}>
        {/* Ambient glow blobs */}
        <div style={{
          position: 'absolute', top: '-60%', left: '10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,98,0,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-40%', right: '5%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,183,51,0.09) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'clamp(2rem, 5vw, 4rem)',
          alignItems: 'center',
          position: 'relative', zIndex: 1,
        }}>
          {/* Left — text */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.28rem 0.85rem', borderRadius: 9999, marginBottom: '1.25rem',
              background: 'rgba(255,98,0,0.12)', border: '1px solid rgba(255,140,0,0.25)',
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: '#FFB733',
            }}>
              🎬 For Filmmakers
            </div>

            <h2 style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              letterSpacing: '0.05em', lineHeight: 1.05,
              marginBottom: '1rem',
              background: 'linear-gradient(90deg, #ffffff 0%, #FFB733 60%, #FF6200 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Share Your Story<br />With The World
            </h2>

            <p style={{
              color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 2vw, 1.05rem)',
              lineHeight: 1.7, marginBottom: '1.75rem', maxWidth: 420,
            }}>
              Upload your films, build an audience, and track performance — all from your personal Creator Studio on Roy Entertainment.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link href="/creator">
                <button className="btn-fire" style={{
                  padding: '0.85rem 2rem', fontSize: '0.95rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  🎬 Open Creator Studio
                </button>
              </Link>
              <Link href="/creator">
                <button className="btn-ghost" style={{ padding: '0.85rem 1.5rem', fontSize: '0.9rem' }}>
                  Learn More
                </button>
              </Link>
            </div>
          </div>

          {/* Right — feature cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { icon: '📤', title: 'Upload Films', desc: 'Share your movies in minutes with simple upload tools' },
              { icon: '📊', title: 'Track Analytics', desc: 'See views, ratings and audience engagement in real-time' },
              { icon: '✅', title: 'Get Featured', desc: 'Top content gets promoted across the platform by our team' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem',
                padding: '0.9rem 1.1rem', borderRadius: 14,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,140,0,0.1)',
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.28)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,98,0,0.07)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.1)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
              >
                <span style={{ fontSize: '1.4rem', lineHeight: 1, marginTop: 2 }}>{icon}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{title}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <AIChatbot />

      {/* Additional styles for hero animations */}
      <style jsx global>{`
        @keyframes kenBurns {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.1) translate(-1%, -1%); }
        }
        
        .hero-section .swiper-slide-active .hero-backdrop {
          animation: kenBurns 8s ease-out forwards;
        }
        
        .hero-nav-prev:disabled,
        .hero-nav-next:disabled {
          opacity: 0.3 !important;
          cursor: not-allowed;
        }
        
        @media (max-width: 768px) {
          .hero-nav-prev,
          .hero-nav-next {
            width: 40px !important;
            height: 40px !important;
          }
          
          .hero-nav-prev svg,
          .hero-nav-next svg {
            width: 20px !important;
            height: 20px !important;
          }
        }
        
        @media (max-width: 900px) {
          /* Hide side indicators on smaller screens, show bottom dots */
          .hero-section > div:last-of-type:not(.swiper) {
            display: none !important;
          }
        }
      `}</style>
    </main>
  )
}

/* ══════════════════════════════════════════
   CONTINUE WATCHING SECTION COMPONENT
   ══════════════════════════════════════════ */
function ContinueWatchingSection({ items }: { items: ContinueWatchingItem[] }) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
  }

  return (
    <section className="content-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-title-accent" />
          <History style={{ width: 18, height: 18, color: '#FFB733' }} />
          Continue Watching
        </h2>
        <Link href="/profile" className="section-view-all">
          History <ChevronRight style={{ width: 15, height: 15 }} />
        </Link>
      </div>

      <div className="movie-scroll-row">
        {items.map(({ movie, progress_seconds, duration_minutes, progress_percent }) => (
          <Link
            key={movie.id}
            href={`/watch/${movie.slug}?t=${progress_seconds}`}
            style={{ textDecoration: 'none', width: 300 }}
          >
            <div className="movie-card-wrapper" style={{ position: 'relative' }}>
              <div className="movie-card" style={{ aspectRatio: '16/9' }}>
                <Image
                  src={movie.backdrop_url || movie.poster_url || '/placeholder-wide.jpg'}
                  alt={movie.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
                {/* Progress bar */}
                <div className="movie-card-progress">
                  <div
                    className="movie-card-progress-bar"
                    style={{ width: `${progress_percent}%` }}
                  />
                </div>
                {/* Play overlay */}
                <div
                  className="continue-play-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                  }}
                >
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 40px rgba(255,98,0,0.6)',
                  }}>
                    <Play style={{ width: 24, height: 24, fill: 'white', color: 'white', marginLeft: 3 }} />
                  </div>
                </div>
              </div>
              <div className="movie-card-info">
                <p className="movie-card-title">{movie.title}</p>
                <div className="movie-card-meta">
                  <span style={{ color: 'var(--brand-gold)', fontWeight: 600 }}>
                    {formatTime(progress_seconds)} / {duration_minutes}m
                  </span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{Math.round(progress_percent)}% complete</span>
                </div>
              </div>
            </div>
            <style jsx>{`
              .movie-card-wrapper:hover .continue-play-overlay {
                opacity: 1 !important;
              }
            `}</style>
          </Link>
        ))}
      </div>
    </section>
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