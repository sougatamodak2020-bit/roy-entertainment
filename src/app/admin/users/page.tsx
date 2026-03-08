// src/app/admin/users/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Users, Search, Filter, Edit, Trash2, Eye, Shield, Crown,
  ChevronLeft, ChevronRight, CheckCircle, Loader2, RefreshCw,
  Upload, BarChart3, Home, Settings, LogOut, Menu, X, AlertTriangle,
  Check, Save, Film, Tv, TrendingUp, Mail, Calendar, User,
  Ban, UserCheck, UserX, MoreHorizontal, Star, Lock, Unlock,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

/* ── Types ── */
interface Profile {
  id: string
  email?: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  role: 'admin' | 'creator' | 'user'
  is_banned?: boolean
  bio?: string | null
  upload_count?: number
  created_at: string
  updated_at?: string
}

interface EditForm {
  full_name: string
  username: string
  role: 'admin' | 'creator' | 'user'
  bio: string
  is_banned: boolean
}

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin',          icon: BarChart3  },
  { label: 'Movies',    href: '/admin/movies',    icon: Film       },
  { label: 'Series',    href: '/admin/series',    icon: Tv         },
  { label: 'Upload',    href: '/admin/upload',    icon: Upload     },
  { label: 'Users',     href: '/admin/users',     icon: Users,     active: true },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings   },
]

const ROLES = ['user', 'creator', 'admin'] as const

const ROLE_CONFIG = {
  admin:   { color: '#FF8C00', bg: 'rgba(255,140,0,0.15)',   border: 'rgba(255,140,0,0.3)',   icon: Crown   },
  creator: { color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', icon: Star    },
  user:    { color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)', icon: User },
}

const ITEMS = 15

export default function AdminUsersPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [users,          setUsers]          = useState<Profile[]>([])
  const [loading,        setLoading]        = useState(true)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [filterRole,     setFilterRole]     = useState<'all'|'admin'|'creator'|'user'>('all')
  const [filterStatus,   setFilterStatus]   = useState<'all'|'active'|'banned'>('all')
  const [sortBy,         setSortBy]         = useState<'newest'|'oldest'|'name'|'role'>('newest')
  const [currentPage,    setCurrentPage]    = useState(1)
  const [totalCount,     setTotalCount]     = useState(0)
  const [actionLoading,  setActionLoading]  = useState<string | null>(null)
  const [sidebarOpen,    setSidebarOpen]    = useState(true)
  const [showFilters,    setShowFilters]    = useState(false)
  const [liveIndicator,  setLive]           = useState(false)
  const [toast,          setToast]          = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null)

  const [deleteModal,    setDeleteModal]    = useState(false)
  const [userToDelete,   setUserToDelete]   = useState<Profile | null>(null)

  const [editModal,      setEditModal]      = useState(false)
  const [editingUser,    setEditingUser]    = useState<Profile | null>(null)
  const [editForm,       setEditForm]       = useState<EditForm | null>(null)
  const [editLoading,    setEditLoading]    = useState(false)
  const [editSuccess,    setEditSuccess]    = useState(false)

  const [viewModal,      setViewModal]      = useState(false)
  const [viewingUser,    setViewingUser]    = useState<Profile | null>(null)
  const [userMovies,     setUserMovies]     = useState<any[]>([])
  const [userMoviesLoad, setUserMoviesLoad] = useState(false)

  const channelRef = useRef<any>(null)

  useEffect(() => {
    initPage()
    return () => { channelRef.current?.unsubscribe() }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [searchQuery, filterRole, filterStatus, sortBy, currentPage])

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const initPage = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!p || p.role !== 'admin') { router.push('/'); return }
    setCurrentUserId(user.id)
    setupRealtime()
  }

  /* ── Realtime ── */
  const setupRealtime = () => {
    channelRef.current?.unsubscribe()
    channelRef.current = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        setLive(true)
        setTimeout(() => setLive(false), 2000)
        loadUsers()
      })
      .subscribe()
  }

  /* ── Load ── */
  const loadUsers = async () => {
    setLoading(true)
    try {
      let q = supabase.from('profiles').select('*', { count: 'exact' })

      if (searchQuery) q = q.or(`full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      if (filterRole !== 'all')   q = q.eq('role', filterRole)
      if (filterStatus === 'banned') q = q.eq('is_banned', true)
      if (filterStatus === 'active') q = q.eq('is_banned', false)

      switch (sortBy) {
        case 'newest': q = q.order('created_at', { ascending: false }); break
        case 'oldest': q = q.order('created_at', { ascending: true  }); break
        case 'name':   q = q.order('full_name',  { ascending: true  }); break
        case 'role':   q = q.order('role',       { ascending: true  }); break
      }

      const from = (currentPage - 1) * ITEMS
      q = q.range(from, from + ITEMS - 1)

      const { data, error, count } = await q
      if (error) throw error
      setUsers(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Quick role change ── */
  const changeRole = async (user: Profile, role: Profile['role']) => {
    if (user.id === currentUserId && role !== 'admin') {
      showToast("You can't demote yourself!", 'err'); return
    }
    setActionLoading(user.id + 'role')
    const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role } : u))
      showToast(`${user.full_name || user.username || 'User'} is now ${role}`)
    } else {
      showToast('Failed to update role', 'err')
    }
    setActionLoading(null)
  }

  /* ── Toggle ban ── */
  const toggleBan = async (user: Profile) => {
    if (user.id === currentUserId) { showToast("You can't ban yourself!", 'err'); return }
    setActionLoading(user.id + 'ban')
    const newBanned = !user.is_banned
    const { error } = await supabase.from('profiles').update({ is_banned: newBanned }).eq('id', user.id)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: newBanned } : u))
      showToast(newBanned ? `${user.full_name || 'User'} banned.` : `${user.full_name || 'User'} unbanned.`, newBanned ? 'err' : 'ok')
    }
    setActionLoading(null)
  }

  /* ── Open Edit ── */
  const openEdit = (user: Profile) => {
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name || '',
      username:  user.username  || '',
      role:      user.role,
      bio:       user.bio       || '',
      is_banned: user.is_banned || false,
    })
    setEditSuccess(false)
    setEditModal(true)
  }

  /* ── Save Edit ── */
  const saveEdit = async () => {
    if (!editingUser || !editForm) return
    if (editingUser.id === currentUserId && editForm.role !== 'admin') {
      showToast("You can't demote yourself!", 'err'); return
    }
    setEditLoading(true)
    try {
      const payload = {
        full_name: editForm.full_name.trim() || null,
        username:  editForm.username.trim()  || null,
        role:      editForm.role,
        bio:       editForm.bio.trim()       || null,
        is_banned: editForm.is_banned,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('profiles').update(payload).eq('id', editingUser.id)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...payload } : u))
      setEditSuccess(true)
      showToast('User updated!')
      setTimeout(() => { setEditModal(false); setEditSuccess(false) }, 900)
    } catch (err: any) {
      showToast('Save failed: ' + (err.message || err), 'err')
    } finally {
      setEditLoading(false)
    }
  }

  /* ── View profile ── */
  const openView = async (user: Profile) => {
    setViewingUser(user)
    setViewModal(true)
    setUserMoviesLoad(true)
    const { data } = await supabase
      .from('movies')
      .select('id, title, poster_url, view_count, is_published, created_at')
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
    setUserMovies(data || [])
    setUserMoviesLoad(false)
  }

  /* ── Delete ── */
  const doDelete = async () => {
    if (!userToDelete) return
    if (userToDelete.id === currentUserId) { showToast("You can't delete yourself!", 'err'); return }
    setActionLoading(userToDelete.id)
    const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id)
    if (!error) {
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id))
      setTotalCount(p => p - 1)
      showToast(`${userToDelete.full_name || 'User'} deleted.`, 'err')
    }
    setDeleteModal(false)
    setUserToDelete(null)
    setActionLoading(null)
  }

  /* ── Stats ── */
  const adminCount   = users.filter(u => u.role === 'admin').length
  const creatorCount = users.filter(u => u.role === 'creator').length
  const bannedCount  = users.filter(u => u.is_banned).length

  const totalPages = Math.ceil(totalCount / ITEMS)
  const ef  = editForm
  const setEf = (p: Partial<EditForm>) => setEditForm(prev => prev ? { ...prev, ...p } : prev)

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
                  <span className="gradient-text">Users</span>
                </h1>
                {/* Live indicator */}
                <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', padding:'0.2rem 0.55rem', background: liveIndicator ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${liveIndicator ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius:9999, transition:'all 0.3s' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', animation: liveIndicator ? 'livePulse 1s ease infinite' : 'none' }} />
                  <span style={{ fontSize:'0.65rem', fontWeight:700, color: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', letterSpacing:'0.05em' }}>LIVE</span>
                </div>
              </div>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{totalCount} registered users</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.65rem', alignItems:'center' }}>
            <button onClick={loadUsers} disabled={loading} className="icon-btn" title="Refresh">
              <RefreshCw style={{ width:16, height:16, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </header>

        <div style={{ padding:'2rem' }}>

          {/* ── Stats ── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:'1rem', marginBottom:'1.75rem' }}>
            {[
              { label:'Total Users',  val: totalCount,    color:'#FF8C00', icon: Users      },
              { label:'Admins',       val: adminCount,    color:'#FFB733', icon: Crown      },
              { label:'Creators',     val: creatorCount,  color:'#A78BFA', icon: Star       },
              { label:'Banned',       val: bannedCount,   color:'#ef4444', icon: Ban        },
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

          {/* ── Search + Filters ── */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'1.25rem', marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:240 }}>
                <Search style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'var(--text-muted)' }} />
                <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }} placeholder="Search name, username, email…"
                  style={{ width:'100%', padding:'0.7rem 1rem 0.7rem 38px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:10, color:'white', fontSize:'0.88rem', outline:'none', boxSizing:'border-box', fontFamily:'Outfit,sans-serif' }} />
              </div>
              <button onClick={() => setShowFilters(f => !f)}
                style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.7rem 1rem', background: showFilters ? 'rgba(255,98,0,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${showFilters ? 'rgba(255,140,0,0.35)' : 'rgba(255,255,255,0.09)'}`, borderRadius:10, color: showFilters ? '#FFB733' : 'var(--text-secondary)', cursor:'pointer', fontSize:'0.85rem', fontWeight:600, fontFamily:'Outfit,sans-serif' }}>
                <Filter style={{ width:15, height:15 }} /> Filters
              </button>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                style={{ padding:'0.7rem 1rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:10, color:'white', outline:'none', cursor:'pointer', fontSize:'0.85rem', fontFamily:'Outfit,sans-serif' }}>
                <option value="newest" style={{ background:'#0e0e18' }}>Newest First</option>
                <option value="oldest" style={{ background:'#0e0e18' }}>Oldest First</option>
                <option value="name"   style={{ background:'#0e0e18' }}>Name A–Z</option>
                <option value="role"   style={{ background:'#0e0e18' }}>By Role</option>
              </select>
            </div>

            {showFilters && (
              <div style={{ display:'flex', gap:'1.5rem', marginTop:'1rem', paddingTop:'1rem', borderTop:'1px solid rgba(255,255,255,0.05)', flexWrap:'wrap' }}>
                <FilterGroup label="Role" options={['all','admin','creator','user']} active={filterRole} onChange={v => { setFilterRole(v as any); setCurrentPage(1) }} />
                <FilterGroup label="Status" options={['all','active','banned']} active={filterStatus} onChange={v => { setFilterStatus(v as any); setCurrentPage(1) }} />
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div style={{ background:'rgba(255,255,255,0.015)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, overflow:'hidden' }}>

            {/* Head */}
            <div style={{ display:'grid', gridTemplateColumns:'52px 1fr 120px 120px 100px 130px', gap:'0.75rem', padding:'0.85rem 1.25rem', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'center' }}>
              {['AVATAR', 'USER', 'ROLE', 'STATUS', 'JOINED', 'ACTIONS'].map(h => (
                <div key={h} style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:800, letterSpacing:'0.1em' }}>{h}</div>
              ))}
            </div>

            {loading && (
              <div style={{ padding:'3rem', textAlign:'center' }}>
                <Loader2 style={{ width:36, height:36, color:'#FF6200', animation:'spin 1s linear infinite', margin:'0 auto 0.75rem' }} />
                <p style={{ color:'var(--text-muted)', fontSize:'0.88rem' }}>Loading users…</p>
              </div>
            )}

            {!loading && users.length === 0 && (
              <div style={{ padding:'3rem', textAlign:'center' }}>
                <Users style={{ width:44, height:44, color:'rgba(255,255,255,0.1)', margin:'0 auto 0.75rem' }} />
                <p style={{ color:'var(--text-muted)' }}>No users found</p>
              </div>
            )}

            {!loading && users.map((user, idx) => {
              const rc    = ROLE_CONFIG[user.role] || ROLE_CONFIG.user
              const RIcon = rc.icon
              const initials = (user.full_name || user.username || user.email || 'U').slice(0,2).toUpperCase()
              const joined = new Date(user.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' })
              const isSelf = user.id === currentUserId

              return (
                <div key={user.id}
                  style={{ display:'grid', gridTemplateColumns:'52px 1fr 120px 120px 100px 130px', gap:'0.75rem', padding:'0.9rem 1.25rem', borderBottom: idx < users.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems:'center', transition:'background 0.15s', opacity: user.is_banned ? 0.65 : 1 }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar */}
                  <div style={{ width:40, height:40, borderRadius:'50%', overflow:'hidden', background:`linear-gradient(135deg,${rc.color}60,${rc.color}30)`, border:`2px solid ${rc.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}>
                    {user.avatar_url
                      ? <Image src={user.avatar_url} alt={initials} width={40} height={40} style={{ width:'100%', height:'100%', objectFit:'cover' }} unoptimized />
                      : <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'0.95rem', color: rc.color }}>{initials}</span>
                    }
                    {isSelf && <span style={{ position:'absolute', bottom:-1, right:-1, width:12, height:12, borderRadius:'50%', background:'#4ADE80', border:'2px solid rgba(8,8,14,1)' }} />}
                  </div>

                  {/* User info */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.45rem' }}>
                      <p style={{ fontWeight:700, fontSize:'0.9rem', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {user.full_name || user.username || 'Unnamed User'}
                      </p>
                      {isSelf && <span style={{ fontSize:'0.65rem', color:'#4ADE80', fontWeight:700, border:'1px solid rgba(74,222,128,0.3)', borderRadius:9999, padding:'0.1rem 0.4rem', flexShrink:0 }}>YOU</span>}
                    </div>
                    <p style={{ fontSize:'0.73rem', color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {user.username ? `@${user.username}` : (user.email || user.id.slice(0,8)+'…')}
                    </p>
                  </div>

                  {/* Role dropdown */}
                  <select
                    value={user.role}
                    onChange={e => changeRole(user, e.target.value as Profile['role'])}
                    disabled={isSelf || actionLoading === user.id+'role'}
                    style={{ padding:'0.3rem 0.5rem', background: rc.bg, border:`1px solid ${rc.border}`, borderRadius:8, color: rc.color, fontSize:'0.78rem', fontWeight:700, cursor: isSelf ? 'not-allowed' : 'pointer', fontFamily:'Outfit,sans-serif', outline:'none', opacity: isSelf ? 0.6 : 1 }}>
                    {ROLES.map(r => <option key={r} value={r} style={{ background:'#0e0e18' }}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>

                  {/* Status */}
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'0.35rem', padding:'0.28rem 0.7rem', borderRadius:9999, fontSize:'0.72rem', fontWeight:700, background: user.is_banned ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: user.is_banned ? '#f87171' : '#4ADE80', border:`1px solid ${user.is_banned ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.2)'}` }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background: user.is_banned ? '#f87171' : '#4ADE80' }} />
                    {user.is_banned ? 'Banned' : 'Active'}
                  </span>

                  {/* Joined */}
                  <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{joined}</span>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:'0.3rem' }}>
                    <button title="View Profile" onClick={() => openView(user)} style={actionBtn}>
                      <Eye style={{ width:14, height:14 }} />
                    </button>
                    <button title="Edit" onClick={() => openEdit(user)}
                      style={{ ...actionBtn, background:'rgba(255,98,0,0.12)', borderColor:'rgba(255,140,0,0.25)', color:'#FFB733' }}>
                      <Edit style={{ width:14, height:14 }} />
                    </button>
                    <button title={user.is_banned ? 'Unban' : 'Ban'} onClick={() => toggleBan(user)} disabled={isSelf}
                      style={{ ...actionBtn, background: user.is_banned ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', borderColor: user.is_banned ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.25)', color: user.is_banned ? '#4ADE80' : '#f59e0b', opacity: isSelf ? 0.35 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
                      {user.is_banned ? <Unlock style={{ width:14, height:14 }} /> : <Lock style={{ width:14, height:14 }} />}
                    </button>
                    <button title="Delete" onClick={() => { setUserToDelete(user); setDeleteModal(true) }} disabled={isSelf}
                      style={{ ...actionBtn, background:'rgba(239,68,68,0.1)', borderColor:'rgba(239,68,68,0.2)', color:'#f87171', opacity: isSelf ? 0.35 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}>
                      <Trash2 style={{ width:14, height:14 }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', marginTop:'1.75rem' }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} style={{ ...pagBtn, opacity: currentPage === 1 ? 0.4 : 1 }}><ChevronLeft style={{ width:16, height:16 }} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const n = totalPages <= 5 ? i+1 : currentPage <= 3 ? i+1 : currentPage >= totalPages-2 ? totalPages-4+i : currentPage-2+i
                return <button key={n} onClick={() => setCurrentPage(n)} style={{ ...pagBtn, background: currentPage===n ? 'rgba(255,98,0,0.22)' : 'rgba(255,255,255,0.04)', color: currentPage===n ? '#FFB733' : 'white', fontWeight: currentPage===n ? 700 : 400, border: currentPage===n ? '1px solid rgba(255,140,0,0.35)' : '1px solid rgba(255,255,255,0.08)' }}>{n}</button>
              })}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} style={{ ...pagBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}><ChevronRight style={{ width:16, height:16 }} /></button>
            </div>
          )}
        </div>
      </main>

      {/* ══ VIEW PROFILE MODAL ══ */}
      {viewModal && viewingUser && (
        <div onClick={e => { if (e.target === e.currentTarget) setViewModal(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', animation:'fadeIn 0.18s ease' }}>
          <div style={{ width:'100%', maxWidth:560, maxHeight:'88vh', display:'flex', flexDirection:'column', background:'rgba(12,12,20,0.99)', border:'1px solid rgba(255,140,0,0.2)', borderRadius:22, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.75)', animation:'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>

            {/* Profile header */}
            <div style={{ padding:'1.5rem', background:'linear-gradient(135deg,rgba(255,98,0,0.08),rgba(255,183,51,0.04))', borderBottom:'1px solid rgba(255,140,0,0.1)', display:'flex', alignItems:'center', gap:'1rem', flexShrink:0 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:`linear-gradient(135deg,${ROLE_CONFIG[viewingUser.role]?.color||'#FF8C00'}60,transparent)`, border:`2px solid ${ROLE_CONFIG[viewingUser.role]?.border||'rgba(255,140,0,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {viewingUser.avatar_url
                  ? <Image src={viewingUser.avatar_url} alt="" width={64} height={64} style={{ width:'100%', height:'100%', objectFit:'cover' }} unoptimized />
                  : <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.5rem', color: ROLE_CONFIG[viewingUser.role]?.color || '#FF8C00' }}>{(viewingUser.full_name||viewingUser.username||'U').slice(0,2).toUpperCase()}</span>
                }
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
                  <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.4rem', letterSpacing:'0.05em', lineHeight:1 }}>{viewingUser.full_name || viewingUser.username || 'Unnamed'}</h2>
                  <RoleBadge role={viewingUser.role} />
                  {viewingUser.is_banned && <span style={{ fontSize:'0.7rem', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)', borderRadius:9999, padding:'0.1rem 0.45rem', fontWeight:700 }}>BANNED</span>}
                </div>
                {viewingUser.username && <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>@{viewingUser.username}</p>}
                {viewingUser.bio && <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.55)', marginTop:'0.35rem', lineHeight:1.5 }}>{viewingUser.bio}</p>}
              </div>
              <button onClick={() => setViewModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4, alignSelf:'flex-start' }}>
                <X style={{ width:17, height:17 }} />
              </button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'1.25rem' }}>
              {/* Meta */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1.25rem' }}>
                {[
                  { label:'User ID',  value: viewingUser.id.slice(0,12)+'…' },
                  { label:'Joined',   value: new Date(viewingUser.created_at).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding:'0.75rem 1rem', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12 }}>
                    <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:'0.25rem' }}>{label}</p>
                    <p style={{ fontSize:'0.85rem', color:'white', fontWeight:600 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* User's uploads */}
              <div>
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.75rem' }}>Uploaded Films</p>
                {userMoviesLoad ? (
                  <div style={{ textAlign:'center', padding:'1.5rem' }}><Loader2 style={{ width:24, height:24, color:'#FF6200', animation:'spin 1s linear infinite', margin:'0 auto' }} /></div>
                ) : userMovies.length === 0 ? (
                  <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', padding:'1rem 0' }}>No uploads yet.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                    {userMovies.map(m => (
                      <div key={m.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:10 }}>
                        <div style={{ width:38, height:52, borderRadius:6, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.05)' }}>
                          {m.poster_url ? <Image src={m.poster_url} alt={m.title} width={38} height={52} style={{ width:'100%', height:'100%', objectFit:'cover' }} unoptimized /> : <Film style={{ width:14, height:14, color:'rgba(255,255,255,0.2)', margin:'auto' }} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:'0.85rem', fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.title}</p>
                          <p style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{new Date(m.created_at).toLocaleDateString()}</p>
                        </div>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, padding:'0.2rem 0.55rem', borderRadius:9999, background: m.is_published ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: m.is_published ? '#4ADE80' : '#f59e0b' }}>
                          {m.is_published ? 'Live' : 'Draft'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding:'0.9rem 1.25rem', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:'0.65rem', justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={() => { setViewModal(false); openEdit(viewingUser) }} className="btn-fire" style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.6rem 1.2rem', fontSize:'0.85rem' }}>
                <Edit style={{ width:14, height:14 }} /> Edit User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT MODAL ══ */}
      {editModal && ef && editingUser && (
        <div onClick={e => { if (e.target === e.currentTarget) setEditModal(false) }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', animation:'fadeIn 0.18s ease' }}>
          <div style={{ width:'100%', maxWidth:500, display:'flex', flexDirection:'column', background:'rgba(12,12,20,0.99)', border:'1px solid rgba(255,140,0,0.2)', borderRadius:22, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.75)', animation:'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>

            <div style={{ padding:'1.1rem 1.4rem', borderBottom:'1px solid rgba(255,140,0,0.12)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,98,0,0.05)', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                <Edit style={{ width:17, height:17, color:'#FF8C00' }} />
                <div>
                  <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.2rem', letterSpacing:'0.06em', lineHeight:1 }}>Edit User</p>
                  <p style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginTop:1 }}>{editingUser.full_name || editingUser.username || editingUser.id.slice(0,8)}</p>
                </div>
              </div>
              <button onClick={() => setEditModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X style={{ width:17, height:17 }} /></button>
            </div>

            <div style={{ padding:'1.4rem', display:'flex', flexDirection:'column', gap:'1rem', overflowY:'auto' }}>
              <ERow label="Full Name"><EIn value={ef.full_name} onChange={v => setEf({ full_name: v })} placeholder="Full name" /></ERow>
              <ERow label="Username"><EIn value={ef.username} onChange={v => setEf({ username: v })} placeholder="username" /></ERow>
              <ERow label="Bio"><textarea value={ef.bio} onChange={e => setEf({ bio: e.target.value })} rows={3} placeholder="User bio…" style={{ ...inputSt, resize:'vertical' }} /></ERow>
              <ERow label="Role">
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  {ROLES.map(r => {
                    const rc2 = ROLE_CONFIG[r]
                    const active = ef.role === r
                    return (
                      <button key={r} onClick={() => setEf({ role: r })}
                        disabled={editingUser.id === currentUserId && r !== 'admin'}
                        style={{ flex:1, padding:'0.6rem', borderRadius:10, border:`1px solid ${active ? rc2.border : 'rgba(255,255,255,0.07)'}`, background: active ? rc2.bg : 'rgba(255,255,255,0.02)', color: active ? rc2.color : 'var(--text-muted)', cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'Outfit,sans-serif', transition:'all 0.15s', textTransform:'capitalize', opacity: editingUser.id === currentUserId && r !== 'admin' ? 0.4 : 1 }}>
                        {r.charAt(0).toUpperCase()+r.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </ERow>

              {/* Ban toggle */}
              <div onClick={() => editingUser.id !== currentUserId && setEf({ is_banned: !ef.is_banned })}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', borderRadius:14, border:`1px solid ${ef.is_banned ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.07)'}`, background: ef.is_banned ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)', cursor: editingUser.id === currentUserId ? 'not-allowed' : 'pointer', transition:'all 0.18s', opacity: editingUser.id === currentUserId ? 0.5 : 1 }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:'0.9rem', color: ef.is_banned ? '#f87171' : 'var(--text-primary)', marginBottom:'0.2rem' }}>Banned</p>
                  <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Prevent this user from accessing the platform</p>
                </div>
                <div style={{ width:44, height:24, borderRadius:12, background: ef.is_banned ? '#ef4444' : 'rgba(255,255,255,0.1)', position:'relative', transition:'background 0.25s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left: ef.is_banned ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
                </div>
              </div>
            </div>

            <div style={{ padding:'0.9rem 1.4rem', borderTop:'1px solid rgba(255,140,0,0.1)', display:'flex', gap:'0.65rem', justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={() => setEditModal(false)} className="btn-ghost" style={{ padding:'0.65rem 1.25rem', fontSize:'0.86rem' }}>Cancel</button>
              <button onClick={saveEdit} disabled={editLoading} className="btn-fire"
                style={{ padding:'0.65rem 1.5rem', fontSize:'0.86rem', display:'flex', alignItems:'center', gap:'0.4rem', opacity: editLoading ? 0.6 : 1 }}>
                {editSuccess ? <><Check style={{ width:15, height:15 }} /> Saved!</>
                  : editLoading ? <><Loader2 style={{ width:15, height:15, animation:'spin 1s linear infinite' }} /> Saving…</>
                  : <><Save style={{ width:15, height:15 }} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE MODAL ══ */}
      {deleteModal && userToDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ width:'100%', maxWidth:400, background:'rgba(14,14,24,0.99)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:20, padding:'2rem', textAlign:'center', boxShadow:'0 32px 64px rgba(0,0,0,0.7)' }}>
            <div style={{ width:60, height:60, borderRadius:'50%', background:'rgba(239,68,68,0.1)', border:'2px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
              <AlertTriangle style={{ width:28, height:28, color:'#ef4444' }} />
            </div>
            <h3 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.5rem', letterSpacing:'0.05em', marginBottom:'0.5rem' }}>Delete User?</h3>
            <p style={{ color:'var(--text-muted)', fontSize:'0.88rem', marginBottom:'1.5rem', lineHeight:1.55 }}>
              "<strong style={{ color:'white' }}>{userToDelete.full_name || userToDelete.username || 'This user'}</strong>" will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={() => { setDeleteModal(false); setUserToDelete(null) }} className="btn-ghost" style={{ flex:1, padding:'0.75rem' }}>Cancel</button>
              <button onClick={doDelete} disabled={actionLoading === userToDelete.id}
                style={{ flex:1, padding:'0.75rem', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:12, color:'#f87171', cursor:'pointer', fontWeight:700, fontSize:'0.9rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.4rem', fontFamily:'Outfit,sans-serif' }}>
                {actionLoading === userToDelete.id ? <Loader2 style={{ width:17, height:17, animation:'spin 1s linear infinite' }} /> : <><Trash2 style={{ width:16, height:16 }} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, padding:'0.85rem 1.25rem', borderRadius:14, background: toast.type === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border:`1px solid ${toast.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.type === 'ok' ? '#4ADE80' : '#f87171', fontSize:'0.88rem', fontWeight:600, backdropFilter:'blur(16px)', display:'flex', alignItems:'center', gap:'0.5rem', boxShadow:'0 8px 30px rgba(0,0,0,0.4)' }}>
          {toast.type === 'ok' ? <CheckCircle style={{ width:16, height:16 }} /> : <X style={{ width:16, height:16 }} />}
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

/* ── Helpers ── */
function RoleBadge({ role }: { role: Profile['role'] }) {
  const rc = ROLE_CONFIG[role] || ROLE_CONFIG.user
  const RIcon = rc.icon
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', padding:'0.18rem 0.6rem', borderRadius:9999, background: rc.bg, border:`1px solid ${rc.border}`, color: rc.color, fontSize:'0.7rem', fontWeight:700, textTransform:'capitalize' }}>
      <RIcon style={{ width:10, height:10 }} />{role}
    </span>
  )
}

function FilterGroup({ label, options, active, onChange }: { label:string; options:string[]; active:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'0.5rem' }}>{label}</p>
      <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)} style={{ padding:'0.4rem 0.85rem', borderRadius:8, border:'none', background: active===o ? 'rgba(255,98,0,0.2)' : 'rgba(255,255,255,0.05)', color: active===o ? '#FFB733' : 'var(--text-muted)', cursor:'pointer', fontSize:'0.8rem', fontWeight:600, textTransform:'capitalize', fontFamily:'Outfit,sans-serif', transition:'all 0.15s' }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function ERow({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:'0.74rem', fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.4rem' }}>{label}</label>
      {children}
    </div>
  )
}

function EIn({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputSt} onFocus={e => e.target.style.borderColor='rgba(255,140,0,0.45)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
}

const inputSt: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.7rem 0.9rem', color:'white', fontSize:'0.87rem', outline:'none', fontFamily:'Outfit,sans-serif', transition:'border-color 0.2s', boxSizing:'border-box' }
const actionBtn: React.CSSProperties = { padding:'0.4rem', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'rgba(255,255,255,0.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }
const pagBtn: React.CSSProperties = { width:36, height:36, borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', fontSize:'0.85rem' }