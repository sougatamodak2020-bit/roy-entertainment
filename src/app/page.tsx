'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { AIChatbot } from '@/components/ai/AIChatbot'
import MovieCard from '@/components/movies/MovieCard'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation as SwiperNavigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'
import { Play, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'

export default function HomePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [featured, setFeatured] = useState<any[]>([])
  const [trending, setTrending] = useState<any[]>([])
  const [newReleases, setNewReleases] = useState<any[]>([])
  const [continueWatching, setContinueWatching] = useState<any[]>([])
  const [genreSections, setGenreSections] = useState<{ title: string; movies: any[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    try {
      const { data: allMovies, error: moviesError } = await supabase
        .from('movies')
        .select('*')
        .eq('is_published', true)
        .limit(60)

      if (moviesError) throw moviesError
      if (!allMovies?.length) return

      setFeatured(allMovies.filter(m => m.is_featured).slice(0, 12))

      setTrending(
        allMovies
          .filter(m => (m.admin_rating || 0) >= 7 || (m.view_count || 0) > 5000)
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 12)
      )

      setNewReleases(
        [...allMovies].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 12)
      )

      const popularGenres = ['Thriller', 'Sci-Fi', 'Action', 'Drama', 'Horror']
      const sections = popularGenres
        .map(genre => ({
          title: `${genre} Collection`,
          movies: allMovies.filter(m => m.genre?.includes(genre)).slice(0, 10)
        }))
        .filter(s => s.movies.length > 0)

      setGenreSections(sections)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: progress } = await supabase
          .from('watch_history')
          .select('*, movie:movies(*)')
          .eq('user_id', user.id)
          .neq('completed', true)
          .order('last_watched', { ascending: false })
          .limit(10)

        const watching = progress
          ?.filter(p => p.movie && p.progress_seconds < (p.movie.duration_minutes * 60 || Infinity))
          ?.map(p => p.movie) ?? []

        setContinueWatching(watching)
      }
    } catch (err) {
      console.error('Error loading homepage data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-[#c026d3] animate-spin" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <Navigation />

      {/* Hero Carousel */}
      <section className="hero-section relative h-[70vh] min-h-[500px]">
        <Swiper
          modules={[Autoplay, Pagination, SwiperNavigation]}
          spaceBetween={0}
          slidesPerView={1}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation
          loop
          className="h-full"
        >
          {trending.slice(0, 3).map(movie => (
            <SwiperSlide key={movie.id}>
              <div className="relative h-full">
                <Image
                  src={movie.backdrop_url || movie.poster_url || '/placeholder-wide.jpg'}
                  alt={movie.title}
                  fill
                  className="object-cover brightness-50"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center px-6 md:px-12">
                  <div className="max-w-5xl text-center text-white">
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 gradient-text animate-fade-up">
                      {movie.title}
                    </h1>
                    <p className="text-lg md:text-2xl mb-10 line-clamp-3 max-w-4xl mx-auto">
                      {movie.description || 'A cinematic masterpiece from Roy Entertainment'}
                    </p>
                    <Link href={`/watch/${movie.slug}`}>
                      <button className="inline-flex items-center gap-4 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] hover:from-[#9f1eb8] hover:to-[#6b21a8] text-white px-10 py-5 rounded-full text-xl font-bold transition-all hover:scale-105 shadow-2xl">
                        <Play className="w-7 h-7 fill-white" />
                        Watch Now
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      <div className="relative z-10 -mt-20 md:-mt-32 pb-20">
        {continueWatching.length > 0 && (
          <section className="home-section">
            <h2 className="home-section-title container">Continue Watching</h2>
            <div className="movie-grid container">
              {continueWatching.map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} priority={idx < 4} />
              ))}
            </div>
          </section>
        )}

        {featured.length > 0 && (
          <section className="home-section">
            <h2 className="home-section-title container">✨ Featured Collection</h2>
            <div className="movie-grid container">
              {featured.map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} priority={idx < 4} />
              ))}
            </div>
          </section>
        )}

        {trending.length > 0 && (
          <section className="home-section">
            <h2 className="home-section-title container">🔥 Trending Now</h2>
            <div className="movie-grid container">
              {trending.map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} priority={idx < 4} />
              ))}
            </div>
          </section>
        )}

        {newReleases.length > 0 && (
          <section className="home-section">
            <h2 className="home-section-title container">🎬 New Releases</h2>
            <div className="movie-grid container">
              {newReleases.map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} priority={idx < 4} />
              ))}
            </div>
          </section>
        )}

        {genreSections.map((section, idx) => (
          <section key={idx} className="home-section">
            <h2 className="home-section-title container">{section.title}</h2>
            <div className="movie-grid container">
              {section.movies.map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} priority={idx < 4} />
              ))}
            </div>
          </section>
        ))}

        {featured.length === 0 && trending.length === 0 && newReleases.length === 0 && (
          <div className="text-center py-32 px-6 text-[#a0a0cc]">
            <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">Welcome to Roy Entertainment</h2>
            <p className="text-xl">Upload some movies in the admin panel to populate the homepage.</p>
          </div>
        )}
      </div>

      <Footer />
      <AIChatbot />
    </main>
  )
}