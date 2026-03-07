// src/app/(main)/series/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Your Supabase has ONE table called `movies` for all content.
//       There is NO separate `series` table.
//       This page queries `movies` and you can distinguish series by adding
//       an `is_series` boolean column in Supabase (ALTER TABLE movies ADD COLUMN
//       is_series boolean DEFAULT false), or just show all published content here.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Clock, Play, Tv, Flame, Sparkles } from 'lucide-react'
import type { Movie } from '@/types'

const ALL_GENRES = ['All','Action','Comedy','Drama','Horror','Romance','Sci-Fi','Thriller','Mystery','Adventure','Documentary','Fantasy','Crime']

export default function SeriesPage() {
  const [series,      setSeries]      = useState<Movie[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<'all'|'featured'|'trending'>('all')
  const [genreFilter, setGenreFilter] = useState('All')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => { loadSeries() }, [filter, genreFilter])

  const loadSeries = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('movies')          // ← your only content table
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (filter === 'featured') query = query.eq('is_featured', true)
      if (filter === 'trending') query = query.eq('is_trending', true)
      if (genreFilter !== 'All') query = query.contains('genre', [genreFilter])

      const { data, error } = await query
      if (error) {
        console.error('[SeriesPage]', error.message)
        setSeries([])
        return
      }

      // If you later add `is_series` column, this will auto-filter.
      // Until then it shows all published movies (no blank page).
      const rows = data ?? []
      const hasIsSeriesCol = rows.length > 0 && 'is_series' in rows[0]
      setSeries(hasIsSeriesCol ? rows.filter((m: any) => m.is_series) : rows)
    } catch (err: any) {
      console.error('[SeriesPage]', err?.message ?? err)
      setSeries([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="page-banner-gradient" />
        <div style={{ position: 'absolute', top: '50%', left: '-5%', width: 420, height: 420, background: 'radial-gradient(circle, var(--glow-sm) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="page-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px var(--glow-sm)' }}>
              <Tv style={{ width: 20, height: 20, color: 'white' }} />
            </div>
            <h1 className="page-hero-title" style={{ margin: 0 }}>
              <span className="gradient-text">All</span> Series
            </h1>
          </div>
          <p className="page-hero-sub">
            {!loading && series.length > 0 ? `${series.length} series available` : 'Binge-worthy shows await'}
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {([
              { id: 'all',      label: 'All Series', icon: null },
              { id: 'featured', label: 'Featured',   icon: <Sparkles style={{ width: 13, height: 13 }} /> },
              { id: 'trending', label: 'Trending',   icon: <Flame    style={{ width: 13, height: 13 }} /> },
            ] as const).map(({ id, label, icon }) => (
              <button key={id} onClick={() => setFilter(id)} className={`filter-pill${filter === id ? ' active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {icon}{label}
              </button>
            ))}
          </div>

          <div className="filter-bar">
            {ALL_GENRES.map(g => (
              <button key={g} onClick={() => setGenreFilter(g)} className={`filter-pill${genreFilter === g ? ' active' : ''}`}>{g}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: '4rem' }}>
        {loading ? <LoadingGrid /> : series.length === 0 ? <EmptyState /> : (
          <div className="movie-grid">
            {series.map(s => <SeriesCard key={s.id} serie={s} />)}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

function SeriesCard({ serie }: { serie: Movie }) {
  return (
    <Link href={`/watch/${serie.slug}`} style={{ textDecoration: 'none' }}>
      <div className="movie-card-wrapper">
        <div className="movie-card">
          <Image src={serie.poster_url || '/placeholder-poster.jpg'} alt={serie.title} fill style={{ objectFit: 'cover' }} unoptimized />
          <div className="movie-play-btn">
            <Play style={{ width: 18, height: 18, fill: 'white', color: 'white', marginLeft: 2 }} />
          </div>
          <div className="movie-overlay">
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {serie.genre?.slice(0, 2).map(g => <span key={g} className="badge badge-fire">{g}</span>)}
            </div>
          </div>
          <div className="card-badge-group">
            {serie.is_featured && <span className="badge badge-fire">Featured</span>}
            {serie.is_trending && <span className="badge badge-dim" style={{ background: 'rgba(255,69,0,0.22)', borderColor: 'rgba(255,69,0,0.4)', color: '#FF8C69' }}>🔥 Hot</span>}
          </div>
          <div style={{ position: 'absolute', bottom: '0.6rem', right: '0.6rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            SERIES
          </div>
        </div>
        <div className="movie-card-info">
          <p className="movie-card-title">{serie.title}</p>
          <div className="movie-card-meta">
            <span>{serie.release_year}</span>
            {serie.duration_minutes && <><span style={{ opacity: 0.4 }}>·</span><span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Clock style={{ width: 10, height: 10 }} />{serie.duration_minutes}m</span></>}
            {(serie.admin_rating || serie.rating) && <><span style={{ opacity: 0.4 }}>·</span><span className="movie-card-rating"><Star style={{ width: 10, height: 10, fill: 'currentColor' }} />{serie.admin_rating || serie.rating}</span></>}
          </div>
        </div>
      </div>
    </Link>
  )
}

function LoadingGrid() {
  return (
    <div className="movie-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 0 }} />
          <div style={{ padding: '0.8rem', background: 'var(--bg-card)' }}>
            <div className="skeleton" style={{ height: 14, width: '75%', marginBottom: 8, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 11, width: '50%', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: 'clamp(4rem, 10vh, 7rem) 1rem' }}>
      <div style={{ width: 70, height: 70, borderRadius: 18, background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px var(--glow-md)' }}>
        <Tv style={{ width: 32, height: 32, color: 'white' }} />
      </div>
      <h2 style={{ fontFamily: 'Bebas Neue', fontSize: 'clamp(1.8rem,5vw,2.8rem)', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>No Series Found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Try adjusting the filters or check back later.</p>
      <Link href="/movies"><button className="btn-fire">Browse Movies Instead</button></Link>
    </div>
  )
}