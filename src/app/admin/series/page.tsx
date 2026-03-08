// src/app/admin/series/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Tv, Plus, Search, Filter, Edit, Trash2, Eye, Star, TrendingUp,
  Sparkles, ChevronLeft, ChevronRight, CheckCircle, Loader2, RefreshCw,
  Upload, BarChart3, Home, Settings, Users, LogOut, Menu, X, AlertTriangle,
  Check, Save, Film, Video, List, Database,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

/* ── Types ── */
interface Series {
  id: string
  title: string
  slug: string
  description: string | null
  poster_url: string | null
  backdrop_url: string | null
  release_year: number | null
  language: string | null
  director: string | null
  genre: string[] | null
  rating: number | null
  admin_rating: number | null
  view_count: number
  is_featured: boolean
  is_trending: boolean
  is_published: boolean
  created_at: string
  updated_at?: string
}

interface EditForm {
  title: string
  slug: string
  description: string
  poster_url: string
  backdrop_url: string
  release_year: string
  language: string
  director: string
  genre: string
  admin_rating: string
  is_published: boolean
  is_featured: boolean
  is_trending: boolean
}

const BLANK_FORM: EditForm = {
  title: '', slug: '', description: '', poster_url: '', backdrop_url: '',
  release_year: '', language: '', director: '', genre: '', admin_rating: '',
  is_published: false, is_featured: false, is_trending: false,
}

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin',          icon: BarChart3  },
  { label: 'Movies',    href: '/admin/movies',    icon: Film       },
  { label: 'Series',    href: '/admin/series',    icon: Tv,        active: true },
  { label: 'Upload',    href: '/admin/upload',    icon: Upload     },
  { label: 'Users',     href: '/admin/users',     icon: Users      },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings   },
]

const LANGUAGES = ['English','Hindi','Tamil','Telugu','Malayalam','Kannada','Bengali','Punjabi','Marathi','Other']
const GENRES    = ['Action','Adventure','Animation','Comedy','Crime','Documentary','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Thriller','Western']
const ITEMS     = 12

export default function AdminSeriesPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [series,         setSeries]        = useState<Series[]>([])
  const [loading,        setLoading]       = useState(true)
  const [tableError,     setTableError]    = useState<string | null>(null)
  const [searchQuery,    setSearchQuery]   = useState('')
  const [filterStatus,   setFilterStatus]  = useState<'all'|'published'|'draft'>('all')
  const [filterCategory, setFilterCat]    = useState<'all'|'featured'|'trending'>('all')
  const [sortBy,         setSortBy]        = useState<'newest'|'oldest'|'title'|'rating'|'views'>('newest')
  const [currentPage,    setCurrentPage]   = useState(1)
  const [totalCount,     setTotalCount]    = useState(0)
  const [actionLoading,  setActionLoading] = useState<string | null>(null)
  const [sidebarOpen,    setSidebarOpen]   = useState(true)
  const [showFilters,    setShowFilters]   = useState(false)
  const [liveIndicator,  setLiveInd]       = useState(false)
  const [toast,          setToast]         = useState<{msg:string;type:'ok'|'err'}|null>(null)

  const [deleteModal,  setDeleteModal]  = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Series | null>(null)

  const [editModal,    setEditModal]    = useState(false)
  const [editingItem,  setEditingItem]  = useState<Series | null>(null)
  const [editForm,     setEditForm]     = useState<EditForm | null>(null)
  const [editLoading,  setEditLoading]  = useState(false)
  const [editSuccess,  setEditSuccess]  = useState(false)
  const [editTab,      setEditTab]      = useState<'basic'|'media'|'meta'|'flags'>('basic')

  const [addModal,   setAddModal]   = useState(false)
  const [addForm,    setAddForm]    = useState<EditForm>({ ...BLANK_FORM })
  const [addLoading, setAddLoading] = useState(false)

  const channelRef  = useRef<any>(null)

  /* ── 1. Load when filters change ── */
  useEffect(() => {
    loadSeries()
  }, [searchQuery, filterStatus, filterCategory, sortBy, currentPage]) // eslint-disable-line

  /* ── 2. Realtime subscription — once only ── */
  useEffect(() => {
    setupRealtime()
    return () => {
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, []) // eslint-disable-line

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── Realtime ── */
  const setupRealtime = () => {
    channelRef.current = supabase
      .channel('series-admin-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, () => {
        setLiveInd(true)
        setTimeout(() => setLiveInd(false), 2000)
        loadSeries()
      })
      .subscribe()
  }

  /* ── Load ── */
  const loadSeries = async () => {
    setLoading(true)
    setTableError(null)
    try {
      let q = supabase.from('series').select('*', { count: 'exact' })

      if (searchQuery)                  q = q.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      if (filterStatus === 'published') q = q.eq('is_published', true)
      if (filterStatus === 'draft')     q = q.eq('is_published', false)
      if (filterCategory === 'featured') q = q.eq('is_featured', true)
      if (filterCategory === 'trending') q = q.eq('is_trending', true)

      switch (sortBy) {
        case 'newest': q = q.order('created_at',  { ascending: false }); break
        case 'oldest': q = q.order('created_at',  { ascending: true  }); break
        case 'title':  q = q.order('title',        { ascending: true  }); break
        case 'rating': q = q.order('admin_rating', { ascending: false }); break
        case 'views':  q = q.order('view_count',   { ascending: false }); break
      }

      const from = (currentPage - 1) * ITEMS
      q = q.range(from, from + ITEMS - 1)

      const { data, error, count } = await q

      if (error) {
        // Table doesn't exist yet — show a friendly message instead of throwing
        const msg = (error as any)?.message || (error as any)?.details || JSON.stringify(error)
        if (
          msg.includes('relation') ||
          msg.includes('does not exist') ||
          msg.includes('42P01') ||
          msg === '{}'
        ) {
          setTableError('The `series` table does not exist in your database yet. Create it in Supabase to get started.')
        } else {
          setTableError(`Database error: ${msg}`)
        }
        setSeries([])
        setTotalCount(0)
        return
      }

      setSeries(data || [])
      setTotalCount(count || 0)
    } catch (err: any) {
      const msg = err?.message || err?.details || String(err)
      setTableError(`Failed to load series: ${msg}`)
      setSeries([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  /* ── Toggle ── */
  const toggle = async (item: Series, field: 'is_published'|'is_featured'|'is_trending') => {
    setActionLoading(item.id + field)
    const { error } = await supabase.from('series').update({ [field]: !item[field] }).eq('id', item.id)
    if (!error) setSeries(prev => prev.map(s => s.id === item.id ? { ...s, [field]: !s[field] } : s))
    else showToast('Update failed', 'err')
    setActionLoading(null)
  }

  /* ── Delete ── */
  const doDelete = async () => {
    if (!itemToDelete) return
    setActionLoading(itemToDelete.id)
    const { error } = await supabase.from('series').delete().eq('id', itemToDelete.id)
    if (!error) {
      setSeries(prev => prev.filter(s => s.id !== itemToDelete.id))
      setTotalCount(p => p - 1)
      showToast(`"${itemToDelete.title}" deleted.`, 'err')
    } else {
      showToast('Delete failed', 'err')
    }
    setDeleteModal(false)
    setItemToDelete(null)
    setActionLoading(null)
  }

  /* ── Open Edit ── */
  const openEdit = (item: Series) => {
    setEditingItem(item)
    setEditForm({
      title:        item.title,
      slug:         item.slug,
      description:  item.description  || '',
      poster_url:   item.poster_url   || '',
      backdrop_url: item.backdrop_url || '',
      release_year: item.release_year?.toString() || '',
      language:     item.language  || '',
      director:     item.director  || '',
      genre:        (item.genre || []).join(', '),
      admin_rating: item.admin_rating?.toString() || '',
      is_published: item.is_published,
      is_featured:  item.is_featured,
      is_trending:  item.is_trending,
    })
    setEditTab('basic')
    setEditSuccess(false)
    setEditModal(true)
  }

  /* ── Save Edit ── */
  const saveEdit = async () => {
    if (!editingItem || !editForm) return
    setEditLoading(true)
    try {
      const payload: Record<string,any> = {
        title:        editForm.title.trim(),
        slug:         editForm.slug.trim() || editForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-'),
        description:  editForm.description.trim()  || null,
        poster_url:   editForm.poster_url.trim()   || null,
        backdrop_url: editForm.backdrop_url.trim() || null,
        release_year: editForm.release_year ? parseInt(editForm.release_year) : null,
        language:     editForm.language.trim() || null,
        director:     editForm.director.trim() || null,
        genre:        editForm.genre ? editForm.genre.split(',').map(s=>s.trim()).filter(Boolean) : [],
        admin_rating: editForm.admin_rating ? parseFloat(editForm.admin_rating) : null,
        is_published: editForm.is_published,
        is_featured:  editForm.is_featured,
        is_trending:  editForm.is_trending,
        updated_at:   new Date().toISOString(),
      }
      const { error } = await supabase.from('series').update(payload).eq('id', editingItem.id)
      if (error) throw new Error((error as any).message || 'Update failed')
      setSeries(prev => prev.map(s => s.id === editingItem.id ? { ...s, ...payload } : s))
      setEditSuccess(true)
      showToast(`"${editForm.title}" updated!`)
      setTimeout(() => { setEditModal(false); setEditSuccess(false) }, 900)
    } catch (err: any) {
      showToast('Save failed: ' + (err?.message || String(err)), 'err')
    } finally {
      setEditLoading(false)
    }
  }

  /* ── Add New ── */
  const addSeries = async () => {
    if (!addForm.title.trim()) return
    setAddLoading(true)
    try {
      const payload: Record<string,any> = {
        title:        addForm.title.trim(),
        slug:         addForm.slug.trim() || addForm.title.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-'),
        description:  addForm.description.trim()  || null,
        poster_url:   addForm.poster_url.trim()   || null,
        backdrop_url: addForm.backdrop_url.trim() || null,
        release_year: addForm.release_year ? parseInt(addForm.release_year) : null,
        language:     addForm.language.trim() || null,
        director:     addForm.director.trim() || null,
        genre:        addForm.genre ? addForm.genre.split(',').map(s=>s.trim()).filter(Boolean) : [],
        admin_rating: addForm.admin_rating ? parseFloat(addForm.admin_rating) : null,
        is_published: addForm.is_published,
        is_featured:  addForm.is_featured,
        is_trending:  addForm.is_trending,
        view_count:   0,
      }
      const { error } = await supabase.from('series').insert(payload)
      if (error) throw new Error((error as any).message || 'Insert failed')
      showToast(`"${addForm.title}" created!`)
      setAddModal(false)
      setAddForm({ ...BLANK_FORM })
      loadSeries()
    } catch (err: any) {
      showToast('Create failed: ' + (err?.message || String(err)), 'err')
    } finally {
      setAddLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / ITEMS)
  const ef  = editForm
  const setEf = (patch: Partial<EditForm>) => setEditForm(prev => prev ? { ...prev, ...patch } : prev)
  const af  = addForm
  const setAf = (patch: Partial<EditForm>) => setAddForm(prev => ({ ...prev, ...patch }))

  /* ════════════════════════════════════════════ RENDER ═══ */
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
                  <span className="gradient-text">Series</span>
                </h1>
                <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', padding:'0.2rem 0.55rem', background: liveIndicator ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${liveIndicator ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius:9999, transition:'all 0.3s' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', animation: liveIndicator ? 'livePulse 1s ease infinite' : 'none' }} />
                  <span style={{ fontSize:'0.65rem', fontWeight:700, color: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', letterSpacing:'0.05em' }}>LIVE</span>
                </div>
              </div>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{tableError ? 'Table not found' : `${totalCount} total series`}</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.65rem', alignItems:'center' }}>
            <button onClick={loadSeries} disabled={loading} className="icon-btn" title="Refresh">
              <RefreshCw style={{ width:16, height:16, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            {!tableError && (
              <button onClick={() => setAddModal(true)} className="btn-fire" style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.6rem 1.2rem', fontSize:'0.88rem' }}>
                <Plus style={{ width:16, height:16 }} /> Add Series
              </button>
            )}
          </div>
        </header>

        <div style={{ padding:'2rem' }}>

          {/* ── Table-not-found error banner ── */}
          {tableError && (
            <div style={{ padding:'2rem', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:16, marginBottom:'1.5rem', display:'flex', gap:'1.25rem', alignItems:'flex-start' }}>
              <div style={{ width:48, height:48, borderRadius:12, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Database style={{ width:22, height:22, color:'#fbbf24' }} />
              </div>
              <div>
                <p style={{ fontWeight:700, color:'#fbbf24', marginBottom:'0.4rem', fontSize:'0.95rem' }}>Series Table Missing</p>
                <p style={{ color:'rgba(251,191,36,0.7)', fontSize:'0.85rem', lineHeight:1.6, marginBottom:'0.75rem' }}>{tableError}</p>
                <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:10, padding:'0.85rem 1rem', fontFamily:'monospace', fontSize:'0.8rem', color:'rgba(255,255,255,0.6)', lineHeight:1.8 }}>
                  <p style={{ color:'#4ADE80', marginBottom:'0.25rem' }}>-- Run this in your Supabase SQL editor:</p>
                  <p>create table public.series (</p>
                  <p style={{ paddingLeft:'1.5rem' }}>id uuid primary key default gen_random_uuid(),</p>
                  <p style={{ paddingLeft:'1.5rem' }}>title text not null,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>slug text unique not null,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>description text,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>poster_url text,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>backdrop_url text,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>release_year int,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>language text,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>director text,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>genre text[],</p>
                  <p style={{ paddingLeft:'1.5rem' }}>rating numeric,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>admin_rating numeric,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>view_count int default 0,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>is_featured boolean default false,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>is_trending boolean default false,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>is_published boolean default false,</p>
                  <p style={{ paddingLeft:'1.5rem' }}>created_at timestamptz default now(),</p>
                  <p style={{ paddingLeft:'1.5rem' }}>updated_at timestamptz default now()</p>
                  <p>);</p>
                </div>
                <button onClick={loadSeries} style={{ marginTop:'1rem', display:'inline-flex', alignItems:'center', gap:'0.4rem', padding:'0.55rem 1.1rem', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:9, color:'#fbbf24', cursor:'pointer', fontSize:'0.85rem', fontWeight:700, fontFamily:'Outfit,sans-serif' }}>
                  <RefreshCw style={{ width:14, height:14 }} /> Retry
                </button>
              </div>
            </div>
          )}

          {/* ── Stats (only show when table exists) ── */}
          {!tableError && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'1rem', marginBottom:'1.75rem' }}>
                {[
                  { label:'Total',     val: totalCount,                               color:'#FF8C00', icon: Tv          },
                  { label:'Published', val: series.filter(s=>s.is_published).length,  color:'#22c55e', icon: CheckCircle },
                  { label:'Featured',  val: series.filter(s=>s.is_featured).length,   color:'#FFB733', icon: Sparkles    },
                  { label:'Trending',  val: series.filter(s=>s.is_trending).length,   color:'#ef4444', icon: TrendingUp  },
                ].map(({ label, val, color, icon: Icon }) => (
                  <div key={label} style={{ padding:'1.1rem 1.25rem', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.5rem' }}>
                      <Icon style={{ width:17, height:17, color }} />
                      <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:600 }}>{label}</span>
                    </div>
                    <p style={{ fontSize:'1.8rem', fontFamily:'Bebas Neue,sans-serif', letterSpacing:'0.04em', color:'var(--text-primary)', lineHeight:1 }}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Search + Filters */}
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1.25rem', marginBottom:'1.5rem' }}>
                <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{ position:'relative', flex:1, minWidth:240 }}>
                    <Search style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'var(--text-muted)' }} />
                    <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} placeholder="Search series…"
                      style={{ width:'100%', padding:'0.7rem 1rem 0.7rem 38px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:10, color:'white', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', fontFamily:'Outfit,sans-serif' }} />
                  </div>
                  <button onClick={() => setShowFilters(f=>!f)}
                    style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.7rem 1rem', background: showFilters?'rgba(255,98,0,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${showFilters?'rgba(255,140,0,0.35)':'rgba(255,255,255,0.09)'}`, borderRadius:10, color: showFilters?'#FFB733':'var(--text-secondary)', cursor:'pointer', fontSize:'0.85rem', fontWeight:600, fontFamily:'Outfit,sans-serif' }}>
                    <Filter style={{ width:15, height:15 }} /> Filters
                  </button>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                    style={{ padding:'0.7rem 1rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:10, color:'white', outline:'none', cursor:'pointer', fontSize:'0.85rem', fontFamily:'Outfit,sans-serif' }}>
                    <option value="newest" style={{ background:'#0e0e18' }}>Newest</option>
                    <option value="oldest" style={{ background:'#0e0e18' }}>Oldest</option>
                    <option value="title"  style={{ background:'#0e0e18' }}>Title A–Z</option>
                    <option value="rating" style={{ background:'#0e0e18' }}>Top Rated</option>
                    <option value="views"  style={{ background:'#0e0e18' }}>Most Viewed</option>
                  </select>
                </div>
                {showFilters && (
                  <div style={{ display:'flex', gap:'1.5rem', marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid rgba(255,255,255,0.05)', flexWrap:'wrap' }}>
                    <FilterGroup label="Status"   options={['all','published','draft']}   active={filterStatus}   onChange={v => { setFilterStatus(v as any); setCurrentPage(1) }} />
                    <FilterGroup label="Category" options={['all','featured','trending']} active={filterCategory} onChange={v => { setFilterCat(v as any);   setCurrentPage(1) }} />
                  </div>
                )}
              </div>

              {/* Table */}
              <div style={{ background:'rgba(255,255,255,0.015)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'70px 1fr 90px 70px 100px 110px 130px', gap:'0.75rem', padding:'0.85rem 1.25rem', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'center' }}>
                  {['POSTER','TITLE','RATING','VIEWS','STATUS','BADGES','ACTIONS'].map(h => (
                    <div key={h} style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:800, letterSpacing:'0.1em' }}>{h}</div>
                  ))}
                </div>

                {loading && (
                  <div style={{ padding:'3rem', textAlign:'center' }}>
                    <Loader2 style={{ width:36, height:36, color:'#FF6200', animation:'spin 1s linear infinite', margin:'0 auto 0.75rem' }} />
                    <p style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>Loading series…</p>
                  </div>
                )}

                {!loading && series.length === 0 && !tableError && (
                  <div style={{ padding:'3rem', textAlign:'center' }}>
                    <Tv style={{ width:44, height:44, color:'rgba(255,255,255,0.1)', margin:'0 auto 0.75rem' }} />
                    <p style={{ color:'var(--text-muted)', marginBottom:'1rem' }}>No series found</p>
                    <button onClick={() => setAddModal(true)} className="btn-fire">Add First Series</button>
                  </div>
                )}

                {!loading && series.map((item, idx) => (
                  <div key={item.id}
                    style={{ display:'grid', gridTemplateColumns:'70px 1fr 90px 70px 100px 110px 130px', gap:'0.75rem', padding:'0.9rem 1.25rem', borderBottom: idx < series.length-1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems:'center', transition:'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                    onMouseOut={e => e.currentTarget.style.background='transparent'}
                  >
                    <div style={{ width:52, height:70, borderRadius:8, overflow:'hidden', background:'rgba(255,255,255,0.05)', flexShrink:0 }}>
                      {item.poster_url
                        ? <Image src={item.poster_url} alt={item.title} width={52} height={70} style={{ width:'100%', height:'100%', objectFit:'cover' }} unoptimized />
                        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><Tv style={{ width:18, height:18, color:'rgba(255,255,255,0.15)' }} /></div>
                      }
                    </div>

                    <div style={{ minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:'0.9rem', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'0.2rem' }}>{item.title}</p>
                      <div style={{ display:'flex', gap:'0.5rem', fontSize:'0.72rem', color:'var(--text-muted)', flexWrap:'wrap' }}>
                        {item.release_year && <span>{item.release_year}</span>}
                        {item.language    && <span>{item.language}</span>}
                        {item.genre?.length ? <span>{item.genre.slice(0,2).join(', ')}</span> : null}
                      </div>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                      <Star style={{ width:13, height:13, color:'#FFB733', fill:'#FFB733' }} />
                      <span style={{ color:'#FFB733', fontWeight:700, fontSize:'0.88rem' }}>{item.admin_rating || item.rating || '—'}</span>
                    </div>

                    <span style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>
                      {item.view_count >= 1000 ? `${(item.view_count/1000).toFixed(1)}K` : item.view_count || 0}
                    </span>

                    <button onClick={() => toggle(item, 'is_published')}
                      style={{ padding:'0.3rem 0.7rem', borderRadius:9999, border:'none', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', fontFamily:'Outfit,sans-serif', background: item.is_published?'rgba(34,197,94,0.14)':'rgba(245,158,11,0.14)', color: item.is_published?'#22c55e':'#f59e0b' }}>
                      {item.is_published ? 'Published' : 'Draft'}
                    </button>

                    <div style={{ display:'flex', gap:'0.3rem' }}>
                      <IconToggle active={item.is_featured} onClick={() => toggle(item,'is_featured')} title="Featured" activeColor="rgba(255,183,51,0.3)"  icon={<Sparkles   style={{ width:14, height:14 }} />} />
                      <IconToggle active={item.is_trending} onClick={() => toggle(item,'is_trending')} title="Trending" activeColor="rgba(239,68,68,0.3)"    icon={<TrendingUp style={{ width:14, height:14 }} />} />
                    </div>

                    <div style={{ display:'flex', gap:'0.3rem' }}>
                      <Link href={`/series/${item.slug}`}>
                        <button title="View" style={actionBtn}><Eye style={{ width:14, height:14 }} /></button>
                      </Link>
                      <Link href={`/admin/series/${item.id}/episodes`}>
                        <button title="Episodes" style={{ ...actionBtn, background:'rgba(56,189,248,0.1)', borderColor:'rgba(56,189,248,0.25)', color:'#38BDF8' }}>
                          <List style={{ width:14, height:14 }} />
                        </button>
                      </Link>
                      <button title="Edit" onClick={() => openEdit(item)}
                        style={{ ...actionBtn, background:'rgba(255,98,0,0.12)', borderColor:'rgba(255,140,0,0.25)', color:'#FFB733' }}>
                        <Edit style={{ width:14, height:14 }} />
                      </button>
                      <button title="Delete" onClick={() => { setItemToDelete(item); setDeleteModal(true) }}
                        style={{ ...actionBtn, background:'rgba(239,68,68,0.1)', borderColor:'rgba(239,68,68,0.2)', color:'#f87171' }}>
                        <Trash2 style={{ width:14, height:14 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', marginTop:'1.75rem' }}>
                  <button onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} style={{ ...pagBtn, opacity: currentPage===1?0.4:1 }}><ChevronLeft style={{ width:16, height:16 }} /></button>
                  {Array.from({ length: Math.min(5,totalPages) }, (_,i) => {
                    const n = totalPages<=5 ? i+1 : currentPage<=3 ? i+1 : currentPage>=totalPages-2 ? totalPages-4+i : currentPage-2+i
                    return <button key={n} onClick={() => setCurrentPage(n)} style={{ ...pagBtn, background: currentPage===n?'rgba(255,98,0,0.22)':'rgba(255,255,255,0.04)', color: currentPage===n?'#FFB733':'white', fontWeight: currentPage===n?700:400, border: currentPage===n?'1px solid rgba(255,140,0,0.35)':'1px solid rgba(255,255,255,0.08)' }}>{n}</button>
                  })}
                  <button onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} style={{ ...pagBtn, opacity: currentPage===totalPages?0.4:1 }}><ChevronRight style={{ width:16, height:16 }} /></button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ══ ADD MODAL ══ */}
      {addModal && (
        <ModalShell onClose={() => setAddModal(false)} title="Add New Series" icon={<Plus style={{ width:17, height:17, color:'#FF8C00' }} />}>
          <SeriesForm form={af} setForm={setAf} tab={editTab} setTab={setEditTab} />
          <div style={{ padding:'0.9rem 1.4rem', borderTop:'1px solid rgba(255,140,0,0.1)', display:'flex', gap:'0.65rem', justifyContent:'flex-end', flexShrink:0 }}>
            <button onClick={() => setAddModal(false)} className="btn-ghost" style={{ padding:'0.65rem 1.25rem', fontSize:'0.86rem' }}>Cancel</button>
            <button onClick={addSeries} disabled={addLoading || !af.title.trim()} className="btn-fire"
              style={{ padding:'0.65rem 1.5rem', fontSize:'0.86rem', display:'flex', alignItems:'center', gap:'0.4rem', opacity: addLoading||!af.title.trim()?0.6:1 }}>
              {addLoading ? <><Loader2 style={{ width:15, height:15, animation:'spin 1s linear infinite' }} /> Creating…</> : <><Plus style={{ width:15, height:15 }} /> Create Series</>}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ══ EDIT MODAL ══ */}
      {editModal && ef && editingItem && (
        <ModalShell onClose={() => setEditModal(false)} title="Edit Series" subtitle={editingItem.title} icon={<Edit style={{ width:17, height:17, color:'#FF8C00' }} />}>
          <SeriesForm form={ef} setForm={setEf} tab={editTab} setTab={setEditTab} />
          <div style={{ padding:'0.9rem 1.4rem', borderTop:'1px solid rgba(255,140,0,0.1)', display:'flex', gap:'0.65rem', justifyContent:'flex-end', flexShrink:0 }}>
            <button onClick={() => setEditModal(false)} className="btn-ghost" style={{ padding:'0.65rem 1.25rem', fontSize:'0.86rem' }}>Cancel</button>
            <button onClick={saveEdit} disabled={editLoading || !ef.title.trim()} className="btn-fire"
              style={{ padding:'0.65rem 1.5rem', fontSize:'0.86rem', display:'flex', alignItems:'center', gap:'0.4rem', opacity: editLoading||!ef.title.trim()?0.6:1 }}>
              {editSuccess ? <><Check style={{ width:15, height:15 }} /> Saved!</>
                : editLoading ? <><Loader2 style={{ width:15, height:15, animation:'spin 1s linear infinite' }} /> Saving…</>
                : <><Save style={{ width:15, height:15 }} /> Save Changes</>}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ══ DELETE MODAL ══ */}
      {deleteModal && itemToDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ width:'100%', maxWidth:400, background:'rgba(14,14,24,0.99)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:20, padding:'2rem', textAlign:'center', boxShadow:'0 32px 64px rgba(0,0,0,0.7)' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(239,68,68,0.1)', border:'2px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
              <AlertTriangle style={{ width:28, height:28, color:'#ef4444' }} />
            </div>
            <h3 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.5rem', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Delete Series?</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.88rem', marginBottom:'1.5rem', lineHeight:1.55 }}>
              "<strong style={{ color:'white' }}>{itemToDelete.title}</strong>" will be permanently removed.
            </p>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => { setDeleteModal(false); setItemToDelete(null) }} className="btn-ghost" style={{ flex:1, padding:'0.75rem' }}>Cancel</button>
              <button onClick={doDelete} disabled={actionLoading === itemToDelete.id}
                style={{ flex:1, padding:'0.75rem', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, color:'#f87171', cursor:'pointer', fontWeight:700, fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', fontFamily:'Outfit,sans-serif' }}>
                {actionLoading === itemToDelete.id ? <Loader2 style={{ width:17, height:17, animation:'spin 1s linear infinite' }} /> : <><Trash2 style={{ width:16, height:16 }} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, padding:'0.85rem 1.25rem', borderRadius:14, background: toast.type==='ok'?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)', border:`1px solid ${toast.type==='ok'?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}`, color: toast.type==='ok'?'#4ADE80':'#f87171', fontSize:'0.88rem', fontWeight:600, backdropFilter:'blur(16px)', display:'flex', alignItems:'center', gap:'0.5rem', boxShadow:'0 8px 30px rgba(0,0,0,0.4)' }}>
          {toast.type==='ok' ? <CheckCircle style={{ width:16, height:16 }} /> : <X style={{ width:16, height:16 }} />}
          {toast.msg}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes livePulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp   { from { opacity:0; transform:translateY(18px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
      `}</style>
    </div>
  )
}

/* ── Modal shell ── */
function ModalShell({ children, onClose, title, subtitle, icon }: { children:React.ReactNode; onClose:()=>void; title:string; subtitle?:string; icon:React.ReactNode }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', animation:'fadeIn 0.18s ease' }}>
      <div style={{ width:'100%', maxWidth:680, maxHeight:'90vh', display:'flex', flexDirection:'column', background:'rgba(12,12,20,0.99)', border:'1px solid rgba(255,140,0,0.2)', borderRadius:22, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.75)', animation:'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ padding:'1.1rem 1.4rem', borderBottom:'1px solid rgba(255,140,0,0.12)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,98,0,0.05)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
            {icon}
            <div>
              <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.06em', lineHeight:1 }}>{title}</p>
              {subtitle && <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4, borderRadius:8 }}><X style={{ width:17, height:17 }} /></button>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>{children}</div>
      </div>
    </div>
  )
}

/* ── Series Form ── */
function SeriesForm({ form, setForm, tab, setTab }: { form:EditForm; setForm:(p:Partial<EditForm>)=>void; tab:string; setTab:(t:any)=>void }) {
  return (
    <>
      <div style={{ display:'flex', padding:'0.6rem 1.4rem 0', gap:'0.25rem', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        {([
          { id:'basic', label:'Basic Info', icon: Tv       },
          { id:'media', label:'Media',      icon: Video    },
          { id:'meta',  label:'Genre/Cast', icon: Users    },
          { id:'flags', label:'Settings',   icon: Settings },
        ] as { id:string; label:string; icon:any }[]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ display:'flex', alignItems:'center', gap:'0.35rem', padding:'0.55rem 0.85rem', borderRadius:'8px 8px 0 0', border:'none', background: tab===id?'rgba(255,98,0,0.12)':'transparent', borderBottom: tab===id?'2px solid #FF8C00':'2px solid transparent', color: tab===id?'#FFB733':'var(--text-muted)', cursor:'pointer', fontSize:'0.8rem', fontWeight:700, fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>
            <Icon style={{ width:13, height:13 }} />{label}
          </button>
        ))}
      </div>
      <div style={{ padding:'1.4rem' }}>
        {tab === 'basic' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <FRow label="Title *"><FIn value={form.title} onChange={v => setForm({ title:v })} placeholder="Series title" /></FRow>
            <FRow label="Slug"><FIn value={form.slug} onChange={v => setForm({ slug:v })} placeholder="url-friendly-slug" /></FRow>
            <FRow label="Description"><textarea value={form.description} onChange={e => setForm({ description:e.target.value })} placeholder="Series synopsis…" rows={4} style={{ ...inputSt, resize:'vertical', minHeight:90 }} /></FRow>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              <FRow label="Year"><FIn value={form.release_year} onChange={v => setForm({ release_year:v })} placeholder="2024" type="number" /></FRow>
              <FRow label="Admin Rating"><FIn value={form.admin_rating} onChange={v => setForm({ admin_rating:v })} placeholder="8.5" type="number" /></FRow>
            </div>
            <FRow label="Language">
              <select value={form.language} onChange={e => setForm({ language:e.target.value })} style={inputSt}>
                <option value="" style={{ background:'#0e0e18' }}>Select language</option>
                {LANGUAGES.map(l => <option key={l} value={l} style={{ background:'#0e0e18' }}>{l}</option>)}
              </select>
            </FRow>
          </div>
        )}
        {tab === 'media' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <FRow label="Poster URL">
              <FIn value={form.poster_url} onChange={v => setForm({ poster_url:v })} placeholder="https://…/poster.jpg" />
              {form.poster_url && <div style={{ marginTop:'0.5rem', width:70, height:95, borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,140,0,0.2)' }}><Image src={form.poster_url} alt="poster" width={70} height={95} style={{ objectFit:'cover', width:'100%', height:'100%' }} unoptimized /></div>}
            </FRow>
            <FRow label="Backdrop URL">
              <FIn value={form.backdrop_url} onChange={v => setForm({ backdrop_url:v })} placeholder="https://…/backdrop.jpg" />
              {form.backdrop_url && <div style={{ marginTop:'0.5rem', width:'100%', height:90, borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,140,0,0.2)' }}><Image src={form.backdrop_url} alt="backdrop" width={600} height={90} style={{ objectFit:'cover', width:'100%', height:'100%' }} unoptimized /></div>}
            </FRow>
          </div>
        )}
        {tab === 'meta' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <FRow label="Director"><FIn value={form.director} onChange={v => setForm({ director:v })} placeholder="Director name" /></FRow>
            <FRow label="Genres (comma separated)">
              <FIn value={form.genre} onChange={v => setForm({ genre:v })} placeholder="Action, Thriller, Drama" />
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.35rem', marginTop:'0.5rem' }}>
                {GENRES.map(g => {
                  const active = form.genre.split(',').map(s=>s.trim()).includes(g)
                  return (
                    <button key={g} type="button" onClick={() => {
                      const curr = form.genre.split(',').map(s=>s.trim()).filter(Boolean)
                      const next = active ? curr.filter(x=>x!==g) : [...curr, g]
                      setForm({ genre: next.join(', ') })
                    }}
                      style={{ padding:'0.22rem 0.65rem', borderRadius:9999, border:`1px solid ${active?'rgba(255,140,0,0.4)':'rgba(255,255,255,0.09)'}`, background: active?'rgba(255,98,0,0.15)':'transparent', color: active?'#FFB733':'var(--text-muted)', fontSize:'0.72rem', fontWeight:600, cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>
                      {g}
                    </button>
                  )
                })}
              </div>
            </FRow>
          </div>
        )}
        {tab === 'flags' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {([
              { key:'is_published', label:'Published', desc:'Visible to all users on the platform',     color:'#22c55e' },
              { key:'is_featured',  label:'Featured',  desc:'Shown in the Featured Collection section', color:'#FFB733' },
              { key:'is_trending',  label:'Trending',  desc:'Shown in the Trending Now section',        color:'#ef4444' },
            ] as { key:keyof EditForm; label:string; desc:string; color:string }[]).map(({ key, label, desc, color }) => (
              <div key={key} onClick={() => setForm({ [key]: !form[key] } as any)}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', borderRadius:14, border:`1px solid ${(form[key] as boolean)?color+'44':'rgba(255,255,255,0.07)'}`, background:(form[key] as boolean)?color+'11':'rgba(255,255,255,0.02)', cursor:'pointer', transition:'all 0.18s' }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:'0.9rem', color:(form[key] as boolean)?color:'var(--text-primary)', marginBottom:'0.2rem' }}>{label}</p>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{desc}</p>
                </div>
                <div style={{ width:44, height:24, borderRadius:12, background:(form[key] as boolean)?color:'rgba(255,255,255,0.1)', position:'relative', transition:'background 0.25s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left:(form[key] as boolean)?23:3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Tiny helpers ── */
function FilterGroup({ label, options, active, onChange }: { label:string; options:string[]; active:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.5rem' }}>{label}</p>
      <div style={{ display:'flex', gap:'0.4rem' }}>
        {options.map(o => <button key={o} onClick={() => onChange(o)} style={{ padding:'0.4rem 0.85rem', borderRadius:8, border:'none', background: active===o?'rgba(255,98,0,0.2)':'rgba(255,255,255,0.05)', color: active===o?'#FFB733':'var(--text-muted)', cursor:'pointer', fontSize:'0.8rem', fontWeight:600, textTransform:'capitalize', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>{o}</button>)}
      </div>
    </div>
  )
}
function IconToggle({ active, onClick, title, activeColor, icon }: { active:boolean; onClick:()=>void; title:string; activeColor:string; icon:React.ReactNode }) {
  return <button onClick={onClick} title={title} style={{ padding:'0.3rem', borderRadius:7, border:'none', cursor:'pointer', background: active?activeColor:'rgba(255,255,255,0.05)', color: active?'white':'rgba(255,255,255,0.25)', transition:'all 0.15s' }}>{icon}</button>
}
function FRow({ label, children }: { label:string; children:React.ReactNode }) {
  return <div><label style={{ display:'block', fontSize:'0.74rem', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>{label}</label>{children}</div>
}
function FIn({ value, onChange, placeholder, type='text' }: { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputSt} onFocus={e => e.target.style.borderColor='rgba(255,140,0,0.45)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
}

const inputSt:   React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.7rem 0.9rem', color:'white', fontSize:'0.87rem', outline:'none', fontFamily:'Outfit,sans-serif', transition:'border-color 0.2s', boxSizing:'border-box' }
const actionBtn: React.CSSProperties = { padding:'0.4rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'rgba(255,255,255,0.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }
const pagBtn:    React.CSSProperties = { width:36, height:36, borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', fontSize:'0.85rem' }