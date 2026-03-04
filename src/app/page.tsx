// src/app/page.tsx

import { Navigation } from '@/components/layout/Navigation'
import { HeroSection } from '@/components/layout/HeroSection'
import { MovieCarousel } from '@/components/movies/MovieCarousel'
import { Footer } from '@/components/layout/Footer'
import { AIChatbot } from '@/components/ai/AIChatbot'
import type { Movie } from '@/types'

const sampleMovies: Movie[] = [
  {
    id: '1',
    slug: 'asur',
    title: 'Asur',
    description: 'A gripping psychological thriller that delves into the dark minds of serial killers.',
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
    release_year: 2024,
    duration_minutes: 145,
    rating: 8.9,
    genre: ['Thriller', 'Mystery'],
    language: 'Hindi',
    is_featured: true,
    is_trending: true,
    is_published: true,
    view_count: 10000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    slug: 'echoes-of-tomorrow',
    title: 'Echoes of Tomorrow',
    description: 'A sci-fi epic about humanity\'s first contact with an alien civilization.',
    poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
    release_year: 2024,
    duration_minutes: 168,
    rating: 9.1,
    genre: ['Sci-Fi', 'Drama'],
    language: 'English',
    is_featured: true,
    is_trending: true,
    is_published: true,
    view_count: 15000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    slug: 'predictor',
    title: 'Predictor',
    description: 'A data scientist discovers he can predict crimes before they happen.',
    poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500',
    release_year: 2024,
    duration_minutes: 132,
    rating: 8.7,
    genre: ['Sci-Fi', 'Thriller'],
    language: 'English',
    is_featured: true,
    is_trending: false,
    is_published: true,
    view_count: 8000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    slug: '12-am',
    title: '12 AM',
    description: 'When midnight strikes, secrets emerge from the shadows.',
    poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500',
    release_year: 2024,
    duration_minutes: 118,
    rating: 8.1,
    genre: ['Horror', 'Thriller'],
    language: 'Hindi',
    is_featured: false,
    is_trending: true,
    is_published: true,
    view_count: 12000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    slug: 'rudrapur',
    title: 'Rudrapur',
    description: 'A tale of power, politics, and redemption in rural India.',
    poster_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500',
    release_year: 2024,
    duration_minutes: 156,
    rating: 8.5,
    genre: ['Drama', 'Action'],
    language: 'Hindi',
    is_featured: false,
    is_trending: true,
    is_published: true,
    view_count: 9500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    slug: 'niladri',
    title: 'Niladri',
    description: 'An emotional journey of self-discovery in the hills of Bengal.',
    poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
    release_year: 2023,
    duration_minutes: 142,
    rating: 8.3,
    genre: ['Drama', 'Romance'],
    language: 'Bengali',
    is_featured: false,
    is_trending: false,
    is_published: true,
    view_count: 5000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    slug: 'shadow-protocol',
    title: 'Shadow Protocol',
    description: 'An elite spy must uncover a conspiracy that threatens global security.',
    poster_url: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500',
    release_year: 2024,
    duration_minutes: 138,
    rating: 8.4,
    genre: ['Action', 'Thriller'],
    language: 'English',
    is_featured: false,
    is_trending: false,
    is_published: true,
    view_count: 7500,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '8',
    slug: 'the-last-kingdom',
    title: 'The Last Kingdom',
    description: 'An epic tale of warriors fighting for their homeland.',
    poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500',
    release_year: 2024,
    duration_minutes: 165,
    rating: 8.8,
    genre: ['Action', 'Adventure'],
    language: 'English',
    is_featured: false,
    is_trending: false,
    is_published: true,
    view_count: 11000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export default function HomePage() {
  const featured = sampleMovies.filter(m => m.is_featured)
  const trending = sampleMovies.filter(m => m.is_trending)
  const thrillers = sampleMovies.filter(m => m.genre.includes('Thriller'))
  const scifi = sampleMovies.filter(m => m.genre.includes('Sci-Fi'))

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      <Navigation />
      <HeroSection />
      
      <div style={{ position: 'relative', zIndex: 10, marginTop: '-8rem' }}>
        <MovieCarousel title="✨ Featured Collection" movies={featured} variant="featured" />
        <MovieCarousel title="🔥 Trending Now" movies={trending} />
        <MovieCarousel title="🎬 New Releases" movies={sampleMovies} />
        {thrillers.length > 0 && (
          <MovieCarousel title="🎭 Thriller & Mystery" movies={thrillers} />
        )}
        {scifi.length > 0 && (
          <MovieCarousel title="🚀 Sci-Fi Adventures" movies={scifi} />
        )}
      </div>
      
      <Footer />
      <AIChatbot />
    </main>
  )
}