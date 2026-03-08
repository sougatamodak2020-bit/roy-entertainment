// src/app/admin/analytics/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  BarChart3, TrendingUp, Eye, Star, Users, Film, Tv, Upload,
  Settings, Home, LogOut, Menu, X, RefreshCw, ArrowUp, ArrowDown,
  Loader2, CheckCircle, Calendar, Clock, Globe, Zap, Activity,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

/* ── Types ── */
interface AnalyticsData {
  totalMovies: number
  totalSeries: number
  totalUsers: number
  totalViews: number
  publishedMovies: number
  publishedSeries: number
  featuredMovies: number
  trendingMovies: number
  pendingMovies: number
  avgRating: number
  topMovies: TopItem[]
  topSeries: TopItem[]
  recentActivity: ActivityItem[]
  viewsByLanguage: LangStat[]
  genreStats: GenreStat[]
  monthlyViews: MonthStat[]
}

interface TopItem {
  id: string
  title: string
  poster_url: string | null
  view_count: number
  rating: number
  genre: string[]
  language: string | null
}

interface ActivityItem {
  id: string
  title: string
  action: string
  created_at: string
  type: 'movie' | 'series'
}

interface LangStat { language: string; count: number; views: number }
interface GenreStat { genre: string; count: number }
interface MonthStat { month: string; views: number; uploads: number }

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin',          icon: BarChart3,  },
  { label: 'Movies',    href: '/admin/movies',    icon: Film        },
  { label: 'Series',    href: '/admin/series',    icon: Tv          },
  { label: 'Upload',    href: '/admin/upload',    icon: Upload      },
  { label: 'Users',     href: '/admin/users',     icon: Users       },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp, active: true },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings    },
]

const RANGES = ['7d', '30d', '90d', 'all'] as const
type Range = typeof RANGES[number]

export default function AdminAnalyticsPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [loading,      setLoading]      = useState(true)
  const [data,         setData]         = useState<AnalyticsData | null>(null)
  const [range,        setRange]        = useState<Range>('30d')
  const [liveIndicator,setLive]         = useState(false)
  const [lastUpdated,  setLastUpdated]  = useState<Date>(new Date())
  const channelRef = useRef<any>(null)

  useEffect(() => {
    loadAnalytics()
    setupRealtime()
    return () => { channelRef.current?.unsubscribe() }
  }, [range])

  /* ── Realtime ── */
  const setupRealtime = () => {
    channelRef.current?.unsubscribe()
    channelRef.current = supabase
      .channel('analytics-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movies' }, () => {
        setLive(true); setTimeout(() => setLive(false), 2000)
        loadAnalytics()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        setLive(true); setTimeout(() => setLive(false), 2000)
        loadAnalytics()
      })
      .subscribe()
  }

  /* ── Load ── */
  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const now = new Date()
      let since: Date | null = null
      if (range === '7d')  { since = new Date(now); since.setDate(now.getDate() - 7) }
      if (range === '30d') { since = new Date(now); since.setDate(now.getDate() - 30) }
      if (range === '90d') { since = new Date(now); since.setDate(now.getDate() - 90) }

      let moviesQ = supabase.from('movies').select('id, title, poster_url, view_count, rating, admin_rating, is_published, is_featured, is_trending, language, genre, created_at, uploaded_by')
      if (since) moviesQ = moviesQ.gte('created_at', since.toISOString())
      const { data: movies } = await moviesQ

      let seriesQ = supabase.from('series').select('id, title, poster_url, view_count, rating, admin_rating, is_published, language, genre, created_at')
      const { data: seriesData } = await seriesQ

      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

      const allMovies = movies || []
      const allSeries = seriesData || []

      // Top movies by views
      const topMovies: TopItem[] = [...allMovies]
        .sort((a,b) => (b.view_count||0) - (a.view_count||0))
        .slice(0,5)
        .map(m => ({ id:m.id, title:m.title, poster_url:m.poster_url, view_count:m.view_count||0, rating:m.admin_rating||m.rating||0, genre:m.genre||[], language:m.language }))

      const topSeries: TopItem[] = [...allSeries]
        .sort((a,b) => (b.view_count||0) - (a.view_count||0))
        .slice(0,5)
        .map(s => ({ id:s.id, title:s.title, poster_url:s.poster_url, view_count:s.view_count||0, rating:s.admin_rating||s.rating||0, genre:s.genre||[], language:s.language }))

      // Language stats
      const langMap: Record<string, { count:number; views:number }> = {}
      allMovies.forEach(m => {
        const lang = m.language || 'Unknown'
        if (!langMap[lang]) langMap[lang] = { count:0, views:0 }
        langMap[lang].count++
        langMap[lang].views += m.view_count || 0
      })
      const viewsByLanguage: LangStat[] = Object.entries(langMap)
        .map(([language, { count, views }]) => ({ language, count, views }))
        .sort((a,b) => b.count - a.count)

      // Genre stats
      const genreMap: Record<string, number> = {}
      allMovies.forEach(m => (m.genre||[]).forEach((g: string) => { genreMap[g] = (genreMap[g]||0) + 1 }))
      const genreStats: GenreStat[] = Object.entries(genreMap)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a,b) => b.count - a.count)
        .slice(0,8)

      // Monthly views (simulated from data bucketing)
      const monthMap: Record<string, { views:number; uploads:number }> = {}
      allMovies.forEach(m => {
        const d = new Date(m.created_at)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        if (!monthMap[key]) monthMap[key] = { views:0, uploads:0 }
        monthMap[key].views += m.view_count || 0
        monthMap[key].uploads++
      })
      const monthlyViews: MonthStat[] = Object.entries(monthMap)
        .sort(([a],[b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, { views, uploads }]) => {
          const [yr, mo] = month.split('-')
          const label = new Date(parseInt(yr), parseInt(mo)-1).toLocaleString('default', { month:'short', year:'2-digit' })
          return { month: label, views, uploads }
        })

      // Recent activity
      const recentActivity: ActivityItem[] = allMovies
        .slice(0, 8)
        .map(m => ({ id:m.id, title:m.title, action: m.is_published ? 'Published' : 'Pending', created_at:m.created_at, type:'movie' as const }))

      const published = allMovies.filter(m => m.is_published)
      const totalViews = allMovies.reduce((s,m) => s + (m.view_count||0), 0)
      const ratings = allMovies.filter(m => m.admin_rating || m.rating).map(m => m.admin_rating||m.rating||0)
      const avgRating = ratings.length ? (ratings.reduce((a,b) => a+b, 0) / ratings.length) : 0

      setData({
        totalMovies: allMovies.length,
        totalSeries: allSeries.length,
        totalUsers:  userCount || 0,
        totalViews,
        publishedMovies: published.length,
        publishedSeries: allSeries.filter(s => s.is_published).length,
        featuredMovies:  allMovies.filter(m => m.is_featured).length,
        trendingMovies:  allMovies.filter(m => m.is_trending).length,
        pendingMovies:   allMovies.filter(m => !m.is_published && m.uploaded_by).length,
        avgRating: Math.round(avgRating * 10) / 10,
        topMovies, topSeries, recentActivity, viewsByLanguage, genreStats, monthlyViews,
      })
      setLastUpdated(new Date())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const maxViews = data?.monthlyViews.reduce((m,s) => Math.max(m, s.views), 1) || 1
  const maxGenre = data?.genreStats[0]?.count || 1

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-void)', color:'var(--text-primary)' }}>

      {/* ══ SIDEBAR ══ */}
      <aside style={{ width: sidebarOpen ? 260 : 76, flexShrink:0, background:'rgba(8,8,14,0.98)', borderRight:'1px solid rgba(255,98,0,0.1)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:40, transition:'width 0.3s ease', overflow:'hidden' }}>
        <div style={{ padding:'1.35rem', borderBottom:'1px solid rgba(255,98,0,0.1)', display:'flex', alignItems:'center', gap:'0.75rem', flexShrink:0 }}>
          <div style={{ width:40, height:40, borderRadius:10, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,98,0,0.3)' }}>
            <Image src="/images/logo.jpg" alt="RE" width={40} height={40} style={{ objectFit:'cover', width:'100%', height:'100%' }} />
          </div>
          {sidebarOpen && (
            <div>
              <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1rem', letterSpacing:'0.08em', lineHeight:1 }}>
                <span className="gradient-text">ROY</span>
                <span style={{ color:'rgba(255,255,255,0.4)', marginLeft:4, fontSize:'0.7rem', fontFamily:'Outfit,sans-serif' }}>Admin</span>
              </p>
              <p style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.28)', lineHeight:1 }}>Management Panel</p>
            </div>
          )}
        </div>
        <nav style={{ flex:1, padding:'0.75rem', overflowY:'auto' }}>
          {sidebarLinks.map(({ label, href, icon: Icon, active }) => (
            <Link key={href} href={href} style={{ textDecoration:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.72rem 0.9rem', borderRadius:10, marginBottom:'0.2rem', background: active ? 'rgba(255,98,0,0.14)' : 'transparent', border:`1px solid ${active ? 'rgba(255,140,0,0.3)' : 'transparent'}`, color: active ? '#FFB733' : 'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.88rem', fontWeight:600, transition:'all 0.18s' }}>
                <Icon style={{ width:18, height:18, flexShrink:0 }} />
                {sidebarOpen && <span>{label}</span>}
              </div>
            </Link>
          ))}
        </nav>
        <div style={{ padding:'0.5rem 0.75rem' }}>
          <Link href="/" style={{ textDecoration:'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 0.9rem', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.45)', fontSize:'0.85rem', fontWeight:600 }}>
              <Home style={{ width:17, height:17, flexShrink:0 }} />
              {sidebarOpen && 'Back to Site'}
            </div>
          </Link>
        </div>
        <div style={{ padding:'0.75rem', borderTop:'1px solid rgba(255,98,0,0.08)' }}>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap:'0.65rem', padding:'0.65rem 0.9rem', background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, color:'#f87171', cursor:'pointer', fontSize:'0.85rem', fontWeight:600 }}>
            <LogOut style={{ width:16, height:16 }} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{ flex:1, marginLeft: sidebarOpen ? 260 : 76, transition:'margin-left 0.3s ease', minWidth:0 }}>

        {/* Header */}
        <header style={{ position:'sticky', top:0, zIndex:30, background:'rgba(5,5,7,0.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,98,0,0.1)', padding:'0.9rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <button onClick={() => setSidebarOpen(s => !s)} className="icon-btn">
              {sidebarOpen ? <X style={{ width:18, height:18 }} /> : <Menu style={{ width:18, height:18 }} />}
            </button>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.6rem', letterSpacing:'0.06em', lineHeight:1 }}>
                  <span className="gradient-text">Analytics</span>
                </h1>
                <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', padding:'0.2rem 0.55rem', background: liveIndicator ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${liveIndicator ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius:9999, transition:'all 0.3s' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', animation: liveIndicator ? 'pulse 1s ease infinite' : 'none' }} />
                  <span style={{ fontSize:'0.65rem', fontWeight:700, color: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', letterSpacing:'0.05em' }}>LIVE</span>
                </div>
              </div>
              <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.65rem', alignItems:'center' }}>
            {/* Range selector */}
            <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'0.25rem', gap:'0.2rem' }}>
              {RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)}
                  style={{ padding:'0.35rem 0.75rem', borderRadius:8, border:'none', background: range===r ? 'rgba(255,98,0,0.22)' : 'transparent', color: range===r ? '#FFB733' : 'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.8rem', fontWeight:700, fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>
                  {r === 'all' ? 'All Time' : r}
                </button>
              ))}
            </div>
            <button onClick={loadAnalytics} disabled={loading} className="icon-btn" title="Refresh">
              <RefreshCw style={{ width:16, height:16, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </header>

        {loading && !data ? (
          <div style={{ padding:'4rem', textAlign:'center' }}>
            <Loader2 style={{ width:40, height:40, color:'#FF6200', animation:'spin 1s linear infinite', margin:'0 auto 1rem' }} />
            <p style={{ color:'var(--text-muted)' }}>Loading analytics…</p>
          </div>
        ) : data && (
          <div style={{ padding:'2rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

            {/* ── Top Stats ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem' }}>
              {[
                { label:'Total Movies',   value: data.totalMovies,   icon: Film,      color:'#FF8C00', sub:`${data.publishedMovies} published`    },
                { label:'Total Series',   value: data.totalSeries,   icon: Tv,        color:'#38BDF8', sub:`${data.publishedSeries} published`    },
                { label:'Total Users',    value: data.totalUsers,    icon: Users,     color:'#A78BFA', sub:'Registered accounts'                   },
                { label:'Total Views',    value: data.totalViews >= 1000 ? `${(data.totalViews/1000).toFixed(1)}K` : data.totalViews, icon: Eye, color:'#4ADE80', sub:'Across all content' },
                { label:'Avg Rating',     value: data.avgRating || '—', icon: Star,   color:'#FFB733', sub:'Admin-set ratings'                     },
                { label:'Pending Review', value: data.pendingMovies, icon: Clock,     color:'#FB923C', sub:'Needs approval'                         },
              ].map(({ label, value, icon: Icon, color, sub }) => (
                <div key={label} style={{ padding:'1.25rem', background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:16, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, background:`radial-gradient(circle,${color}20 0%,transparent 70%)`, pointerEvents:'none' }} />
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.75rem' }}>
                    <div style={{ width:34, height:34, borderRadius:9, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon style={{ width:16, height:16, color }} />
                    </div>
                    <span style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>{label}</span>
                  </div>
                  <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'2rem', letterSpacing:'0.04em', lineHeight:1, color:'white', marginBottom:'0.25rem' }}>{value}</p>
                  <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Charts Row ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>

              {/* Monthly bar chart */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1.4rem' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'white' }}>Monthly Overview</h3>
                  <div style={{ display:'flex', gap:'0.75rem', fontSize:'0.72rem', color:'var(--text-muted)' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:3, background:'#FF6200', display:'inline-block' }} />Views</span>
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:3, background:'#38BDF8', display:'inline-block' }} />Uploads</span>
                  </div>
                </div>
                {data.monthlyViews.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>No data yet</div>
                ) : (
                  <div style={{ display:'flex', gap:'0.6rem', alignItems:'flex-end', height:140 }}>
                    {data.monthlyViews.map(m => {
                      const viewH = maxViews > 0 ? (m.views / maxViews) * 110 : 4
                      const upH   = m.uploads * 8
                      return (
                        <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'0.3rem' }}>
                          <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:120 }}>
                            <div style={{ width:14, height: Math.max(4, viewH), background:'rgba(255,98,0,0.7)', borderRadius:'3px 3px 0 0', transition:'height 0.5s ease' }} title={`${m.views} views`} />
                            <div style={{ width:14, height: Math.max(4, upH), background:'rgba(56,189,248,0.6)', borderRadius:'3px 3px 0 0', transition:'height 0.5s ease' }} title={`${m.uploads} uploads`} />
                          </div>
                          <span style={{ fontSize:'0.65rem', color:'var(--text-muted)', textAlign:'center' }}>{m.month}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Genre distribution */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1.4rem' }}>
                <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'white', marginBottom:'1.25rem' }}>Genre Distribution</h3>
                {data.genreStats.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'2rem', color:'var(--text-muted)' }}>No genre data</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                    {data.genreStats.map(({ genre, count }, i) => {
                      const pct = Math.round((count / maxGenre) * 100)
                      const colors = ['#FF6200','#FFB733','#38BDF8','#4ADE80','#A78BFA','#FB923C','#f472b6','#34d399']
                      const color  = colors[i % colors.length]
                      return (
                        <div key={genre}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem' }}>
                            <span style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{genre}</span>
                            <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{count}</span>
                          </div>
                          <div style={{ height:6, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background: color, borderRadius:3, transition:'width 0.6s ease' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Top Content + Language + Activity ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1.25rem' }}>

              {/* Top Movies */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1.4rem' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                  <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'white' }}>Top Movies</h3>
                  <Link href="/admin/movies" style={{ color:'#FF8C00', fontSize:'0.78rem', textDecoration:'none' }}>View All →</Link>
                </div>
                {data.topMovies.length === 0 ? <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No movies yet</p> : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                    {data.topMovies.map((m, i) => (
                      <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'0.7rem', padding:'0.6rem', background:'rgba(255,255,255,0.02)', borderRadius:10 }}>
                        <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.1rem', color:'rgba(255,255,255,0.2)', width:20, flexShrink:0 }}>#{i+1}</span>
                        <div style={{ width:34, height:48, borderRadius:6, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.05)' }}>
                          {m.poster_url ? <Image src={m.poster_url} alt={m.title} width={34} height={48} style={{ objectFit:'cover', width:'100%', height:'100%' }} unoptimized /> : <Film style={{ width:14, height:14, color:'rgba(255,255,255,0.2)', margin:'auto' }} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:'0.82rem', fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</p>
                          <div style={{ display:'flex', gap:'0.5rem', fontSize:'0.7rem', color:'var(--text-muted)' }}>
                            <span style={{ display:'flex', alignItems:'center', gap:2 }}><Eye style={{ width:10, height:10 }} />{m.view_count >= 1000 ? `${(m.view_count/1000).toFixed(1)}K` : m.view_count}</span>
                            {m.rating > 0 && <span style={{ color:'#FFB733', display:'flex', alignItems:'center', gap:2 }}><Star style={{ width:10, height:10, fill:'currentColor' }} />{m.rating}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Language stats */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1.4rem' }}>
                <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'white', marginBottom:'1rem' }}>By Language</h3>
                {data.viewsByLanguage.length === 0 ? <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No data</p> : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
                    {data.viewsByLanguage.map(({ language, count, views }, i) => (
                      <div key={language} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.6rem 0.75rem', background:'rgba(255,255,255,0.02)', borderRadius:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background:['#FF6200','#FFB733','#38BDF8','#4ADE80','#A78BFA'][i%5], flexShrink:0 }} />
                          <span style={{ fontSize:'0.82rem', fontWeight:600, color:'rgba(255,255,255,0.75)' }}>{language}</span>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontSize:'0.82rem', fontWeight:700, color:'white' }}>{count} films</p>
                          <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{views >= 1000 ? `${(views/1000).toFixed(1)}K` : views} views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1.4rem' }}>
                <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'white', marginBottom:'1rem' }}>Recent Activity</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
                  {data.recentActivity.length === 0 ? <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No activity</p> : (
                    data.recentActivity.map(item => {
                      const d = new Date(item.created_at)
                      const ago = Math.floor((Date.now() - d.getTime()) / 60000)
                      const label = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago/60)}h ago` : `${Math.floor(ago/1440)}d ago`
                      return (
                        <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'0.6rem', padding:'0.55rem 0', borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                          <div style={{ width:7, height:7, borderRadius:'50%', background: item.action === 'Published' ? '#4ADE80' : '#FFB733', flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:'0.8rem', fontWeight:600, color:'rgba(255,255,255,0.75)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</p>
                            <p style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{item.action}</p>
                          </div>
                          <span style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.25)', flexShrink:0 }}>{label}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── Summary Cards ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem' }}>
              {[
                { label:'Featured Films',  value: data.featuredMovies, color:'#FFB733', icon: Star        },
                { label:'Trending Films',  value: data.trendingMovies, color:'#ef4444', icon: TrendingUp  },
                { label:'Pending Review',  value: data.pendingMovies,  color:'#FB923C', icon: Clock       },
                { label:'Avg Rating',      value: data.avgRating || '—', color:'#4ADE80', icon: Activity  },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} style={{ padding:'1rem 1.25rem', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, display:'flex', alignItems:'center', gap:'0.85rem' }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon style={{ width:18, height:18, color }} />
                  </div>
                  <div>
                    <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.6rem', letterSpacing:'0.04em', lineHeight:1, color:'white' }}>{value}</p>
                    <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:600 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  )
}