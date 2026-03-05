// src/app/(main)/search/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Star, Clock, Play, Loader2 } from 'lucide-react'
import type { Movie } from '@/types'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState<{ type: 'movie' | 'series'; item: Movie }[]>([])
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (query) search(query)
  }, [query, typeFilter])

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      let movieQuery = supabase
        .from('movies')
        .select('*')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)

      let seriesQuery = supabase
        .from('series')
        .select('*')
        .or(`title.ilike.%${q}%,description.ilike.%${q}%`)

      if (typeFilter !== 'all') {
        if (typeFilter === 'movie') seriesQuery = seriesQuery.limit(0)
        else movieQuery = movieQuery.limit(0)
      }

      const [{ data: movies }, { data: series }] = await Promise.all([movieQuery, seriesQuery])

      const combined = [
        ...(movies || []).map(m => ({ type: 'movie' as const, item: m })),
        ...(series || []).map(s => ({ type: 'series' as const, item: s as Movie })) // Cast if same shape
      ].slice(0, 20)

      setResults(combined)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      <Navigation />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '100px 2rem 2rem', color: 'white' }}>
        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', maxWidth: '600px', margin: '0 auto', gap: '1rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', width: 20, height: 20 }} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search movies, series..."
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  borderRadius: '50px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '1rem 2rem',
                borderRadius: '50px',
                background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            >
              Search
            </button>
          </div>
        </form>

        {/* Type Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {(['all', 'movie', 'series'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              style={{
                padding: '0.5rem 1.5rem',
                borderRadius: '25px',
                background: typeFilter === f ? 'linear-gradient(135deg, #8b5cf6, #a78bfa)' : 'rgba(255,255,255,0.05)',
                color: typeFilter === f ? 'white' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 style={{ width: 50, height: 50, color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.5)' }}>Searching...</p>
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
            <Play style={{ width: 64, height: 64, opacity: 0.5, margin: '0 auto 1rem' }} />
            <h2>No results found for "{query}"</h2>
            <p>Try different keywords or check spelling.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>{results.length} Results</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
              {results.map(({ type, item }) => (
                <Link key={item.id} href={`/${type}s/${item.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'
                    e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ position: 'relative', aspectRatio: '2/3' }}>
                      <Image src={item.poster_url || '/placeholder.jpg'} alt={item.title} fill style={{ objectFit: 'cover' }} unoptimized />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '1rem', color: 'white' }}>
                        <span style={{ background: 'rgba(139,92,246,0.8)', padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>{type}</span>
                      </div>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <h3 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>{item.title}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                        <span>{item.release_year}</span>
                        <span>★ {item.rating || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}