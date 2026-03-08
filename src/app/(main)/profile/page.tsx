// src/app/(main)/profile/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import {
  User, Clock, Heart, Play, Star,
  Camera, Upload, Link2, X, Check,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'

type AnyRow = Record<string, any>
type AvatarTab = 'predefined' | 'gallery' | 'url'

/* ── 10 predefined avatars from /public/avatars/ ── */
const PREDEFINED_AVATARS = Array.from({ length: 10 }, (_, i) => `/avatars/avatar${i + 1}.png`)

export default function ProfilePage() {
  const [profile,      setProfile]      = useState<AnyRow | null>(null)
  const [watchHistory, setWatchHistory] = useState<AnyRow[]>([])
  const [favorites,    setFavorites]    = useState<AnyRow[]>([])
  const [stats,        setStats]        = useState({ watched: 0, favorites: 0, totalTime: 0 })
  const [activeTab,    setActiveTab]    = useState<'stats'|'history'|'favorites'>('stats')
  const [loading,      setLoading]      = useState(true)
  const [authUser,     setAuthUser]     = useState<any>(null)

  /* Avatar picker state */
  const [avatarModal,   setAvatarModal]   = useState(false)
  const [avatarTab,     setAvatarTab]     = useState<AvatarTab>('predefined')
  const [avatarUrl,     setAvatarUrl]     = useState('')
  const [urlInput,      setUrlInput]      = useState('')
  const [uploading,     setUploading]     = useState(false)
  const [savingAvatar,  setSavingAvatar]  = useState(false)
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const [selectedPre,   setSelectedPre]   = useState<string | null>(null)
  const [previewFile,   setPreviewFile]   = useState<string | null>(null)
  const [fileToUpload,  setFileToUpload]  = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user: au } } = await supabase.auth.getUser()
      if (!au) { window.location.href = '/login'; return }
      setAuthUser(au)

      let profileData: AnyRow | null = null
      const { data: p1 } = await supabase.from('profiles').select('*').eq('id', au.id).maybeSingle()
      if (p1) {
        profileData = p1
      } else {
        const { data: p2 } = await supabase.from('users').select('*').eq('id', au.id).maybeSingle()
        profileData = p2
      }
      const merged: AnyRow = { email: au.email, ...(profileData || {}) }
      setProfile(merged)
      setAvatarUrl(merged.avatar_url || '')

      const { count: watchedCount } = await supabase
        .from('watch_history').select('*', { count: 'exact', head: true })
        .eq('user_id', au.id).eq('completed', true)

      const { count: favCount } = await supabase
        .from('favorites').select('*', { count: 'exact', head: true })
        .eq('user_id', au.id)

      const { data: progressData } = await supabase
        .from('watch_history').select('progress_seconds')
        .eq('user_id', au.id).eq('completed', true)

      const totalHours = Math.round(
        (progressData?.reduce((a, c) => a + (c?.progress_seconds ?? 0), 0) ?? 0) / 3600
      )
      setStats({ watched: watchedCount ?? 0, favorites: favCount ?? 0, totalTime: totalHours })

      const { data: histRaw } = await supabase
        .from('watch_history')
        .select('id, progress_seconds, last_watched, completed, movie:movies(*)')
        .eq('user_id', au.id)
        .order('last_watched', { ascending: false })
        .limit(20)

      setWatchHistory(
        (histRaw ?? []).filter(item => item?.movie && typeof item.movie === 'object' && !Array.isArray(item.movie))
      )

      const { data: favRaw } = await supabase
        .from('favorites').select('movie:movies(*)').eq('user_id', au.id).limit(20)

      setFavorites(
        (favRaw ?? []).map(f => f.movie).filter(m => m && typeof m === 'object' && !Array.isArray(m))
      )
    } catch (err: any) {
      console.error('[ProfilePage]', err?.message ?? err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Open modal ── */
  const openAvatarModal = () => {
    setAvatarTab('predefined')
    setSelectedPre(null)
    setPreviewFile(null)
    setFileToUpload(null)
    setUrlInput(avatarUrl || '')
    setAvatarSuccess(false)
    setAvatarModal(true)
  }

  /* ── Handle file pick from gallery ── */
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileToUpload(file)
    const reader = new FileReader()
    reader.onload = ev => setPreviewFile(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  /* ── Save avatar ── */
  const saveAvatar = async () => {
    if (!authUser) return
    setSavingAvatar(true)
    try {
      let finalUrl = avatarUrl

      if (avatarTab === 'predefined' && selectedPre) {
        finalUrl = selectedPre

      } else if (avatarTab === 'gallery' && fileToUpload) {
        setUploading(true)
        const ext  = fileToUpload.name.split('.').pop()
        const path = `avatars/${authUser.id}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, fileToUpload, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        finalUrl = urlData.publicUrl
        setUploading(false)

      } else if (avatarTab === 'url' && urlInput.trim()) {
        finalUrl = urlInput.trim()
      } else {
        return
      }

      /* Update profiles table */
      await supabase.from('profiles').upsert({
        id: authUser.id,
        email: authUser.email,
        avatar_url: finalUrl,
      })

      setAvatarUrl(finalUrl)
      setProfile(prev => prev ? { ...prev, avatar_url: finalUrl } : prev)
      setAvatarSuccess(true)
      setTimeout(() => { setAvatarModal(false); setAvatarSuccess(false) }, 900)
    } catch (err: any) {
      console.error('Avatar save error:', err)
    } finally {
      setSavingAvatar(false)
      setUploading(false)
    }
  }

  /* ── Can save? ── */
  const canSave =
    (avatarTab === 'predefined' && !!selectedPre) ||
    (avatarTab === 'gallery'    && !!fileToUpload) ||
    (avatarTab === 'url'        && urlInput.trim().length > 0)

  /* ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading Profile</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        Please <Link href="/login" style={{ color: 'var(--brand-mid)', marginLeft: 4 }}>log in</Link> to view your profile.
      </div>
    )
  }

  const userName = profile.full_name || profile.username || profile.name || profile.email?.split('@')[0] || 'User'
  const currentAvatar = avatarUrl || profile.avatar_url || null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      <main style={{ maxWidth: 1300, margin: '0 auto', padding: 'clamp(5rem,12vh,8rem) clamp(1rem,4vw,2.5rem) 4rem', color: 'var(--text-primary)' }}>

        {/* ── Profile Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>

          {/* Avatar with edit button */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%', overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,183,51,0.15))',
              border: '3px solid rgba(255,140,0,0.3)',
              boxShadow: '0 0 32px rgba(255,98,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {currentAvatar ? (
                <Image
                  src={currentAvatar} alt={userName}
                  width={110} height={110}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  unoptimized
                />
              ) : (
                <User style={{ width: 52, height: 52, color: 'rgba(255,140,0,0.7)' }} />
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={openAvatarModal}
              title="Change avatar"
              style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'linear-gradient(135deg, #FF6200, #FF8C00)',
                boxShadow: '0 2px 10px rgba(255,98,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'transform 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.12)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Camera style={{ width: 15, height: 15, color: 'white' }} />
            </button>
          </div>

          <h1 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 'clamp(2.2rem,6vw,3.5rem)', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            <span className="gradient-text">{userName}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            {profile.role ? `${String(profile.role).charAt(0).toUpperCase() + String(profile.role).slice(1)} · ` : ''}
            Member since {new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={openAvatarModal}
            style={{
              background: 'none', border: '1px solid rgba(255,140,0,0.25)', borderRadius: 9999,
              padding: '0.3rem 0.9rem', color: 'rgba(255,183,51,0.7)', fontSize: '0.75rem',
              cursor: 'pointer', fontFamily: 'Outfit,sans-serif', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.5)'; e.currentTarget.style.color = '#FFB733' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.25)'; e.currentTarget.style.color = 'rgba(255,183,51,0.7)' }}
          >
            <Camera style={{ width: 12, height: 12 }} /> Change Avatar
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          {(['stats','history','favorites'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'btn-fire' : 'btn-ghost'}
              style={{ padding: '0.7rem 1.75rem', fontSize: '0.9rem' }}>
              {tab === 'stats' ? '📊' : tab === 'history' ? '🕐' : '❤️'}{' '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Stats ── */}
        {activeTab === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', maxWidth: 900, margin: '0 auto' }}>
            <StatCard icon={<Clock size={44} style={{ color: 'var(--brand-gold)' }} />} value={`${stats.totalTime}h`} label="Total Watch Time" />
            <StatCard icon={<Play  size={44} style={{ color: 'var(--brand-mid)'  }} />} value={`${stats.watched}`}        label="Films Completed" />
            <StatCard icon={<Heart size={44} style={{ color: '#FF6B6B'          }} />} value={`${stats.favorites}`}      label="Favorites" />
          </div>
        )}

        {/* ── History ── */}
        {activeTab === 'history' && (
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 'clamp(1.5rem,4vw,2.2rem)', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              Recently <span className="gradient-text">Watched</span>
            </h2>
            {watchHistory.length === 0
              ? <EmptyTabState message="No watch history yet. Start watching something!" />
              : (
                <div className="movie-grid">
                  {watchHistory.map(item => (
                    <MiniCard
                      key={item.id}
                      href={`/watch/${item.movie?.slug ?? ''}`}
                      poster={item.movie?.poster_url}
                      title={item.movie?.title || 'Unknown'}
                      sub={item.last_watched ? new Date(item.last_watched).toLocaleDateString() : ''}
                    />
                  ))}
                </div>
              )}
          </div>
        )}

        {/* ── Favorites ── */}
        {activeTab === 'favorites' && (
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 'clamp(1.5rem,4vw,2.2rem)', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              Your <span className="gradient-text">Favorites</span>
            </h2>
            {favorites.length === 0
              ? <EmptyTabState message="No favorites yet. Heart a movie to save it here!" />
              : (
                <div className="movie-grid">
                  {favorites.map((movie: AnyRow) => (
                    <MiniCard
                      key={movie.id}
                      href={`/watch/${movie.slug}`}
                      poster={movie.poster_url}
                      title={movie.title}
                      sub={(movie.admin_rating || movie.rating) ? `★ ${movie.admin_rating || movie.rating}` : ''}
                      subColor="var(--brand-gold)"
                    />
                  ))}
                </div>
              )}
          </div>
        )}
      </main>

      <Footer />

      {/* ════════════════════════════════════════
          AVATAR PICKER MODAL
          ════════════════════════════════════════ */}
      {avatarModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setAvatarModal(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.18s ease',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 520,
            background: 'rgba(14,14,24,0.98)',
            border: '1px solid rgba(255,140,0,0.2)',
            borderRadius: 22,
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
            animation: 'chatSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          }}>

            {/* Modal header */}
            <div style={{
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid rgba(255,140,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,98,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Camera style={{ width: 18, height: 18, color: '#FF8C00' }} />
                <span style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '1.3rem', letterSpacing: '0.06em', color: 'white' }}>
                  Choose Avatar
                </span>
              </div>
              <button onClick={() => setAvatarModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'var(--text-muted)', display: 'flex', borderRadius: 8,
                transition: 'color 0.2s',
              }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Current preview */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.25rem 0 0.5rem' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(255,140,0,0.35)',
                background: 'rgba(255,98,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 24px rgba(255,98,0,0.2)',
              }}>
                {(() => {
                  const preview =
                    avatarTab === 'predefined' ? (selectedPre || currentAvatar) :
                    avatarTab === 'gallery'    ? (previewFile || currentAvatar)  :
                    (urlInput.trim() || currentAvatar)
                  return preview
                    ? <Image src={preview} alt="preview" width={80} height={80} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                    : <User style={{ width: 36, height: 36, color: 'rgba(255,140,0,0.6)' }} />
                })()}
              </div>
            </div>

            {/* Tab switcher */}
            <div style={{
              display: 'flex', margin: '0.75rem 1.4rem',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 12, padding: '0.3rem',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              {([
                { id: 'predefined', icon: <Star style={{ width: 14, height: 14 }} />,   label: 'Presets'  },
                { id: 'gallery',    icon: <Upload style={{ width: 14, height: 14 }} />, label: 'Gallery'  },
                { id: 'url',        icon: <Link2 style={{ width: 14, height: 14 }} />,  label: 'URL'      },
              ] as { id: AvatarTab; icon: React.ReactNode; label: string }[]).map(({ id, icon, label }) => (
                <button key={id} onClick={() => setAvatarTab(id)} style={{
                  flex: 1, padding: '0.5rem 0.5rem', borderRadius: 9, border: 'none',
                  background: avatarTab === id
                    ? 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,183,51,0.15))'
                    : 'transparent',
                  boxShadow: avatarTab === id ? 'inset 0 0 0 1px rgba(255,140,0,0.3)' : 'none',
                  color: avatarTab === id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  transition: 'all 0.18s', fontFamily: 'Outfit,sans-serif',
                }}>
                  {icon}{label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: '0.5rem 1.4rem 1.4rem', minHeight: 200 }}>

              {/* ── Predefined avatars grid ── */}
              {avatarTab === 'predefined' && (
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Pick one of our curated avatars
                  </p>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem',
                  }}>
                    {PREDEFINED_AVATARS.map((src, i) => (
                      <button
                        key={src}
                        onClick={() => setSelectedPre(src)}
                        style={{
                          padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                          borderRadius: '50%', position: 'relative',
                        }}
                      >
                        <div style={{
                          width: '100%', aspectRatio: '1', borderRadius: '50%', overflow: 'hidden',
                          border: selectedPre === src
                            ? '3px solid #FF8C00'
                            : '3px solid rgba(255,255,255,0.08)',
                          boxShadow: selectedPre === src ? '0 0 16px rgba(255,140,0,0.45)' : 'none',
                          transition: 'all 0.18s',
                          transform: selectedPre === src ? 'scale(1.07)' : 'scale(1)',
                        }}>
                          <Image
                            src={src} alt={`Avatar ${i + 1}`}
                            width={72} height={72}
                            style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
                            unoptimized
                          />
                        </div>
                        {selectedPre === src && (
                          <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 20, height: 20, borderRadius: '50%',
                            background: '#FF8C00', border: '2px solid var(--bg-void)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check style={{ width: 11, height: 11, color: 'white' }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Gallery upload ── */}
              {avatarTab === 'gallery' && (
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Upload a photo from your device
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file" accept="image/*"
                    onChange={handleFilePick}
                    style={{ display: 'none' }}
                  />
                  {!previewFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed rgba(255,140,0,0.25)', borderRadius: 16,
                        padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer',
                        background: 'rgba(255,98,0,0.04)',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,98,0,0.08)' }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,98,0,0.04)' }}
                    >
                      <Upload style={{ width: 32, height: 32, color: 'rgba(255,140,0,0.5)', margin: '0 auto 0.75rem' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '0.35rem', fontWeight: 600 }}>
                        Click to choose from gallery
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        JPG, PNG, GIF, WebP · Max 5MB
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,140,0,0.4)' }}>
                        <Image src={previewFile} alt="preview" width={100} height={100} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                      </div>
                      <button
                        onClick={() => { setPreviewFile(null); setFileToUpload(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                        style={{
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                          borderRadius: 9999, padding: '0.3rem 0.9rem',
                          color: '#f87171', fontSize: '0.78rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          fontFamily: 'Outfit,sans-serif',
                        }}
                      >
                        <X style={{ width: 12, height: 12 }} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── URL input ── */}
              {avatarTab === 'url' && (
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Paste a direct image URL
                  </p>
                  <div style={{ position: 'relative' }}>
                    <Link2 style={{
                      position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                      width: 15, height: 15, color: 'var(--text-muted)',
                    }} />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                        padding: '0.8rem 1rem 0.8rem 40px',
                        color: 'white', fontSize: '0.86rem', outline: 'none',
                        fontFamily: 'Outfit,sans-serif', boxSizing: 'border-box',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  {urlInput.trim() && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Preview updates above ↑
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '0.9rem 1.4rem',
              borderTop: '1px solid rgba(255,140,0,0.1)',
              display: 'flex', gap: '0.65rem', justifyContent: 'flex-end',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <button onClick={() => setAvatarModal(false)} className="btn-ghost" style={{ padding: '0.6rem 1.25rem', fontSize: '0.86rem' }}>
                Cancel
              </button>
              <button
                onClick={saveAvatar}
                disabled={!canSave || savingAvatar}
                className="btn-fire"
                style={{
                  padding: '0.6rem 1.5rem', fontSize: '0.86rem',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  opacity: !canSave || savingAvatar ? 0.55 : 1,
                  cursor: !canSave || savingAvatar ? 'not-allowed' : 'pointer',
                }}
              >
                {avatarSuccess ? (
                  <><Check style={{ width: 15, height: 15 }} /> Saved!</>
                ) : savingAvatar ? (
                  <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> {uploading ? 'Uploading…' : 'Saving…'}</>
                ) : (
                  'Save Avatar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn     { from { opacity: 0 } to { opacity: 1 } }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

/* ── Sub-components ── */
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-card">
      <div style={{ marginBottom: '1.1rem' }}>{icon}</div>
      <div style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: 'clamp(2.2rem,5vw,3rem)', letterSpacing: '0.04em', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

function MiniCard({ href, poster, title, sub, subColor }: { href: string; poster?: string|null; title: string; sub?: string; subColor?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="movie-card-wrapper">
        <div className="movie-card">
          <Image src={poster || '/placeholder-poster.jpg'} alt={title} fill style={{ objectFit: 'cover' }} unoptimized />
          <div className="movie-play-btn">
            <Play style={{ width: 16, height: 16, fill: 'white', color: 'white', marginLeft: 2 }} />
          </div>
        </div>
        <div className="movie-card-info">
          <p className="movie-card-title">{title}</p>
          {sub && <p style={{ fontSize: '0.72rem', color: subColor || 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
        </div>
      </div>
    </Link>
  )
}

function EmptyTabState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
      <p style={{ fontSize: '1rem' }}>{message}</p>
    </div>
  )
}