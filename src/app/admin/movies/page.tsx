// src/app/admin/movies/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Film, Plus, Search, Filter, Edit, Trash2, Eye,
  Star, TrendingUp, Sparkles, ChevronLeft, ChevronRight,
  CheckCircle, Clock, Loader2, RefreshCw, Upload, BarChart3,
  Home, Settings, Users, LogOut, Menu, X, AlertTriangle,
  Check, Save, Image as ImageIcon, Tag, Globe, Calendar,
  Video, User, List, Crown, ArrowUpDown,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

/* ── Types ── */
interface Movie {
  id: string
  title: string
  slug: string
  description: string | null
  youtube_id: string | null
  youtube_url: string | null
  poster_url: string | null
  backdrop_url: string | null
  trailer_url: string | null
  video_url: string | null
  release_year: number | null
  duration_minutes: number | null
  language: string | null
  director: string | null
  actors: string[] | null
  genre: string[] | null
  rating: number | null
  admin_rating: number | null
  view_count: number
  views: number | null
  is_featured: boolean
  is_trending: boolean
  is_published: boolean
  uploaded_by: string | null
  uploaded_by_type: string | null
  created_at: string
  updated_at: string | null
}

interface ActorEntry { name: string; character: string; imageFile: File | null; imagePreview: string | null }

interface EditForm {
  title: string
  slug: string
  description: string
  youtube_id: string
  youtube_url: string
  poster_url: string
  backdrop_url: string
  trailer_url: string
  release_year: string
  duration_minutes: string
  language: string
  director: string
  genre: string
  admin_rating: string
  is_published: boolean
  is_featured: boolean
  is_trending: boolean
  actorEntries: ActorEntry[]
  newPosterFile: File | null
  newPosterPreview: string | null
  newBackdropFile: File | null
  newBackdropPreview: string | null
  newThumbFile: File | null
  newThumbPreview: string | null
}

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin',         icon: BarChart3 },
  { label: 'Movies',    href: '/admin/movies',   icon: Film,     active: true },
  { label: 'Upload',    href: '/admin/upload',   icon: Upload    },
  { label: 'Users',     href: '/admin/users',    icon: Users     },
  { label: 'Settings',  href: '/admin/settings', icon: Settings  },
]

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Punjabi', 'Marathi', 'Other']
const GENRES    = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Western']

/* ══════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════ */
export default function AdminMoviesPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [movies,          setMovies]          = useState<Movie[]>([])
  const [loading,         setLoading]         = useState(true)
  const [searchQuery,     setSearchQuery]     = useState('')
  const [filterStatus,    setFilterStatus]    = useState<'all'|'published'|'draft'>('all')
  const [filterFeatured,  setFilterFeatured]  = useState<'all'|'featured'|'trending'>('all')
  const [sortBy,          setSortBy]          = useState<'newest'|'oldest'|'title'|'rating'|'views'>('newest')
  const [currentPage,     setCurrentPage]     = useState(1)
  const [totalCount,      setTotalCount]      = useState(0)
  const [selectedMovies,  setSelectedMovies]  = useState<string[]>([])
  const [actionLoading,   setActionLoading]   = useState<string | null>(null)
  const [sidebarOpen,     setSidebarOpen]     = useState(true)
  const [showFilters,     setShowFilters]     = useState(false)

  /* Delete modal */
  const [deleteModal,    setDeleteModal]    = useState(false)
  const [movieToDelete,  setMovieToDelete]  = useState<Movie | null>(null)

  /* Edit modal */
  const [editModal,      setEditModal]      = useState(false)
  const [editingMovie,   setEditingMovie]   = useState<Movie | null>(null)
  const [editForm,       setEditForm]       = useState<EditForm | null>(null)
  const [editLoading,    setEditLoading]    = useState(false)
  const [editSuccess,    setEditSuccess]    = useState(false)
  const [editTab,        setEditTab]        = useState<'basic'|'media'|'meta'|'flags'>('basic')

  const editPosterRef   = useRef<HTMLInputElement>(null!)
  const editBackdropRef = useRef<HTMLInputElement>(null!)
  const editThumbRef    = useRef<HTMLInputElement>(null!)

  const ITEMS = 12

  useEffect(() => { loadMovies() }, [searchQuery, filterStatus, filterFeatured, sortBy, currentPage])

  /* ── Load ── */
  const loadMovies = async () => {
    setLoading(true)
    try {
      let q = supabase.from('movies').select('*', { count: 'exact' })

      if (searchQuery) q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,director.ilike.%${searchQuery}%`)
      if (filterStatus   === 'published') q = q.eq('is_published', true)
      if (filterStatus   === 'draft')     q = q.eq('is_published', false)
      if (filterFeatured === 'featured')  q = q.eq('is_featured',  true)
      if (filterFeatured === 'trending')  q = q.eq('is_trending',  true)

      switch (sortBy) {
        case 'newest':  q = q.order('created_at',   { ascending: false }); break
        case 'oldest':  q = q.order('created_at',   { ascending: true  }); break
        case 'title':   q = q.order('title',         { ascending: true  }); break
        case 'rating':  q = q.order('admin_rating',  { ascending: false }); break
        case 'views':   q = q.order('view_count',    { ascending: false }); break
      }

      const from = (currentPage - 1) * ITEMS
      q = q.range(from, from + ITEMS - 1)

      const { data, error, count } = await q
      if (error) throw error
      setMovies(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Quick toggles ── */
  const toggle = async (movie: Movie, field: 'is_published'|'is_featured'|'is_trending') => {
    setActionLoading(movie.id + field)
    try {
      await supabase.from('movies').update({ [field]: !movie[field] }).eq('id', movie.id)
      setMovies(prev => prev.map(m => m.id === movie.id ? { ...m, [field]: !m[field] } : m))
    } finally { setActionLoading(null) }
  }

  /* ── Delete ── */
  const doDelete = async () => {
    if (!movieToDelete) return
    setActionLoading(movieToDelete.id)
    try {
      await supabase.from('movies').delete().eq('id', movieToDelete.id)
      setMovies(prev => prev.filter(m => m.id !== movieToDelete.id))
      setTotalCount(p => p - 1)
      setDeleteModal(false)
      setMovieToDelete(null)
    } finally { setActionLoading(null) }
  }

  /* ── Bulk ── */
  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedMovies.length} movies?`)) return
    setActionLoading('bulk')
    try {
      await supabase.from('movies').delete().in('id', selectedMovies)
      setMovies(prev => prev.filter(m => !selectedMovies.includes(m.id)))
      setTotalCount(p => p - selectedMovies.length)
      setSelectedMovies([])
    } finally { setActionLoading(null) }
  }

  const bulkPublish = async (pub: boolean) => {
    setActionLoading('bulk')
    try {
      await supabase.from('movies').update({ is_published: pub }).in('id', selectedMovies)
      setMovies(prev => prev.map(m => selectedMovies.includes(m.id) ? { ...m, is_published: pub } : m))
      setSelectedMovies([])
    } finally { setActionLoading(null) }
  }

  /* ── Open Edit ── */
  const readPreview = (file: File): Promise<string> =>
    new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(file) })

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) {
      console.error('Storage upload error:', error)
      const msg = (error as any)?.message ?? JSON.stringify(error)
      if (msg.includes('row-level') || msg.includes('policy') || msg.includes('403')) {
        throw new Error('Storage permission denied. Go to Supabase → Storage → Policies and allow uploads for the movies bucket.')
      }
      if (msg.includes('Bucket not found') || msg.includes('404')) {
        throw new Error(`Bucket "${bucket}" not found. Create it in Supabase → Storage.`)
      }
      throw new Error(`Upload failed: ${msg}`)
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  const openEdit = (movie: Movie) => {
    setEditingMovie(movie)
    setEditForm({
      title:            movie.title,
      slug:             movie.slug,
      description:      movie.description || '',
      youtube_id:       movie.youtube_id  || '',
      youtube_url:      movie.youtube_url || '',
      poster_url:       movie.poster_url  || '',
      backdrop_url:     movie.backdrop_url || '',
      trailer_url:      movie.trailer_url  || '',
      release_year:     movie.release_year?.toString()    || '',
      duration_minutes: movie.duration_minutes?.toString() || '',
      language:         movie.language    || '',
      director:         movie.director    || '',
      genre:            (movie.genre || []).join(', '),
      admin_rating:     movie.admin_rating?.toString() || '',
      is_published:     movie.is_published,
      is_featured:      movie.is_featured,
      is_trending:      movie.is_trending,
      actorEntries:     (movie.actors || []).length > 0
        ? (movie.actors || []).map(name => ({ name, character: '', imageFile: null, imagePreview: null }))
        : [{ name: '', character: '', imageFile: null, imagePreview: null }],
      newPosterFile: null, newPosterPreview: null,
      newBackdropFile: null, newBackdropPreview: null,
      newThumbFile: null, newThumbPreview: null,
    })
    setEditTab('basic')
    setEditSuccess(false)
    setEditModal(true)
  }

  /* ── Save Edit ── */
  const saveEdit = async () => {
    if (!editingMovie || !editForm) return
    setEditLoading(true)
    try {
      const prefix = `admin/${editingMovie.id}`

      let posterUrl  = editForm.poster_url.trim()  || null
      let backdropUrl = editForm.backdrop_url.trim() || null

      const ts = Date.now()
      if (editForm.newPosterFile) {
        const ext = editForm.newPosterFile.name.split('.').pop()
        posterUrl = await uploadFile(editForm.newPosterFile, 'movies', `${prefix}/poster_${ts}.${ext}`) || posterUrl
      }
      if (editForm.newBackdropFile) {
        const ext = editForm.newBackdropFile.name.split('.').pop()
        backdropUrl = await uploadFile(editForm.newBackdropFile, 'movies', `${prefix}/backdrop_${ts}.${ext}`) || backdropUrl
      }
      if (editForm.newThumbFile) {
        const ext = editForm.newThumbFile.name.split('.').pop()
        const thumbUrl = await uploadFile(editForm.newThumbFile, 'movies', `${prefix}/thumbnail_${ts}.${ext}`)
        if (thumbUrl && !editForm.newPosterFile) posterUrl = thumbUrl
      }

      const actorNames = editForm.actorEntries.map(a => a.name.trim()).filter(Boolean)

      const payload: Record<string, any> = {
        title:            editForm.title.trim(),
        slug:             editForm.slug.trim() || editForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-'),
        description:      editForm.description.trim() || null,
        youtube_id:       editForm.youtube_id.trim()  || null,
        youtube_url:      editForm.youtube_url.trim() || null,
        poster_url:       posterUrl,
        backdrop_url:     backdropUrl,
        trailer_url:      editForm.trailer_url.trim() || null,
        release_year:     editForm.release_year     ? parseInt(editForm.release_year)     : null,
        duration_minutes: editForm.duration_minutes ? parseInt(editForm.duration_minutes) : null,
        language:         editForm.language.trim()   || null,
        director:         editForm.director.trim()   || null,
        actors:           actorNames,
        genre:            editForm.genre ? editForm.genre.split(',').map(s => s.trim()).filter(Boolean) : [],
        admin_rating:     editForm.admin_rating ? parseFloat(editForm.admin_rating) : null,
        is_published:     editForm.is_published,
        is_featured:      editForm.is_featured,
        is_trending:      editForm.is_trending,
        updated_at:       new Date().toISOString(),
      }

      const { error } = await supabase.from('movies').update(payload).eq('id', editingMovie.id)
      if (error) throw error

      for (let i = 0; i < editForm.actorEntries.length; i++) {
        const a = editForm.actorEntries[i]
        if (!a.name.trim()) continue
        let actorImageUrl: string | null = null
        if (a.imageFile)
          actorImageUrl = await uploadFile(a.imageFile, 'actors', `${prefix}/actor-${i}.${a.imageFile.name.split('.').pop()}`)
        const { data: actorData } = await supabase.from('actors').upsert(
          { name: a.name.trim(), ...(actorImageUrl ? { image_url: actorImageUrl } : {}) },
          { onConflict: 'name' }
        ).select('id').single()
        if (actorData?.id) {
          await supabase.from('movie_actors').upsert(
            { movie_id: editingMovie.id, actor_id: actorData.id, character_name: a.character.trim() || null },
            { onConflict: 'movie_id,actor_id' }
          )
        }
      }

      setMovies(prev => prev.map(m => m.id === editingMovie.id ? { ...m, ...payload } : m))
      setEditSuccess(true)
      setTimeout(() => { setEditModal(false); setEditSuccess(false) }, 900)
    } catch (err: any) {
      alert('Save failed: ' + (err.message || err))
    } finally {
      setEditLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS)
  const ef = editForm
  const setEf = (patch: Partial<EditForm>) => setEditForm(prev => prev ? { ...prev, ...patch } : prev)

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)' }}>

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        width: sidebarOpen ? 260 : 76, flexShrink: 0,
        background: 'rgba(8,8,14,0.98)',
        borderRight: '1px solid rgba(255,98,0,0.1)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
        transition: 'width 0.3s ease', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.35rem', borderBottom: '1px solid rgba(255,98,0,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,98,0,0.3)' }}>
            <Image src="/images/logo.jpg" alt="RE" width={40} height={40} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </div>
          {sidebarOpen && (
            <div>
              <p style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '1rem', letterSpacing: '0.08em', lineHeight: 1 }}>
                <span className="gradient-text">ROY</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: 4, fontSize: '0.7rem', fontFamily: 'Outfit,sans-serif' }}>Admin</span>
              </p>
              <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', lineHeight: 1 }}>Management Panel</p>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
          {sidebarLinks.map(({ label, href, icon: Icon, active }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.72rem 0.9rem', borderRadius: 10, marginBottom: '0.2rem',
                background: active ? 'rgba(255,98,0,0.14)' : 'transparent',
                border: `1px solid ${active ? 'rgba(255,140,0,0.3)' : 'transparent'}`,
                color: active ? '#FFB733' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, transition: 'all 0.18s',
              }}>
                <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
              </div>
            </Link>
          ))}
        </nav>

        <div style={{ padding: '0.5rem 0.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Home style={{ width: 17, height: 17, flexShrink: 0 }} />
              {sidebarOpen && 'Back to Site'}
            </div>
          </Link>
        </div>

        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,98,0,0.08)' }}>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: '0.65rem', padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <LogOut style={{ width: 16, height: 16 }} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{ flex: 1, marginLeft: sidebarOpen ? 260 : 76, transition: 'margin-left 0.3s ease', minWidth: 0 }}>

        {/* Header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,98,0,0.1)',
          padding: '0.9rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={() => setSidebarOpen(s => !s)} className="icon-btn">
              {sidebarOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
            </button>
            <div>
              <h1 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '1.6rem', letterSpacing: '0.06em', lineHeight: 1 }}>
                <span className="gradient-text">Movies</span>
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{totalCount} total films</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
            <button onClick={loadMovies} disabled={loading} className="icon-btn" title="Refresh">
              <RefreshCw style={{ width: 16, height: 16, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <Link href="/admin/upload">
              <button className="btn-fire" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}>
                <Plus style={{ width: 16, height: 16 }} /> Add Movie
              </button>
            </Link>
          </div>
        </header>

        <div style={{ padding: '2rem' }}>

          {/* ── Stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            {[
              { label: 'Total',     val: totalCount,                                  color: '#FF8C00', icon: Film        },
              { label: 'Published', val: movies.filter(m => m.is_published).length,   color: '#22c55e', icon: CheckCircle },
              { label: 'Featured',  val: movies.filter(m => m.is_featured).length,    color: '#FFB733', icon: Sparkles    },
              { label: 'Trending',  val: movies.filter(m => m.is_trending).length,    color: '#ef4444', icon: TrendingUp  },
            ].map(({ label, val, color, icon: Icon }) => (
              <div key={label} style={{ padding: '1.1rem 1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <Icon style={{ width: 17, height: 17, color }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                </div>
                <p style={{ fontSize: '1.8rem', fontFamily: 'Bebas Neue,sans-serif', letterSpacing: '0.04em', color: 'var(--text-primary)', lineHeight: 1 }}>{val}</p>
              </div>
            ))}
          </div>

          {/* ── Search + Filters ── */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                <input
                  type="text" value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  placeholder="Search title, director…"
                  style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 38px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: 'white', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'Outfit,sans-serif' }}
                />
              </div>
              <button onClick={() => setShowFilters(f => !f)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1rem', background: showFilters ? 'rgba(255,98,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showFilters ? 'rgba(255,140,0,0.35)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 10, color: showFilters ? '#FFB733' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'Outfit,sans-serif' }}>
                <Filter style={{ width: 15, height: 15 }} /> Filters
              </button>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                style={{ padding: '0.7rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: 'white', outline: 'none', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'Outfit,sans-serif' }}>
                <option value="newest" style={{ background: '#0e0e18' }}>Newest</option>
                <option value="oldest" style={{ background: '#0e0e18' }}>Oldest</option>
                <option value="title"  style={{ background: '#0e0e18' }}>Title A–Z</option>
                <option value="rating" style={{ background: '#0e0e18' }}>Top Rated</option>
                <option value="views"  style={{ background: '#0e0e18' }}>Most Viewed</option>
              </select>
            </div>

            {showFilters && (
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                <FilterGroup label="Status" options={['all','published','draft']} active={filterStatus}
                  onChange={v => { setFilterStatus(v as any); setCurrentPage(1) }} />
                <FilterGroup label="Category" options={['all','featured','trending']} active={filterFeatured}
                  onChange={v => { setFilterFeatured(v as any); setCurrentPage(1) }} />
              </div>
            )}
          </div>

          {/* ── Bulk actions ── */}
          {selectedMovies.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', background: 'rgba(255,98,0,0.07)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 12, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#FFB733', fontWeight: 700, fontSize: '0.88rem' }}>{selectedMovies.length} selected</span>
              {[
                { label: 'Publish',   fn: () => bulkPublish(true),  color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
                { label: 'Unpublish', fn: () => bulkPublish(false), color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
                { label: 'Delete',    fn: bulkDelete,               color: '#f87171', bg: 'rgba(239,68,68,0.12)'   },
              ].map(({ label, fn, color, bg }) => (
                <button key={label} onClick={fn} disabled={actionLoading === 'bulk'}
                  style={{ padding: '0.4rem 0.9rem', background: bg, border: `1px solid ${color}33`, borderRadius: 8, color, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'Outfit,sans-serif' }}>
                  {label}
                </button>
              ))}
              <button onClick={() => setSelectedMovies([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Outfit,sans-serif' }}>Clear</button>
            </div>
          )}

          {/* ── Table ── */}
          <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>

            {/* Table head */}
            <div style={{ display: 'grid', gridTemplateColumns: '36px 70px 1fr 90px 70px 100px 110px 110px', gap: '0.75rem', padding: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
              <input type="checkbox"
                checked={selectedMovies.length === movies.length && movies.length > 0}
                onChange={() => setSelectedMovies(selectedMovies.length === movies.length ? [] : movies.map(m => m.id))}
                style={{ cursor: 'pointer', accentColor: '#FF6200', width: 16, height: 16 }}
              />
              {['POSTER','TITLE','RATING','VIEWS','STATUS','BADGES','ACTIONS'].map(h => (
                <div key={h} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em' }}>{h}</div>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 style={{ width: 36, height: 36, color: '#FF6200', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading movies…</p>
              </div>
            )}

            {/* Empty */}
            {!loading && movies.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Film style={{ width: 44, height: 44, color: 'rgba(255,255,255,0.1)', margin: '0 auto 0.75rem' }} />
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No movies found</p>
                <Link href="/admin/upload"><button className="btn-fire">Upload First Movie</button></Link>
              </div>
            )}

            {/* Rows */}
            {!loading && movies.map((movie, idx) => (
              <div key={movie.id}
                style={{
                  display: 'grid', gridTemplateColumns: '36px 70px 1fr 90px 70px 100px 110px 110px',
                  gap: '0.75rem', padding: '0.9rem 1.25rem',
                  borderBottom: idx < movies.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  alignItems: 'center',
                  background: selectedMovies.includes(movie.id) ? 'rgba(255,98,0,0.05)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => { if (!selectedMovies.includes(movie.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                onMouseOut={e => { if (!selectedMovies.includes(movie.id)) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Checkbox */}
                <input type="checkbox" checked={selectedMovies.includes(movie.id)}
                  onChange={() => setSelectedMovies(p => p.includes(movie.id) ? p.filter(i => i !== movie.id) : [...p, movie.id])}
                  style={{ cursor: 'pointer', accentColor: '#FF6200', width: 16, height: 16 }}
                />

                {/* Poster */}
                <div style={{ width: 52, height: 70, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                  {movie.poster_url
                    ? <img src={movie.poster_url + '?t=' + (movie.updated_at ? new Date(movie.updated_at).getTime() : '')} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Film style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.15)' }} /></div>
                  }
                </div>

                {/* Title */}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>{movie.title}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    {movie.release_year && <span>{movie.release_year}</span>}
                    {movie.duration_minutes && <span>{movie.duration_minutes}m</span>}
                    {movie.language && <span>{movie.language}</span>}
                  </div>
                </div>

                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Star style={{ width: 13, height: 13, color: '#FFB733', fill: '#FFB733' }} />
                  <span style={{ color: '#FFB733', fontWeight: 700, fontSize: '0.88rem' }}>
                    {movie.admin_rating || movie.rating || '—'}
                  </span>
                </div>

                {/* Views */}
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {movie.view_count >= 1000 ? `${(movie.view_count/1000).toFixed(1)}K` : movie.view_count || 0}
                </span>

                {/* Status toggle */}
                <button onClick={() => toggle(movie, 'is_published')} disabled={actionLoading === movie.id+'is_published'}
                  style={{
                    padding: '0.3rem 0.7rem', borderRadius: 9999, border: 'none', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit,sans-serif',
                    background: movie.is_published ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)',
                    color: movie.is_published ? '#22c55e' : '#f59e0b',
                  }}>
                  {movie.is_published ? 'Published' : 'Draft'}
                </button>

                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <IconToggle active={movie.is_featured} onClick={() => toggle(movie, 'is_featured')} title="Featured"
                    activeColor="rgba(255,183,51,0.3)" icon={<Sparkles style={{ width: 14, height: 14 }} />} />
                  <IconToggle active={movie.is_trending} onClick={() => toggle(movie, 'is_trending')} title="Trending"
                    activeColor="rgba(239,68,68,0.3)" icon={<TrendingUp style={{ width: 14, height: 14 }} />} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <Link href={`/watch/${movie.slug}`}>
                    <button title="View" style={actionBtn}>
                      <Eye style={{ width: 14, height: 14 }} />
                    </button>
                  </Link>
                  <button title="Edit" onClick={() => openEdit(movie)}
                    style={{ ...actionBtn, background: 'rgba(255,98,0,0.12)', borderColor: 'rgba(255,140,0,0.25)', color: '#FFB733' }}>
                    <Edit style={{ width: 14, height: 14 }} />
                  </button>
                  <button title="Delete" onClick={() => { setMovieToDelete(movie); setDeleteModal(true) }}
                    style={{ ...actionBtn, background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}>
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '1.75rem' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}
                style={{ ...pagBtn, opacity: currentPage === 1 ? 0.4 : 1 }}>
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const n = totalPages <= 5 ? i+1 : currentPage <= 3 ? i+1 : currentPage >= totalPages-2 ? totalPages-4+i : currentPage-2+i
                return (
                  <button key={n} onClick={() => setCurrentPage(n)}
                    style={{ ...pagBtn, background: currentPage===n ? 'rgba(255,98,0,0.22)' : 'rgba(255,255,255,0.04)', color: currentPage===n ? '#FFB733' : 'white', fontWeight: currentPage===n ? 700 : 400, border: currentPage===n ? '1px solid rgba(255,140,0,0.35)' : '1px solid rgba(255,255,255,0.08)' }}>
                    {n}
                  </button>
                )
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}
                style={{ ...pagBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}>
                <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          EDIT MODAL
      ══════════════════════════════════════════════ */}
      {editModal && ef && editingMovie && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.18s ease' }}>
          <div style={{ width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'rgba(12,12,20,0.99)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.75)', animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>

            {/* Modal header */}
            <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid rgba(255,140,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,98,0,0.05)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Edit style={{ width: 17, height: 17, color: '#FF8C00' }} />
                <div>
                  <p style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '1.2rem', letterSpacing: '0.06em', lineHeight: 1 }}>Edit Movie</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{editingMovie.title}</p>
                </div>
              </div>
              <button onClick={() => setEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 8 }}>
                <X style={{ width: 17, height: 17 }} />
              </button>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', padding: '0.6rem 1.4rem 0', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              {([
                { id: 'basic', label: 'Basic Info',  icon: Film       },
                { id: 'media', label: 'Media & URLs', icon: Video      },
                { id: 'meta',  label: 'Cast & Genre', icon: Users      },
                { id: 'flags', label: 'Settings',    icon: Settings   },
              ] as { id: typeof editTab; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setEditTab(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.55rem 0.85rem', borderRadius: '8px 8px 0 0', border: 'none',
                    background: editTab === id ? 'rgba(255,98,0,0.12)' : 'transparent',
                    borderBottom: editTab === id ? '2px solid #FF8C00' : '2px solid transparent',
                    color: editTab === id ? '#FFB733' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                    fontFamily: 'Outfit,sans-serif', transition: 'all 0.15s',
                  }}>
                  <Icon style={{ width: 13, height: 13 }} />{label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem' }}>

              {/* ── Basic Info ── */}
              {editTab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Row label="Title *">
                    <EInput value={ef.title} onChange={v => setEf({ title: v })} placeholder="Movie title" />
                  </Row>
                  <Row label="Slug">
                    <EInput value={ef.slug} onChange={v => setEf({ slug: v })} placeholder="url-friendly-slug" />
                  </Row>
                  <Row label="Description">
                    <textarea value={ef.description} onChange={e => setEf({ description: e.target.value })} placeholder="Movie synopsis…" rows={4}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }} />
                  </Row>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <Row label="Year">
                      <EInput value={ef.release_year} onChange={v => setEf({ release_year: v })} placeholder="2024" type="number" />
                    </Row>
                    <Row label="Duration (min)">
                      <EInput value={ef.duration_minutes} onChange={v => setEf({ duration_minutes: v })} placeholder="120" type="number" />
                    </Row>
                    <Row label="Admin Rating">
                      <EInput value={ef.admin_rating} onChange={v => setEf({ admin_rating: v })} placeholder="8.5" type="number" />
                    </Row>
                  </div>
                  <Row label="Language">
                    <select value={ef.language} onChange={e => setEf({ language: e.target.value })} style={{ ...inputStyle }}>
                      <option value="" style={{ background: '#0e0e18' }}>Select language</option>
                      {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#0e0e18' }}>{l}</option>)}
                    </select>
                  </Row>
                </div>
              )}

              {/* ── Media & URLs ── */}
              {editTab === 'media' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Video links */}
                  <Row label="YouTube Video ID">
                    <EInput value={ef.youtube_id} onChange={v => setEf({ youtube_id: v })} placeholder="dQw4w9WgXcQ" />
                  </Row>
                  <Row label="YouTube URL">
                    <EInput value={ef.youtube_url} onChange={v => setEf({ youtube_url: v })} placeholder="https://youtube.com/watch?v=…" />
                  </Row>
                  <Row label="Trailer URL">
                    <EInput value={ef.trailer_url} onChange={v => setEf({ trailer_url: v })} placeholder="https://…/trailer" />
                  </Row>

                  {/* Image upload boxes */}
                  <div style={{ padding: '0.7rem 0.9rem', borderRadius: 10, background: 'rgba(255,183,51,0.06)', border: '1px solid rgba(255,183,51,0.15)', fontSize: '0.77rem', color: 'rgba(255,200,100,0.75)', lineHeight: 1.45 }}>
                    Upload a new file to replace the current image, or edit the URL directly below.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
                    {/* Thumbnail / Poster upload */}
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#FFB733', marginBottom: '0.45rem' }}>🖼 Thumbnail (16:9)</p>
                      <div onClick={() => !ef.newThumbPreview && editThumbRef.current?.click()}
                        style={{ aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', position: 'relative', border: `2px dashed ${ef.newThumbPreview ? 'rgba(255,140,0,0.5)' : 'rgba(255,183,51,0.3)'}`, background: 'rgba(255,183,51,0.03)', cursor: ef.newThumbPreview ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ef.newThumbPreview ? (
                          <><img src={ef.newThumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={e => { e.stopPropagation(); setEf({ newThumbFile: null, newThumbPreview: null }) }} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={10} /></button></>
                        ) : ef.poster_url ? (
                          <img src={ef.poster_url} alt="current" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                        ) : (
                          <div style={{ textAlign: 'center' }}><Upload style={{ width: 20, height: 20, color: '#FFB733', margin: '0 auto 0.3rem', opacity: 0.6 }} /><p style={{ fontSize: '0.65rem', color: 'rgba(255,183,51,0.6)' }}>Upload new</p></div>
                        )}
                      </div>
                      <input ref={editThumbRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => { const f = e.target.files?.[0]; if (f) setEf({ newThumbFile: f, newThumbPreview: await readPreview(f) }) }} />
                    </div>

                    {/* Poster upload */}
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>Poster (2:3)</p>
                      <div onClick={() => !ef.newPosterPreview && editPosterRef.current?.click()}
                        style={{ aspectRatio: '2/3', borderRadius: 10, overflow: 'hidden', position: 'relative', border: `1.5px dashed ${ef.newPosterPreview ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.12)'}`, background: 'var(--bg-card)', cursor: ef.newPosterPreview ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ef.newPosterPreview ? (
                          <><img src={ef.newPosterPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={e => { e.stopPropagation(); setEf({ newPosterFile: null, newPosterPreview: null }) }} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={10} /></button></>
                        ) : ef.poster_url ? (
                          <img src={ef.poster_url} alt="current" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                        ) : (
                          <div style={{ textAlign: 'center' }}><Upload style={{ width: 20, height: 20, color: 'var(--text-muted)', margin: '0 auto 0.3rem', opacity: 0.5 }} /><p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Upload</p></div>
                        )}
                      </div>
                      <input ref={editPosterRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => { const f = e.target.files?.[0]; if (f) setEf({ newPosterFile: f, newPosterPreview: await readPreview(f) }) }} />
                    </div>

                    {/* Backdrop upload */}
                    <div>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.45rem' }}>Backdrop (16:9)</p>
                      <div onClick={() => !ef.newBackdropPreview && editBackdropRef.current?.click()}
                        style={{ aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', position: 'relative', border: `1.5px dashed ${ef.newBackdropPreview ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.12)'}`, background: 'var(--bg-card)', cursor: ef.newBackdropPreview ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ef.newBackdropPreview ? (
                          <><img src={ef.newBackdropPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={e => { e.stopPropagation(); setEf({ newBackdropFile: null, newBackdropPreview: null }) }} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={10} /></button></>
                        ) : ef.backdrop_url ? (
                          <img src={ef.backdrop_url} alt="current" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
                        ) : (
                          <div style={{ textAlign: 'center' }}><Upload style={{ width: 20, height: 20, color: 'var(--text-muted)', margin: '0 auto 0.3rem', opacity: 0.5 }} /><p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Upload</p></div>
                        )}
                      </div>
                      <input ref={editBackdropRef} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={async e => { const f = e.target.files?.[0]; if (f) setEf({ newBackdropFile: f, newBackdropPreview: await readPreview(f) }) }} />
                    </div>
                  </div>

                  {/* URL overrides */}
                  <Row label="Poster URL (or paste URL)">
                    <EInput value={ef.poster_url} onChange={v => setEf({ poster_url: v })} placeholder="https://…/poster.jpg" />
                  </Row>
                  <Row label="Backdrop URL (or paste URL)">
                    <EInput value={ef.backdrop_url} onChange={v => setEf({ backdrop_url: v })} placeholder="https://…/backdrop.jpg" />
                  </Row>
                </div>
              )}

              {/* ── Cast & Genre ── */}
              {editTab === 'meta' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Row label="Director">
                    <EInput value={ef.director} onChange={v => setEf({ director: v })} placeholder="Director name" />
                  </Row>

                  {/* Genre pills */}
                  <Row label="Genres">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {GENRES.map(g => {
                        const active = ef.genre.split(',').map(s => s.trim()).includes(g)
                        return (
                          <button key={g} type="button" onClick={() => {
                            const current = ef.genre.split(',').map(s => s.trim()).filter(Boolean)
                            const next = active ? current.filter(x => x !== g) : [...current, g]
                            setEf({ genre: next.join(', ') })
                          }}
                            className={`filter-pill${active ? ' active' : ''}`}
                            style={{ fontSize: '0.78rem' }}>
                            {g}
                          </button>
                        )
                      })}
                    </div>
                  </Row>

                  {/* Actor entries */}
                  <Row label="Cast & Actors">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {ef.actorEntries.map((actor, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.85rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, flexWrap: 'wrap' }}>
                          {/* Actor photo */}
                          <label htmlFor={`edit-actor-img-${i}`} style={{ cursor: 'pointer', flexShrink: 0 }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: `2px dashed ${actor.imagePreview ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.15)'}`, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {actor.imagePreview
                                ? <img src={actor.imagePreview} alt="actor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <User style={{ width: 22, height: 22, color: 'var(--text-muted)' }} />}
                            </div>
                          </label>
                          <input id={`edit-actor-img-${i}`} type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async e => {
                              const f = e.target.files?.[0]
                              if (!f) return
                              const preview = await readPreview(f)
                              setEf({ actorEntries: ef.actorEntries.map((a, idx) => idx === i ? { ...a, imageFile: f, imagePreview: preview } : a) })
                            }} />
                          {/* Name + Character */}
                          <div style={{ flex: 1, minWidth: 140, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <input value={actor.name} onChange={e => setEf({ actorEntries: ef.actorEntries.map((a, idx) => idx === i ? { ...a, name: e.target.value } : a) })}
                              placeholder="Actor name" style={{ ...editInputStyle }} />
                            <input value={actor.character} onChange={e => setEf({ actorEntries: ef.actorEntries.map((a, idx) => idx === i ? { ...a, character: e.target.value } : a) })}
                              placeholder="Character" style={{ ...editInputStyle }} />
                          </div>
                          {ef.actorEntries.length > 1 && (
                            <button type="button" onClick={() => setEf({ actorEntries: ef.actorEntries.filter((_, idx) => idx !== i) })}
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '0.3rem', cursor: 'pointer', color: '#f87171', flexShrink: 0 }}>
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setEf({ actorEntries: [...ef.actorEntries, { name: '', character: '', imageFile: null, imagePreview: null }] })}
                        className="btn-ghost" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
                        <Plus size={13} /> Add Actor
                      </button>
                    </div>
                  </Row>
                </div>
              )}

              {/* ── Settings / flags ── */}
              {editTab === 'flags' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {([
                    { key: 'is_published', label: 'Published',     desc: 'Visible to all users on the platform',   color: '#22c55e' },
                    { key: 'is_featured',  label: 'Featured',      desc: 'Shown in the Featured Collection section', color: '#FFB733' },
                    { key: 'is_trending',  label: 'Trending',      desc: 'Shown in the Trending Now section',        color: '#ef4444' },
                  ] as { key: keyof EditForm; label: string; desc: string; color: string }[]).map(({ key, label, desc, color }) => (
                    <div key={key} onClick={() => setEf({ [key]: !ef[key] } as any)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderRadius: 14, border: `1px solid ${(ef[key] as boolean) ? color+'44' : 'rgba(255,255,255,0.07)'}`, background: (ef[key] as boolean) ? color+'11' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.18s' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: (ef[key] as boolean) ? color : 'var(--text-primary)', marginBottom: '0.2rem' }}>{label}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</p>
                      </div>
                      <div style={{ width: 44, height: 24, borderRadius: 12, background: (ef[key] as boolean) ? color : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 3, left: (ef[key] as boolean) ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: '0.9rem 1.4rem', borderTop: '1px solid rgba(255,140,0,0.1)', display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.01)', flexShrink: 0 }}>
              <button onClick={() => setEditModal(false)} className="btn-ghost" style={{ padding: '0.65rem 1.25rem', fontSize: '0.86rem' }}>Cancel</button>
              <button onClick={saveEdit} disabled={editLoading || !ef.title.trim()} className="btn-fire"
                style={{ padding: '0.65rem 1.5rem', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: editLoading || !ef.title.trim() ? 0.6 : 1, cursor: editLoading || !ef.title.trim() ? 'not-allowed' : 'pointer' }}>
                {editSuccess
                  ? <><Check style={{ width: 15, height: 15 }} /> Saved!</>
                  : editLoading
                  ? <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <><Save style={{ width: 15, height: 15 }} /> Save Changes</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE MODAL ══ */}
      {deleteModal && movieToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: 400, background: 'rgba(14,14,24,0.99)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20, padding: '2rem', textAlign: 'center', boxShadow: '0 32px 64px rgba(0,0,0,0.7)' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <AlertTriangle style={{ width: 28, height: 28, color: '#ef4444' }} />
            </div>
            <h3 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '1.5rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Delete Movie?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.55 }}>
              "<strong style={{ color: 'white' }}>{movieToDelete.title}</strong>" will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setDeleteModal(false); setMovieToDelete(null) }} className="btn-ghost" style={{ flex: 1, padding: '0.75rem' }}>Cancel</button>
              <button onClick={doDelete} disabled={actionLoading === movieToDelete.id}
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#f87171', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontFamily: 'Outfit,sans-serif' }}>
                {actionLoading === movieToDelete.id
                  ? <Loader2 style={{ width: 17, height: 17, animation: 'spin 1s linear infinite' }} />
                  : <><Trash2 style={{ width: 16, height: 16 }} /> Delete</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

/* ── Small reusable sub-components ── */

function FilterGroup({ label, options, active, onChange }: { label: string; options: string[]; active: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label}</p>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)}
            style={{ padding: '0.4rem 0.85rem', borderRadius: 8, border: 'none', background: active === o ? 'rgba(255,98,0,0.2)' : 'rgba(255,255,255,0.05)', color: active === o ? '#FFB733' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', fontFamily: 'Outfit,sans-serif', transition: 'all 0.15s' }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function IconToggle({ active, onClick, title, activeColor, icon }: { active: boolean; onClick: () => void; title: string; activeColor: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      style={{ padding: '0.3rem', borderRadius: 7, border: 'none', cursor: 'pointer', background: active ? activeColor : 'rgba(255,255,255,0.05)', color: active ? 'white' : 'rgba(255,255,255,0.25)', transition: 'all 0.15s' }}>
      {icon}
    </button>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

function EInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={inputStyle}
      onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
    />
  )
}

const editInputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  padding: '0.55rem 0.75rem', color: 'white', fontSize: '0.82rem',
  outline: 'none', fontFamily: 'Outfit,sans-serif',
  transition: 'border-color 0.2s', boxSizing: 'border-box' as const,
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
  padding: '0.7rem 0.9rem', color: 'white', fontSize: '0.87rem',
  outline: 'none', fontFamily: 'Outfit,sans-serif',
  transition: 'border-color 0.2s', boxSizing: 'border-box' as const,
}

const actionBtn: React.CSSProperties = {
  padding: '0.4rem', background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
}

const pagBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)', color: 'white', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Outfit,sans-serif', fontSize: '0.85rem',
}