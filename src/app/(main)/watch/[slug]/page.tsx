// src/app/(main)/watch/[slug]/page.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft, Heart, Share2, Star, Clock, Calendar,
  Globe, Eye, User, Play, Film, Sparkles
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'

interface Actor {
  id: string
  name: string
  image_url: string | null
  character_name?: string | null
}

interface Movie {
  id: string
  title: string
  slug: string
  description: string | null
  youtube_id: string | null
  youtube_url: string | null
  poster_url: string | null
  backdrop_url: string | null
  release_year: number | null
  duration_minutes: number | null
  language: string | null
  director: string | null
  actors: string[] | null
  genre: string[] | null
  rating: number | null
  admin_rating: number | null
  view_count: number | null
  is_published: boolean
}

interface SimilarMovie {
  id: string
  title: string
  slug: string
  poster_url: string | null
  backdrop_url: string | null
  release_year: number | null
  admin_rating: number | null
  rating: number | null
  genre: string[] | null
}

export default function WatchPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params?.slug as string
  const startTime = searchParams?.get('t')
  const supabase = createSupabaseBrowserClient()

  const [movie, setMovie] = useState<Movie | null>(null)
  const [actors, setActors] = useState<Actor[]>([])
  const [similar, setSimilar] = useState<SimilarMovie[]>([])
  const [moreMovies, setMoreMovies] = useState<SimilarMovie[]>([])
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewTracked, setViewTracked] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playerRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (slug) load()
    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [slug])

  // Save progress periodically
  useEffect(() => {
    if (!movie) return

    progressTimerRef.current = setInterval(() => {
      saveProgress()
    }, 15000) // Save every 15 seconds

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      saveProgress() // Save on unmount
    }
  }, [movie, currentTime])

  const saveProgress = async () => {
    if (!movie || currentTime < 10) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const durationSeconds = (movie.duration_minutes || 120) * 60
    const isCompleted = currentTime >= durationSeconds * 0.95

    await supabase.from('watch_history').upsert({
      user_id: user.id,
      movie_id: movie.id,
      last_watched: new Date().toISOString(),
      progress_seconds: Math.floor(currentTime),
      completed: isCompleted,
    }, { onConflict: 'user_id,movie_id' })
  }

  const load = async () => {
    setLoading(true)
    try {
      const { data: m, error } = await supabase
        .from('movies').select('*').eq('slug', slug).single()
      if (error || !m) { router.push('/movies'); return }
      setMovie(m)

      // Set initial time from URL parameter
      if (startTime) {
        setCurrentTime(parseInt(startTime) || 0)
      }

      // Load actors
      const { data: actorRows } = await supabase
        .from('movie_actors')
        .select('actor_id, character_name, actors(id, name, image_url)')
        .eq('movie_id', m.id).limit(12)
      if (actorRows?.length) {
        setActors(actorRows.map((r: any) => ({
          id: r.actors.id, name: r.actors.name,
          image_url: r.actors.image_url, character_name: r.character_name,
        })))
      }

      // Load similar movies (same genre)
      if (m.genre?.length) {
        const { data: sim } = await supabase
          .from('movies')
          .select('id,title,slug,poster_url,backdrop_url,release_year,admin_rating,rating,genre')
          .eq('is_published', true)
          .contains('genre', [m.genre[0]])
          .neq('id', m.id)
          .limit(8)
        setSimilar(sim ?? [])
      }

      // Load more movies (random selection)
      const { data: more } = await supabase
        .from('movies')
        .select('id,title,slug,poster_url,backdrop_url,release_year,admin_rating,rating,genre')
        .eq('is_published', true)
        .neq('id', m.id)
        .order('view_count', { ascending: false })
        .limit(12)
      setMoreMovies(more ?? [])

      // Check favorites
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: fav } = await supabase.from('favorites')
          .select('id').eq('user_id', user.id).eq('movie_id', m.id).maybeSingle()
        setIsFav(!!fav)
      }

      // Track view after 30 seconds
      viewTimerRef.current = setTimeout(() => trackView(m.id), 30_000)
    } finally { setLoading(false) }
  }

  const trackView = async (movieId: string) => {
    if (viewTracked) return
    setViewTracked(true)
    try {
      const { error: rpcErr } = await supabase.rpc('increment_view_count', { movie_id: movieId })
      if (rpcErr) throw rpcErr
    } catch {
      const { data } = await supabase.from('movies').select('view_count').eq('id', movieId).single()
      await supabase.from('movies').update({ view_count: (data?.view_count || 0) + 1 }).eq('id', movieId)
    }
  }

  const toggleFav = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !movie) return
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('movie_id', movie.id)
      setIsFav(false)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, movie_id: movie.id })
      setIsFav(true)
    }
  }

  const getEmbed = (m: Movie) => {
    let videoId = m.youtube_id
    if (!videoId && m.youtube_url) {
      const match = m.youtube_url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
      if (match) videoId = match[1]
    }
    if (!videoId) return null

    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      modestbranding: '1',
      ...(startTime ? { start: startTime } : {}),
    })
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading Film</p>
      </div>
    )
  }
  if (!movie) return null

  const embedUrl = getEmbed(movie)
  const displayRating = movie.admin_rating || movie.rating

  return (
    <div className="watch-page">
      <Navigation />

      {/* ════════════════════════════════
          VIDEO PLAYER SECTION
          ════════════════════════════════ */}
      <section className="watch-player-section">
        <div className="watch-player-inner">
          {embedUrl ? (
            <div className="video-wrapper">
              <iframe
                ref={playerRef}
                src={embedUrl}
                title={movie.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div className="video-wrapper" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
            }}>
              {movie.poster_url && (
                <div style={{ position: 'absolute', inset: 0, opacity: 0.15 }}>
                  <Image src={movie.poster_url} alt="" fill style={{ objectFit: 'cover' }} />
                </div>
              )}
              <div style={{
                position: 'relative',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255,98,0,0.1)',
                border: '1px solid rgba(255,98,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Eye style={{ width: 26, height: 26, color: 'var(--brand-core)', opacity: 0.5 }} />
              </div>
              <p style={{ position: 'relative', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No video available
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════
          CONTENT AREA
          ════════════════════════════════ */}
      <div className="watch-content">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="btn-ghost watch-back-btn"
        >
          <ArrowLeft style={{ width: 13, height: 13 }} /> Back
        </button>

        {/* Title + actions */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}>
          <div>
            <h1 className="watch-title">{movie.title}</h1>

            <div className="watch-meta-row">
              {movie.release_year && (
                <span className="watch-meta-item">
                  <Calendar style={{ width: 12, height: 12 }} />
                  {movie.release_year}
                </span>
              )}
              {movie.duration_minutes && (
                <span className="watch-meta-item">
                  <Clock style={{ width: 12, height: 12 }} />
                  {movie.duration_minutes} min
                </span>
              )}
              {movie.language && (
                <span className="watch-meta-item">
                  <Globe style={{ width: 12, height: 12 }} />
                  {movie.language}
                </span>
              )}
              {displayRating && (
                <span className="watch-meta-item watch-rating">
                  <Star style={{ width: 12, height: 12, fill: '#FFB733', color: '#FFB733' }} />
                  {displayRating}/10
                </span>
              )}
              {movie.view_count !== null && (
                <span className="watch-meta-item">
                  <Eye style={{ width: 12, height: 12 }} />
                  {(movie.view_count || 0).toLocaleString()} views
                </span>
              )}
            </div>
          </div>

          <div className="watch-actions">
            <button onClick={toggleFav} className="watch-action-btn" style={{
              background: isFav ? 'rgba(248,113,113,0.1)' : undefined,
              borderColor: isFav ? 'rgba(248,113,113,0.3)' : undefined,
            }}>
              <Heart style={{
                width: 16, height: 16,
                fill: isFav ? '#f87171' : 'none',
                color: isFav ? '#f87171' : 'var(--text-muted)',
              }} />
            </button>
            <button
              onClick={() => navigator.share?.({ title: movie.title, url: window.location.href })}
              className="watch-action-btn"
            >
              <Share2 style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* Genres */}
        {movie.genre?.length ? (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {movie.genre.map(g => <span key={g} className="badge badge-fire">{g}</span>)}
          </div>
        ) : null}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '1.5rem 0' }} />

        {/* Description */}
        {movie.description && (
          <p style={{
            color: 'var(--text-secondary)',
            lineHeight: 1.8,
            fontSize: '0.93rem',
            marginBottom: '2rem',
            maxWidth: 740,
          }}>
            {movie.description}
          </p>
        )}

        {/* Director */}
        {movie.director && (
          <div style={{ marginBottom: '2rem' }}>
            <p style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '0.3rem',
            }}>Director</p>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{movie.director}</p>
          </div>
        )}

        {/* Cast */}
        {(actors.length > 0 || (movie.actors && movie.actors.length > 0)) && (
          <div style={{ marginBottom: '3rem' }}>
            <SectionHeading icon={<User style={{ width: 14, height: 14 }} />}>Cast</SectionHeading>
            {actors.length > 0 ? (
              <div style={{
                display: 'flex',
                gap: '1.2rem',
                overflowX: 'auto',
                paddingBottom: '0.75rem',
              }}>
                {actors.map(actor => (
                  <div key={actor.id} style={{ flexShrink: 0, width: 96, textAlign: 'center' }}>
                    <div style={{
                      width: 78,
                      height: 78,
                      borderRadius: '50%',
                      margin: '0 auto 0.55rem',
                      overflow: 'hidden',
                      border: '2px solid var(--glass-border)',
                      background: 'var(--bg-elevated)',
                    }}>
                      {actor.image_url ? (
                        <Image
                          src={actor.image_url}
                          alt={actor.name}
                          width={78}
                          height={78}
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          unoptimized
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <User style={{ width: 28, height: 28, color: 'var(--text-muted)' }} />
                        </div>
                      )}
                    </div>
                    <p style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                    }}>{actor.name}</p>
                    {actor.character_name && (
                      <p style={{
                        fontSize: '0.67rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.1rem',
                      }}>{actor.character_name}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {movie.actors?.map(name => (
                  <span key={name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.32rem 0.8rem',
                    borderRadius: 9999,
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}>
                    <User style={{ width: 11, height: 11 }} /> {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Similar Movies (You May Also Like) */}
        {similar.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <SectionHeading icon={<Sparkles style={{ width: 14, height: 14, color: '#FFB733' }} />}>
              You May Also Like
            </SectionHeading>
            <div className="movie-scroll-row">
              {similar.map((m: SimilarMovie) => (
                <MovieCardSmall key={m.id} movie={m} />
              ))}
            </div>
          </div>
        )}

        {/* More Movies */}
        {moreMovies.length > 0 && (
          <div>
            <SectionHeading icon={<Film style={{ width: 14, height: 14 }} />}>
              More Movies
            </SectionHeading>
            <div className="movie-scroll-row">
              {moreMovies.filter(m => !similar.find(s => s.id === m.id)).slice(0, 10).map((m: SimilarMovie) => (
                <MovieCardSmall key={m.id} movie={m} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

/* ── Section Heading Component ── */
function SectionHeading({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h3 className="watch-section-heading">
      <span className="watch-section-bar" />
      {icon}
      {children}
    </h3>
  )
}

/* ── Small Movie Card Component ── */
function MovieCardSmall({ movie }: { movie: SimilarMovie }) {
  return (
    <Link
      href={`/watch/${movie.slug}`}
      style={{ textDecoration: 'none', width: 180 }}
    >
      <div className="movie-card-wrapper">
        <div className="movie-card" style={{ aspectRatio: '16/9' }}>
          <Image
            src={movie.backdrop_url || movie.poster_url || '/placeholder-wide.jpg'}
            alt={movie.title}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)',
            opacity: 0,
            transition: 'opacity 0.3s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }} className="hover-overlay">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255,98,0,0.5)',
            }}>
              <Play style={{ width: 18, height: 18, fill: 'white', color: 'white', marginLeft: 2 }} />
            </div>
          </div>
        </div>
        <div className="movie-card-info">
          <p className="movie-card-title" style={{ fontSize: '0.78rem' }}>{movie.title}</p>
          <div className="movie-card-meta">
            {movie.release_year && <span>{movie.release_year}</span>}
            {(movie.admin_rating || movie.rating) && (
              <>
                <span style={{ opacity: 0.4 }}>·</span>
                <span className="movie-card-rating">
                  <Star style={{ width: 9, height: 9, fill: 'currentColor' }} />
                  {movie.admin_rating || movie.rating}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .movie-card-wrapper:hover .hover-overlay { opacity: 1 !important; }
      `}</style>
    </Link>
  )
}