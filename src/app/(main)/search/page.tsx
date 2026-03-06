// src/app/(main)/search/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Star, Play, Film, X } from 'lucide-react'
import type { Movie } from '@/types'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [query,      setQuery]      = useState(searchParams.get('q') || '')
  const [results,    setResults]    = useState<{ type: 'movie' | 'series'; item: Movie }[]>([])
  const [loading,    setLoading]    = useState(false)
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => { if (query) doSearch(query) }, [query, typeFilter])

  const doSearch = async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const [{ data: movies }, { data: series }] = await Promise.all([
        typeFilter !== 'series'
          ? supabase.from('movies').select('*').or(`title.ilike.%${q}%,description.ilike.%${q}%`).limit(20)
          : Promise.resolve({ data: [] }),
        typeFilter !== 'movie'
          ? supabase.from('series').select('*').or(`title.ilike.%${q}%,description.ilike.%${q}%`).limit(20)
          : Promise.resolve({ data: [] }),
      ])
      setResults([
        ...(movies  || []).map(m => ({ type: 'movie'  as const, item: m         })),
        ...(series  || []).map(s => ({ type: 'series' as const, item: s as Movie })),
      ])
    } catch (err) {
      console.error(err); setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      <main style={{ maxWidth: 1300, margin: '0 auto', padding: 'clamp(5rem, 12vh, 7rem) clamp(1rem, 4vw, 2.5rem) 4rem', color: 'var(--text-primary)' }}>

        {/* Search bar */}
        <div style={{ maxWidth: 680, margin: '0 auto 2.5rem', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(2rem, 6vw, 3.5rem)', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
            <span className="gradient-text">Search</span> Cinema
          </h1>

          <form onSubmit={handleSubmit}>
            <div className="search-bar">
              <Search style={{ width: 18, height: 18, color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                className="search-input"
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search movies, series, genres…"
                autoFocus
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setResults([]) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <X size={16} />
                </button>
              )}
              <button type="submit" className="btn-fire" style={{ padding: '0.5rem 1.2rem', fontSize: '0.875rem', flexShrink: 0 }}>
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Type filter */}
        <div className="filter-bar" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          {(['all', 'movie', 'series'] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} className={`filter-pill${typeFilter === f ? ' active' : ''}`}>
              {f === 'all' ? 'All' : f === 'movie' ? '🎬 Movies' : '📺 Series'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <div className="loading-ring" style={{ margin: '0 auto 1rem' }} />
            <p className="loading-text">Searching…</p>
          </div>
        )}

        {/* No results */}
        {!loading && results.length === 0 && query && (
          <div style={{ textAlign: 'center', padding: 'clamp(3rem, 8vh, 6rem) 1rem' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Search style={{ width: 28, height: 28, color: 'var(--brand-gold)', opacity: 0.7 }} />
            </div>
            <h2 style={{ fontFamily: 'Bebas Neue', fontSize: '2rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>No Results</h2>
            <p style={{ color: 'var(--text-muted)' }}>Nothing found for "<strong style={{ color: 'var(--text-secondary)' }}>{query}</strong>". Try different keywords.</p>
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1.5rem' }}>
              <span className="section-title-bar" />
              <h2 className="section-title">
                <span className="gradient-text">{results.length}</span> Results for "{query}"
              </h2>
            </div>

            <div className="movie-grid">
              {results.map(({ type, item }) => (
                <Link key={`${type}-${item.id}`} href={`/watch/${item.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="movie-card-wrapper">
                    <div className="movie-card">
                      <Image src={item.poster_url || '/placeholder-poster.jpg'} alt={item.title} fill style={{ objectFit: 'cover' }} unoptimized />
                      <div className="movie-play-btn">
                        <Play style={{ width: 18, height: 18, fill: 'white', color: 'white', marginLeft: 2 }} />
                      </div>
                      <div className="card-badge-group">
                        <span className="badge badge-dim" style={{ textTransform: 'uppercase' }}>
                          {type === 'movie' ? '🎬' : '📺'} {type}
                        </span>
                      </div>
                    </div>
                    <div className="movie-card-info">
                      <p className="movie-card-title">{item.title}</p>
                      <div className="movie-card-meta">
                        <span>{item.release_year}</span>
                        {item.rating && (
                          <><span style={{ opacity: 0.4 }}>·</span><span className="movie-card-rating"><Star style={{ width: 10, height: 10, fill: 'currentColor' }} />{item.rating}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty initial state */}
        {!loading && !query && (
          <div style={{ textAlign: 'center', padding: 'clamp(3rem, 8vh, 6rem) 1rem' }}>
            <Film style={{ width: 56, height: 56, color: 'var(--text-dim)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Type something to search the library</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}