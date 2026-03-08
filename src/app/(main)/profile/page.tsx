// src/app/(main)/profile/page.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import {
  User, Clock, Heart, Play, Star, Camera, Upload, Link2, X, Check,
  ChevronRight, Loader2, Film, TrendingUp, Award, Calendar, Eye,
  Settings, Bell, Monitor, Subtitles, Download, Share2, Edit3,
  Bookmark, History, Sparkles, Flame, Trophy, Target, Zap,
  BarChart3, PieChart, Activity, Gift, Crown, Shield, LogOut,
  ChevronDown, ExternalLink, Trash2, RefreshCw, Volume2, Globe
} from 'lucide-react'

type AnyRow = Record<string, any>
type AvatarTab = 'predefined' | 'gallery' | 'url'
type ProfileTab = 'overview' | 'activity' | 'watchlist' | 'settings'

/* ── Predefined avatars ── */
const PREDEFINED_AVATARS = Array.from({ length: 10 }, (_, i) => `/avatars/avatar${i + 1}.png`)

/* ── Achievement definitions ── */
const ACHIEVEMENTS = [
  { id: 'first_watch', icon: '🎬', name: 'First Watch', desc: 'Watched your first movie', requirement: 1 },
  { id: 'movie_buff', icon: '🍿', name: 'Movie Buff', desc: 'Watched 10 movies', requirement: 10 },
  { id: 'binge_watcher', icon: '📺', name: 'Binge Watcher', desc: 'Watched 50 movies', requirement: 50 },
  { id: 'cinephile', icon: '🎭', name: 'Cinephile', desc: 'Watched 100 movies', requirement: 100 },
  { id: 'first_favorite', icon: '❤️', name: 'First Love', desc: 'Added first favorite', requirement: 1 },
  { id: 'collector', icon: '💎', name: 'Collector', desc: '25+ favorites', requirement: 25 },
  { id: 'marathon', icon: '🏃', name: 'Marathon', desc: '24+ hours watched', requirement: 24 },
  { id: 'night_owl', icon: '🦉', name: 'Night Owl', desc: '100+ hours watched', requirement: 100 },
]

export default function ProfilePage() {
  const supabase = createSupabaseBrowserClient()
  
  // Core state
  const [profile, setProfile] = useState<AnyRow | null>(null)
  const [authUser, setAuthUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
  
  // Data state
  const [watchHistory, setWatchHistory] = useState<AnyRow[]>([])
  const [continueWatching, setContinueWatching] = useState<AnyRow[]>([])
  const [favorites, setFavorites] = useState<AnyRow[]>([])
  const [watchlist, setWatchlist] = useState<AnyRow[]>([])
  const [recentActivity, setRecentActivity] = useState<AnyRow[]>([])
  
  // Stats state
  const [stats, setStats] = useState({
    watched: 0,
    favorites: 0,
    totalMinutes: 0,
    totalHours: 0,
    avgRating: 0,
    streak: 0,
    topGenre: 'N/A',
    thisWeek: 0,
    thisMonth: 0,
  })
  
  // Genre distribution
  const [genreStats, setGenreStats] = useState<{ genre: string; count: number; percentage: number }[]>([])
  
  // Achievements
  const [achievements, setAchievements] = useState<typeof ACHIEVEMENTS>([])
  
  // Avatar modal state
  const [avatarModal, setAvatarModal] = useState(false)
  const [avatarTab, setAvatarTab] = useState<AvatarTab>('predefined')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [avatarSuccess, setAvatarSuccess] = useState(false)
  const [selectedPre, setSelectedPre] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  
  // Settings state
  const [settings, setSettings] = useState({
    autoplay: true,
    quality: 'auto',
    subtitles: true,
    subtitleLanguage: 'en',
    notifications: true,
    emailUpdates: false,
    downloadQuality: 'high',
  })
  
  // Edit profile state
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({ full_name: '', bio: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user: au } } = await supabase.auth.getUser()
      if (!au) { window.location.href = '/login'; return }
      setAuthUser(au)

      // Fetch profile
      let profileData: AnyRow | null = null
      const { data: p1 } = await supabase.from('profiles').select('*').eq('id', au.id).maybeSingle()
      profileData = p1 || {}
      
      const merged: AnyRow = { email: au.email, ...(profileData || {}) }
      setProfile(merged)
      setAvatarUrl(merged.avatar_url || '')
      setEditData({ full_name: merged.full_name || '', bio: merged.bio || '' })

      // Fetch all stats in parallel
      const [
        watchedCountRes,
        favCountRes,
        progressDataRes,
        historyRes,
        continueRes,
        favsRes,
        watchlistRes,
      ] = await Promise.all([
        supabase.from('watch_history').select('*', { count: 'exact', head: true }).eq('user_id', au.id).eq('completed', true),
        supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', au.id),
        supabase.from('watch_history').select('progress_seconds, last_watched, movie:movies(genre)').eq('user_id', au.id),
        supabase.from('watch_history').select('id, progress_seconds, last_watched, completed, movie:movies(*)').eq('user_id', au.id).order('last_watched', { ascending: false }).limit(20),
        supabase.from('watch_history').select('id, progress_seconds, last_watched, movie:movies(*)').eq('user_id', au.id).eq('completed', false).gt('progress_seconds', 30).order('last_watched', { ascending: false }).limit(10),
        supabase.from('favorites').select('created_at, movie:movies(*)').eq('user_id', au.id).order('created_at', { ascending: false }).limit(12),
        supabase.from('watchlist').select('created_at, movie:movies(*)').eq('user_id', au.id).order('created_at', { ascending: false }).limit(12),
      ])

      const watchedCount = watchedCountRes.count ?? 0
      const favCount = favCountRes.count ?? 0
      const progressData = progressDataRes.data || []
      
      // Calculate total watch time
      const totalMinutes = Math.round(progressData.reduce((a, c) => a + (c?.progress_seconds ?? 0), 0) / 60)
      const totalHours = Math.round(totalMinutes / 60)

      // Calculate this week/month stats
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const thisWeek = progressData.filter(p => p.last_watched && new Date(p.last_watched) > weekAgo).length
      const thisMonth = progressData.filter(p => p.last_watched && new Date(p.last_watched) > monthAgo).length

      // Calculate genre distribution
      const genreCounts: Record<string, number> = {}
      progressData.forEach(p => {
        const genres = (p.movie as any)?.genre || []
        genres.forEach((g: string) => { genreCounts[g] = (genreCounts[g] || 0) + 1 })
      })
      const totalGenreHits = Object.values(genreCounts).reduce((a, b) => a + b, 0)
      const sortedGenres = Object.entries(genreCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([genre, count]) => ({
          genre,
          count,
          percentage: totalGenreHits > 0 ? Math.round((count / totalGenreHits) * 100) : 0
        }))
      setGenreStats(sortedGenres)

      // Set stats
      setStats({
        watched: watchedCount,
        favorites: favCount,
        totalMinutes,
        totalHours,
        avgRating: 0,
        streak: Math.floor(Math.random() * 7) + 1, // Placeholder
        topGenre: sortedGenres[0]?.genre || 'N/A',
        thisWeek,
        thisMonth,
      })

      // Process history
      const validHistory = (historyRes.data ?? []).filter(item => 
        item?.movie && typeof item.movie === 'object' && !Array.isArray(item.movie)
      )
      setWatchHistory(validHistory)

      // Process continue watching
      const validContinue = (continueRes.data ?? [])
        .filter(item => item?.movie && typeof item.movie === 'object' && !Array.isArray(item.movie))
        .map(item => {
          const durationSeconds = ((item.movie as any).duration_minutes || 120) * 60
          const progressPercent = Math.min(95, (item.progress_seconds / durationSeconds) * 100)
          return { ...item, progress_percent: progressPercent }
        })
        .filter(item => item.progress_percent < 95)
      setContinueWatching(validContinue)

      // Process favorites
      const validFavs = (favsRes.data ?? [])
        .filter(f => f.movie && typeof f.movie === 'object' && !Array.isArray(f.movie))
        .map(f => ({ ...f.movie, favorited_at: f.created_at }))
      setFavorites(validFavs)

      // Process watchlist
      const validWatchlist = (watchlistRes.data ?? [])
        .filter(w => w.movie && typeof w.movie === 'object' && !Array.isArray(w.movie))
        .map(w => ({ ...w.movie, added_at: w.created_at }))
      setWatchlist(validWatchlist)

      // Build activity timeline
      const activity: AnyRow[] = [
        ...validHistory.slice(0, 5).map(h => ({ type: 'watched', data: h, date: h.last_watched })),
        ...validFavs.slice(0, 3).map(f => ({ type: 'favorited', data: f, date: f.favorited_at })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
      setRecentActivity(activity)

      // Calculate achievements
      const earned = ACHIEVEMENTS.filter(a => {
        if (a.id.includes('watch') || a.id.includes('buff') || a.id.includes('binge') || a.id.includes('cinephile')) {
          return watchedCount >= a.requirement
        }
        if (a.id.includes('favorite') || a.id.includes('collector')) {
          return favCount >= a.requirement
        }
        if (a.id.includes('marathon') || a.id.includes('night')) {
          return totalHours >= a.requirement
        }
        return false
      })
      setAchievements(earned)

    } catch (err: any) {
      console.error('[ProfilePage]', err?.message ?? err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Avatar Modal Handlers ── */
  const openAvatarModal = () => {
    setAvatarTab('predefined')
    setSelectedPre(null)
    setPreviewFile(null)
    setFileToUpload(null)
    setUrlInput(avatarUrl || '')
    setAvatarSuccess(false)
    setAvatarModal(true)
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileToUpload(file)
    const reader = new FileReader()
    reader.onload = ev => setPreviewFile(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const saveAvatar = async () => {
    if (!authUser) return
    setSavingAvatar(true)
    try {
      let finalUrl = avatarUrl

      if (avatarTab === 'predefined' && selectedPre) {
        finalUrl = selectedPre
      } else if (avatarTab === 'gallery' && fileToUpload) {
        setUploading(true)
        const ext = fileToUpload.name.split('.').pop()
        const path = `avatars/${authUser.id}.${ext}`
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, fileToUpload, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        finalUrl = urlData.publicUrl
        setUploading(false)
      } else if (avatarTab === 'url' && urlInput.trim()) {
        finalUrl = urlInput.trim()
      } else {
        return
      }

      await supabase.from('profiles').upsert({ id: authUser.id, email: authUser.email, avatar_url: finalUrl })
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

  /* ── Profile Edit Handlers ── */
  const saveProfile = async () => {
    if (!authUser) return
    setSavingProfile(true)
    try {
      await supabase.from('profiles').upsert({
        id: authUser.id,
        email: authUser.email,
        full_name: editData.full_name,
        bio: editData.bio,
      })
      setProfile(prev => prev ? { ...prev, ...editData } : prev)
      setEditMode(false)
    } catch (err) {
      console.error('Profile save error:', err)
    } finally {
      setSavingProfile(false)
    }
  }

  /* ── Helpers ── */
  const canSaveAvatar =
    (avatarTab === 'predefined' && !!selectedPre) ||
    (avatarTab === 'gallery' && !!fileToUpload) ||
    (avatarTab === 'url' && urlInput.trim().length > 0)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return formatDate(date)
  }

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-ring" />
        <p className="loading-text">Loading Profile</p>
      </div>
    )
  }

  /* ── Not Logged In ── */
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        Please <Link href="/login" style={{ color: 'var(--brand-mid)', marginLeft: 4, textDecoration: 'none' }}>log in</Link> to view your profile.
      </div>
    )
  }

  const userName = profile.full_name || profile.username || profile.name || profile.email?.split('@')[0] || 'User'
  const currentAvatar = avatarUrl || profile.avatar_url || null
  const memberSince = new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      <Navigation />

      {/* ═══════════════════════════════════════════════════════════════
          PROFILE HERO SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        paddingTop: 'var(--nav-height, 66px)',
        overflow: 'hidden',
      }}>
        {/* Background gradient */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '100%',
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,98,0,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 70% 10%, rgba(255,183,51,0.1) 0%, transparent 50%),
            linear-gradient(to bottom, var(--bg-void), var(--bg-deep))
          `,
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: 1200, margin: '0 auto',
          padding: 'clamp(2.5rem, 6vh, 4rem) clamp(1rem, 4vw, 2rem)',
        }}>
          {/* Profile Card */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', gap: '1.5rem',
          }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 'clamp(100px, 20vw, 140px)', height: 'clamp(100px, 20vw, 140px)',
                borderRadius: '50%', overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(255,98,0,0.3), rgba(255,183,51,0.2))',
                border: '4px solid rgba(255,140,0,0.4)',
                boxShadow: '0 0 60px rgba(255,98,0,0.3), 0 8px 32px rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {currentAvatar ? (
                  <Image src={currentAvatar} alt={userName} fill style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <User style={{ width: '45%', height: '45%', color: 'rgba(255,140,0,0.7)' }} />
                )}
              </div>
              
              {/* Edit Avatar Button */}
              <button
                onClick={openAvatarModal}
                style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 38, height: 38, borderRadius: '50%', border: 'none',
                  background: 'linear-gradient(135deg, #FF6200, #FF8C00)',
                  boxShadow: '0 4px 15px rgba(255,98,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,98,0,0.6)' }}
                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,98,0,0.5)' }}
              >
                <Camera style={{ width: 18, height: 18, color: 'white' }} />
              </button>

              {/* Achievement badge */}
              {achievements.length >= 3 && (
                <div style={{
                  position: 'absolute', top: 0, right: -5,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFB733, #FF6200)',
                  border: '3px solid var(--bg-void)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px',
                }}>
                  🏆
                </div>
              )}
            </div>

            {/* Name & Info */}
            <div>
              <h1 style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                letterSpacing: '0.04em', lineHeight: 1.1,
                marginBottom: '0.5rem',
              }}>
                <span className="gradient-text">{userName}</span>
              </h1>
              
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem',
              }}>
                {profile.role && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.3rem 0.9rem', borderRadius: 9999,
                    background: profile.role === 'admin' 
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.1))'
                      : 'rgba(255,140,0,0.1)',
                    border: `1px solid ${profile.role === 'admin' ? 'rgba(139,92,246,0.3)' : 'rgba(255,140,0,0.2)'}`,
                    fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em',
                    color: profile.role === 'admin' ? '#A78BFA' : 'var(--brand-gold)',
                  }}>
                    {profile.role === 'admin' ? <Shield size={12} /> : <Crown size={12} />}
                    {String(profile.role).charAt(0).toUpperCase() + String(profile.role).slice(1)}
                  </span>
                )}
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.85rem', color: 'var(--text-muted)',
                }}>
                  <Calendar size={14} />
                  Member since {memberSince}
                </span>
              </div>

              {/* Bio */}
              {profile.bio && !editMode && (
                <p style={{
                  color: 'var(--text-secondary)', fontSize: '0.95rem',
                  maxWidth: 500, margin: '0 auto', lineHeight: 1.6,
                }}>
                  {profile.bio}
                </p>
              )}

              {/* Edit Profile Form */}
              {editMode && (
                <div style={{ maxWidth: 400, margin: '1rem auto', textAlign: 'left' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editData.full_name}
                      onChange={e => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12, color: 'white', fontSize: '0.9rem',
                        fontFamily: 'Outfit, sans-serif', outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Bio
                    </label>
                    <textarea
                      value={editData.bio}
                      onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={3}
                      style={{
                        width: '100%', padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 12, color: 'white', fontSize: '0.9rem',
                        fontFamily: 'Outfit, sans-serif', outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button onClick={() => setEditMode(false)} className="btn-ghost" style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                      Cancel
                    </button>
                    <button onClick={saveProfile} className="btn-fire" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }} disabled={savingProfile}>
                      {savingProfile ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!editMode && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn-ghost"
                    style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Edit3 size={14} /> Edit Profile
                  </button>
                  <button
                    onClick={openAvatarModal}
                    className="btn-ghost"
                    style={{ padding: '0.55rem 1.1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Camera size={14} /> Change Avatar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'clamp(0.5rem, 2vw, 1rem)',
            marginTop: 'clamp(2rem, 4vh, 3rem)',
            maxWidth: 700, margin: '2rem auto 0',
          }}>
            {[
              { value: stats.watched, label: 'Watched', icon: <Eye size={18} /> },
              { value: stats.favorites, label: 'Favorites', icon: <Heart size={18} /> },
              { value: `${stats.totalHours}h`, label: 'Watch Time', icon: <Clock size={18} /> },
              { value: achievements.length, label: 'Badges', icon: <Trophy size={18} /> },
            ].map(({ value, label, icon }) => (
              <div key={label} style={{
                textAlign: 'center', padding: 'clamp(0.8rem, 2vw, 1.2rem)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
              }}>
                <div style={{ color: 'var(--brand-gold)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                  {icon}
                </div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(1.3rem, 4vw, 2rem)', color: 'var(--text-primary)' }}>
                  {value}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION TABS
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'sticky', top: 'var(--nav-height, 66px)', zIndex: 50,
        background: 'rgba(12,10,7,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,140,0,0.1)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          padding: '0 clamp(1rem, 4vw, 2rem)',
          display: 'flex', gap: '0.25rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {([
            { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
            { id: 'activity', label: 'Activity', icon: <Activity size={16} /> },
            { id: 'watchlist', label: 'Watchlist', icon: <Bookmark size={16} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
          ] as { id: ProfileTab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '1rem 1.25rem', border: 'none',
                background: 'transparent', cursor: 'pointer',
                color: activeTab === id ? 'var(--brand-gold)' : 'var(--text-muted)',
                fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', fontWeight: 600,
                borderBottom: `2px solid ${activeTab === id ? 'var(--brand-gold)' : 'transparent'}`,
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          TAB CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <main style={{
        maxWidth: 1200, margin: '0 auto',
        padding: 'clamp(1.5rem, 4vh, 3rem) clamp(1rem, 4vw, 2rem) 4rem',
        color: 'var(--text-primary)',
      }}>

        {/* ══════════════════════════════════════════════════════════════
            OVERVIEW TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2rem, 4vh, 3rem)' }}>
            
            {/* Continue Watching */}
            {continueWatching.length > 0 && (
              <Section
                title="Continue Watching"
                icon={<Play size={20} style={{ color: 'var(--brand-mid)' }} />}
                action={{ label: 'History', href: '#', onClick: () => setActiveTab('activity') }}
              >
                <div className="movie-scroll-row" style={{ paddingBottom: '0.5rem' }}>
                  {continueWatching.map(item => (
                    <ContinueCard key={item.id} item={item} />
                  ))}
                </div>
              </Section>
            )}

            {/* Favorites */}
            <Section
              title="Your Favorites"
              icon={<Heart size={20} style={{ color: '#FF6B6B', fill: '#FF6B6B' }} />}
              action={{ label: 'View All', href: '/favorites' }}
              badge={stats.favorites > 0 ? `${stats.favorites}` : undefined}
            >
              {favorites.length === 0 ? (
                <EmptyState
                  icon={<Heart size={40} />}
                  message="No favorites yet"
                  sub="Heart a movie to add it here"
                  ctaText="Browse Movies"
                  ctaHref="/movies"
                />
              ) : (
                <div className="movie-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))' }}>
                  {favorites.slice(0, 6).map(movie => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              )}
            </Section>

            {/* Stats Grid */}
            <Section
              title="Your Statistics"
              icon={<PieChart size={20} style={{ color: 'var(--brand-gold)' }} />}
            >
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                gap: '1rem',
              }}>
                <StatCard
                  icon={<Clock size={32} style={{ color: 'var(--brand-gold)' }} />}
                  value={`${stats.totalHours}h ${stats.totalMinutes % 60}m`}
                  label="Total Watch Time"
                  sub={`${Math.round(stats.totalMinutes / 60 / 24)} days of content`}
                  gradient="from-amber"
                />
                <StatCard
                  icon={<Film size={32} style={{ color: 'var(--brand-mid)' }} />}
                  value={stats.watched.toString()}
                  label="Films Completed"
                  sub={`${stats.thisMonth} this month`}
                  gradient="from-orange"
                />
                <StatCard
                  icon={<TrendingUp size={32} style={{ color: '#22C55E' }} />}
                  value={stats.topGenre}
                  label="Top Genre"
                  sub="Your most watched"
                  gradient="from-green"
                />
                <StatCard
                  icon={<Zap size={32} style={{ color: '#8B5CF6' }} />}
                  value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`}
                  label="Watch Streak"
                  sub="Keep it going!"
                  gradient="from-purple"
                />
              </div>
            </Section>

            {/* Genre Distribution */}
            {genreStats.length > 0 && (
              <Section
                title="Genre Breakdown"
                icon={<BarChart3 size={20} style={{ color: '#22C55E' }} />}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                  gap: '1rem',
                }}>
                  <div style={{
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    borderRadius: 20, padding: '1.5rem',
                  }}>
                    {genreStats.map(({ genre, count, percentage }, i) => (
                      <div key={genre} style={{ marginBottom: i < genreStats.length - 1 ? '1rem' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{genre}</span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{count} films • {percentage}%</span>
                        </div>
                        <div style={{
                          height: 8, borderRadius: 4,
                          background: 'rgba(255,255,255,0.06)',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: 4,
                            background: `linear-gradient(90deg, var(--brand-core), var(--brand-gold))`,
                            width: `${percentage}%`,
                            transition: 'width 0.8s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Achievements Preview */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(255,98,0,0.08), rgba(255,183,51,0.05))',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 20, padding: '1.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Trophy size={18} style={{ color: '#FFB733' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Achievements</span>
                      <span style={{
                        marginLeft: 'auto', padding: '0.2rem 0.6rem',
                        background: 'rgba(255,183,51,0.15)', borderRadius: 9999,
                        fontSize: '0.75rem', fontWeight: 700, color: '#FFB733',
                      }}>
                        {achievements.length}/{ACHIEVEMENTS.length}
                      </span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                      {ACHIEVEMENTS.slice(0, 8).map(a => {
                        const earned = achievements.find(e => e.id === a.id)
                        return (
                          <div
                            key={a.id}
                            title={`${a.name}: ${a.desc}`}
                            style={{
                              aspectRatio: '1', borderRadius: 12,
                              background: earned ? 'linear-gradient(135deg, rgba(255,183,51,0.2), rgba(255,98,0,0.15))' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${earned ? 'rgba(255,183,51,0.3)' : 'rgba(255,255,255,0.06)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '1.5rem',
                              opacity: earned ? 1 : 0.35,
                              filter: earned ? 'none' : 'grayscale(1)',
                              transition: 'all 0.3s',
                              cursor: 'help',
                            }}
                          >
                            {a.icon}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {/* Watch History */}
            <Section
              title="Recently Watched"
              icon={<History size={20} style={{ color: '#8B5CF6' }} />}
              action={{ label: 'See All', onClick: () => setActiveTab('activity') }}
            >
              {watchHistory.length === 0 ? (
                <EmptyState
                  icon={<Play size={40} />}
                  message="No watch history"
                  sub="Start watching to build your history"
                  ctaText="Browse Movies"
                  ctaHref="/movies"
                />
              ) : (
                <div className="movie-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(150px, 100%), 1fr))' }}>
                  {watchHistory.slice(0, 6).map(item => (
                    <MovieCard
                      key={item.id}
                      movie={item.movie}
                      sub={item.last_watched ? getTimeAgo(item.last_watched) : undefined}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ACTIVITY TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2rem, 4vh, 3rem)' }}>
            
            {/* Activity Timeline */}
            <Section
              title="Recent Activity"
              icon={<Activity size={20} style={{ color: 'var(--brand-mid)' }} />}
            >
              {recentActivity.length === 0 ? (
                <EmptyState
                  icon={<Activity size={40} />}
                  message="No activity yet"
                  sub="Watch or favorite movies to see your activity"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentActivity.map((item, i) => (
                    <ActivityItem key={i} item={item} />
                  ))}
                </div>
              )}
            </Section>

            {/* Full Watch History */}
            <Section
              title="Watch History"
              icon={<History size={20} style={{ color: '#8B5CF6' }} />}
              badge={watchHistory.length > 0 ? `${watchHistory.length}` : undefined}
            >
              {watchHistory.length === 0 ? (
                <EmptyState
                  icon={<Play size={40} />}
                  message="No watch history"
                  sub="Start watching to build your history"
                  ctaText="Browse Movies"
                  ctaHref="/movies"
                />
              ) : (
                <div className="movie-grid">
                  {watchHistory.map(item => (
                    <MovieCard
                      key={item.id}
                      movie={item.movie}
                      sub={item.last_watched ? formatDate(item.last_watched) : undefined}
                      progress={item.completed ? 100 : Math.round((item.progress_seconds / ((item.movie?.duration_minutes || 120) * 60)) * 100)}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            WATCHLIST TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'watchlist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2rem, 4vh, 3rem)' }}>
            
            {/* Favorites */}
            <Section
              title="Favorites"
              icon={<Heart size={20} style={{ color: '#FF6B6B', fill: '#FF6B6B' }} />}
              action={{ label: 'Manage', href: '/favorites' }}
              badge={favorites.length > 0 ? `${favorites.length}` : undefined}
            >
              {favorites.length === 0 ? (
                <EmptyState
                  icon={<Heart size={40} />}
                  message="No favorites yet"
                  sub="Heart movies you love to save them here"
                  ctaText="Discover Movies"
                  ctaHref="/movies"
                />
              ) : (
                <div className="movie-grid">
                  {favorites.map(movie => (
                    <MovieCard key={movie.id} movie={movie} showHeart />
                  ))}
                </div>
              )}
            </Section>

            {/* Watchlist */}
            <Section
              title="Watch Later"
              icon={<Bookmark size={20} style={{ color: 'var(--brand-gold)' }} />}
              badge={watchlist.length > 0 ? `${watchlist.length}` : undefined}
            >
              {watchlist.length === 0 ? (
                <EmptyState
                  icon={<Bookmark size={40} />}
                  message="Your watchlist is empty"
                  sub="Add movies you want to watch later"
                  ctaText="Browse Movies"
                  ctaHref="/movies"
                />
              ) : (
                <div className="movie-grid">
                  {watchlist.map(movie => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            SETTINGS TAB
            ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Playback Settings */}
            <SettingsSection title="Playback" icon={<Monitor size={20} />}>
              <SettingRow
                icon={<Play size={18} />}
                title="Autoplay"
                description="Automatically play next episode"
              >
                <Toggle checked={settings.autoplay} onChange={v => setSettings(s => ({ ...s, autoplay: v }))} />
              </SettingRow>
              <SettingRow
                icon={<Sparkles size={18} />}
                title="Video Quality"
                description="Default streaming quality"
              >
                <select
                  value={settings.quality}
                  onChange={e => setSettings(s => ({ ...s, quality: e.target.value }))}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)', fontSize: '0.85rem',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="auto">Auto</option>
                  <option value="4k">4K Ultra HD</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="720p">720p HD</option>
                  <option value="480p">480p SD</option>
                </select>
              </SettingRow>
              <SettingRow
                icon={<Volume2 size={18} />}
                title="Default Volume"
                description="Starting volume level"
              >
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>80%</span>
              </SettingRow>
            </SettingsSection>

            {/* Subtitle Settings */}
            <SettingsSection title="Subtitles" icon={<Subtitles size={20} />}>
              <SettingRow
                icon={<Subtitles size={18} />}
                title="Show Subtitles"
                description="Display subtitles by default"
              >
                <Toggle checked={settings.subtitles} onChange={v => setSettings(s => ({ ...s, subtitles: v }))} />
              </SettingRow>
              <SettingRow
                icon={<Globe size={18} />}
                title="Subtitle Language"
                description="Preferred subtitle language"
              >
                <select
                  value={settings.subtitleLanguage}
                  onChange={e => setSettings(s => ({ ...s, subtitleLanguage: e.target.value }))}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)', fontSize: '0.85rem',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="hi">Hindi</option>
                </select>
              </SettingRow>
            </SettingsSection>

            {/* Notification Settings */}
            <SettingsSection title="Notifications" icon={<Bell size={20} />}>
              <SettingRow
                icon={<Bell size={18} />}
                title="Push Notifications"
                description="Get notified about new releases"
              >
                <Toggle checked={settings.notifications} onChange={v => setSettings(s => ({ ...s, notifications: v }))} />
              </SettingRow>
              <SettingRow
                icon={<Mail size={18} />}
                title="Email Updates"
                description="Receive weekly recommendations"
              >
                <Toggle checked={settings.emailUpdates} onChange={v => setSettings(s => ({ ...s, emailUpdates: v }))} />
              </SettingRow>
            </SettingsSection>

            {/* Downloads */}
            <SettingsSection title="Downloads" icon={<Download size={20} />}>
              <SettingRow
                icon={<Download size={18} />}
                title="Download Quality"
                description="Quality for offline viewing"
              >
                <select
                  value={settings.downloadQuality}
                  onChange={e => setSettings(s => ({ ...s, downloadQuality: e.target.value }))}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)', fontSize: '0.85rem',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="high">High (1080p)</option>
                  <option value="medium">Medium (720p)</option>
                  <option value="low">Low (480p)</option>
                </select>
              </SettingRow>
            </SettingsSection>

            {/* Account Actions */}
            <SettingsSection title="Account" icon={<User size={20} />}>
              <SettingRow
                icon={<Trash2 size={18} />}
                title="Clear Watch History"
                description="Remove all your watch history"
                danger
              >
                <button
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 10,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  Clear
                </button>
              </SettingRow>
              <SettingRow
                icon={<LogOut size={18} />}
                title="Sign Out"
                description="Sign out of your account"
                danger
              >
                <button
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 10,
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#f87171', fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  Sign Out
                </button>
              </SettingRow>
            </SettingsSection>
          </div>
        )}
      </main>

      <Footer />

      {/* ══════════════════════════════════════════════════════════════
          AVATAR PICKER MODAL
          ══════════════════════════════════════════════════════════════ */}
      {avatarModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setAvatarModal(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', animation: 'fadeIn 0.2s ease',
          }}
        >
          <div style={{
            width: '100%', maxWidth: 480,
            background: 'linear-gradient(135deg, rgba(20,16,12,0.98), rgba(12,10,7,0.99))',
            border: '1px solid rgba(255,140,0,0.2)',
            borderRadius: 24, overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,98,0,0.1)',
            animation: 'modalSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,140,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(255,98,0,0.08), transparent)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Camera style={{ width: 18, height: 18, color: 'white' }} />
                </div>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.4rem', letterSpacing: '0.05em', color: 'white' }}>
                  Choose Avatar
                </span>
              </div>
              <button
                onClick={() => setAvatarModal(false)}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s',
                }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Preview */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0 1rem' }}>
              <div style={{
                width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(255,140,0,0.4)',
                background: 'linear-gradient(135deg, rgba(255,98,0,0.15), rgba(255,183,51,0.1))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 30px rgba(255,98,0,0.25)',
              }}>
                {(() => {
                  const preview =
                    avatarTab === 'predefined' ? (selectedPre || currentAvatar) :
                    avatarTab === 'gallery' ? (previewFile || currentAvatar) :
                    (urlInput.trim() || currentAvatar)
                  return preview
                    ? <Image src={preview} alt="preview" width={90} height={90} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                    : <User style={{ width: 40, height: 40, color: 'rgba(255,140,0,0.6)' }} />
                })()}
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', margin: '0 1.5rem', gap: '0.35rem',
              background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '0.35rem',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              {([
                { id: 'predefined', icon: <Sparkles size={14} />, label: 'Presets' },
                { id: 'gallery', icon: <Upload size={14} />, label: 'Upload' },
                { id: 'url', icon: <Link2 size={14} />, label: 'URL' },
              ] as { id: AvatarTab; icon: React.ReactNode; label: string }[]).map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setAvatarTab(id)}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none',
                    background: avatarTab === id ? 'linear-gradient(135deg, rgba(255,98,0,0.25), rgba(255,183,51,0.15))' : 'transparent',
                    boxShadow: avatarTab === id ? 'inset 0 0 0 1px rgba(255,140,0,0.3)' : 'none',
                    color: avatarTab === id ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    transition: 'all 0.2s', fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: '1rem 1.5rem 1.5rem', minHeight: 180 }}>
              {avatarTab === 'predefined' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Select from our collection
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem' }}>
                    {PREDEFINED_AVATARS.map((src, i) => (
                      <button
                        key={src}
                        onClick={() => setSelectedPre(src)}
                        style={{
                          padding: 0, border: 'none', background: 'none',
                          cursor: 'pointer', borderRadius: '50%', position: 'relative',
                        }}
                      >
                        <div style={{
                          width: '100%', aspectRatio: '1', borderRadius: '50%', overflow: 'hidden',
                          border: selectedPre === src ? '3px solid #FF8C00' : '3px solid rgba(255,255,255,0.1)',
                          boxShadow: selectedPre === src ? '0 0 20px rgba(255,140,0,0.5)' : 'none',
                          transition: 'all 0.2s',
                          transform: selectedPre === src ? 'scale(1.08)' : 'scale(1)',
                        }}>
                          <Image src={src} alt={`Avatar ${i + 1}`} width={80} height={80} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                        </div>
                        {selectedPre === src && (
                          <div style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#FF8C00', border: '2px solid var(--bg-void)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check style={{ width: 12, height: 12, color: 'white' }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {avatarTab === 'gallery' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Upload from your device
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} style={{ display: 'none' }} />
                  {!previewFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed rgba(255,140,0,0.3)', borderRadius: 16,
                        padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer',
                        background: 'rgba(255,98,0,0.05)', transition: 'all 0.2s',
                      }}
                    >
                      <Upload style={{ width: 36, height: 36, color: 'rgba(255,140,0,0.5)', margin: '0 auto 0.75rem' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                        Click to choose photo
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        JPG, PNG, GIF, WebP • Max 5MB
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
                          borderRadius: 9999, padding: '0.4rem 1rem', color: '#f87171',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          fontFamily: 'Outfit, sans-serif',
                        }}
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {avatarTab === 'url' && (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Enter image URL
                  </p>
                  <div style={{ position: 'relative' }}>
                    <Link2 style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                        padding: '0.85rem 1rem 0.85rem 42px', color: 'white',
                        fontSize: '0.88rem', outline: 'none', fontFamily: 'Outfit, sans-serif',
                        transition: 'border-color 0.2s',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(255,140,0,0.1)',
              display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <button onClick={() => setAvatarModal(false)} className="btn-ghost" style={{ padding: '0.65rem 1.35rem', fontSize: '0.88rem' }}>
                Cancel
              </button>
              <button
                onClick={saveAvatar}
                disabled={!canSaveAvatar || savingAvatar}
                className="btn-fire"
                style={{
                  padding: '0.65rem 1.75rem', fontSize: '0.88rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  opacity: !canSaveAvatar || savingAvatar ? 0.5 : 1,
                  cursor: !canSaveAvatar || savingAvatar ? 'not-allowed' : 'pointer',
                }}
              >
                {avatarSuccess ? <><Check size={16} /> Saved!</> :
                 savingAvatar ? <><Loader2 size={16} className="animate-spin" /> {uploading ? 'Uploading…' : 'Saving…'}</> :
                 'Save Avatar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════════════════ */

// Mail icon placeholder
const Mail = ({ size = 18, ...props }: { size?: number; [key: string]: any }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

function Section({ title, icon, children, action, badge }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode;
  action?: { label: string; href?: string; onClick?: () => void }; badge?: string
}) {
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 'clamp(1rem, 2.5vh, 1.5rem)', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <h2 style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          fontWeight: 700, color: 'var(--text-primary)',
        }}>
          <span style={{
            width: 4, height: '1.2em', borderRadius: 2,
            background: 'linear-gradient(180deg, var(--brand-core), var(--brand-gold))',
          }} />
          {icon}
          {title}
          {badge && (
            <span style={{
              padding: '0.15rem 0.6rem', borderRadius: 9999, fontSize: '0.75rem',
              fontWeight: 700, background: 'rgba(255,140,0,0.15)', color: 'var(--brand-gold)',
            }}>
              {badge}
            </span>
          )}
        </h2>
        {action && (
          action.href ? (
            <Link href={action.href} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-mid)',
              textDecoration: 'none', transition: 'color 0.2s',
            }}>
              {action.label} <ChevronRight size={16} />
            </Link>
          ) : (
            <button onClick={action.onClick} style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-mid)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}>
              {action.label} <ChevronRight size={16} />
            </button>
          )
        )}
      </div>
      {children}
    </section>
  )
}

function StatCard({ icon, value, label, sub, gradient }: {
  icon: React.ReactNode; value: string; label: string; sub?: string; gradient?: string
}) {
  const gradientMap: Record<string, string> = {
    'from-amber': 'linear-gradient(135deg, rgba(255,183,51,0.1), rgba(255,98,0,0.05))',
    'from-orange': 'linear-gradient(135deg, rgba(255,98,0,0.1), rgba(255,140,0,0.05))',
    'from-green': 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.05))',
    'from-purple': 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(124,58,237,0.05))',
  }

  return (
    <div style={{
      background: gradient ? gradientMap[gradient] : 'var(--glass-bg)',
      border: '1px solid var(--glass-border)', borderRadius: 20,
      padding: 'clamp(1.25rem, 3vw, 1.75rem)', textAlign: 'center',
      transition: 'transform 0.3s, box-shadow 0.3s',
    }}
    onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 35px rgba(0,0,0,0.2)' }}
    onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
    >
      <div style={{ marginBottom: '0.9rem' }}>{icon}</div>
      <div style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
        letterSpacing: '0.03em', color: 'var(--text-primary)',
        marginBottom: '0.3rem',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: sub ? '0.25rem' : 0 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{sub}</div>}
    </div>
  )
}

function MovieCard({ movie, sub, progress, showHeart }: {
  movie: any; sub?: string; progress?: number; showHeart?: boolean
}) {
  const rating = movie.admin_rating || movie.rating
  
  return (
    <Link href={`/watch/${movie.slug}`} style={{ textDecoration: 'none' }}>
      <div className="movie-card-wrapper">
        <div className="movie-card" style={{ position: 'relative' }}>
          <Image src={movie.poster_url || '/placeholder-poster.jpg'} alt={movie.title} fill style={{ objectFit: 'cover' }} unoptimized />
          <div className="movie-play-btn">
            <Play style={{ width: 16, height: 16, fill: 'white', color: 'white', marginLeft: 2 }} />
          </div>
          {progress !== undefined && progress > 0 && progress < 100 && (
            <div className="movie-card-progress">
              <div className="movie-card-progress-bar" style={{ width: `${progress}%` }} />
            </div>
          )}
          {showHeart && (
            <div style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Heart size={14} style={{ color: '#FF6B6B', fill: '#FF6B6B' }} />
            </div>
          )}
        </div>
        <div className="movie-card-info">
          <p className="movie-card-title">{movie.title}</p>
          <div className="movie-card-meta">
            {rating > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#FFB733', fontWeight: 700 }}>
                <Star size={10} style={{ fill: '#FFB733' }} />
                {rating.toFixed(1)}
              </span>
            )}
            {movie.release_year && <span>{movie.release_year}</span>}
            {sub && <span style={{ color: 'var(--text-dim)' }}>{sub}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

function ContinueCard({ item }: { item: any }) {
  const movie = item.movie
  const progressPercent = item.progress_percent || 0
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
  }

  return (
    <Link href={`/watch/${movie.slug}?t=${item.progress_seconds}`} style={{ textDecoration: 'none', width: 280, flexShrink: 0 }}>
      <div className="movie-card-wrapper">
        <div className="movie-card" style={{ aspectRatio: '16/9', position: 'relative' }}>
          <Image src={movie.backdrop_url || movie.poster_url || '/placeholder-wide.jpg'} alt={movie.title} fill style={{ objectFit: 'cover' }} unoptimized />
          <div className="movie-card-progress">
            <div className="movie-card-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.3s',
          }} className="continue-overlay">
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(255,98,0,0.5)',
            }}>
              <Play style={{ width: 20, height: 20, fill: 'white', color: 'white', marginLeft: 2 }} />
            </div>
          </div>
        </div>
        <div className="movie-card-info">
          <p className="movie-card-title">{movie.title}</p>
          <div className="movie-card-meta">
            <span style={{ color: 'var(--brand-gold)', fontWeight: 600 }}>
              {formatTime(item.progress_seconds)}
            </span>
            <span>•</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .movie-card-wrapper:hover .continue-overlay { opacity: 1 !important; }
      `}</style>
    </Link>
  )
}

function ActivityItem({ item }: { item: any }) {
  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const movie = item.type === 'watched' ? item.data.movie : item.data
  const icon = item.type === 'watched' ? <Play size={16} /> : <Heart size={16} style={{ fill: '#FF6B6B' }} />
  const color = item.type === 'watched' ? 'var(--brand-mid)' : '#FF6B6B'
  const action = item.type === 'watched' ? 'Watched' : 'Added to favorites'

  return (
    <Link href={`/watch/${movie?.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1rem', borderRadius: 14,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        transition: 'all 0.2s',
      }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,140,0,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.15)' }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)' }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
        <div style={{
          width: 55, height: 80, borderRadius: 8, overflow: 'hidden',
          flexShrink: 0, position: 'relative',
          background: 'var(--bg-card)',
        }}>
          <Image src={movie?.poster_url || '/placeholder-poster.jpg'} alt={movie?.title || ''} fill style={{ objectFit: 'cover' }} unoptimized />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {movie?.title || 'Unknown'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {action}
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', flexShrink: 0 }}>
          {getTimeAgo(item.date)}
        </span>
      </div>
    </Link>
  )
}

function EmptyState({ icon, message, sub, ctaText, ctaHref }: {
  icon: React.ReactNode; message: string; sub?: string; ctaText?: string; ctaHref?: string
}) {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'clamp(3rem, 8vh, 5rem) 1rem',
      color: 'var(--text-muted)',
    }}>
      <div style={{ marginBottom: '1rem', opacity: 0.4 }}>{icon}</div>
      <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
        {message}
      </p>
      {sub && <p style={{ fontSize: '0.9rem', marginBottom: ctaText ? '1.5rem' : 0 }}>{sub}</p>}
      {ctaText && ctaHref && (
        <Link href={ctaHref} style={{ textDecoration: 'none' }}>
          <button className="btn-fire" style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
            {ctaText}
          </button>
        </Link>
      )}
    </div>
  )
}

function SettingsSection({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: 20, overflow: 'hidden',
    }}>
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <span style={{ color: 'var(--brand-gold)' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</span>
      </div>
      <div style={{ padding: '0.5rem 0' }}>
        {children}
      </div>
    </div>
  )
}

function SettingRow({ icon, title, description, children, danger }: {
  icon: React.ReactNode; title: string; description: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '1rem 1.25rem',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: danger ? '#f87171' : 'var(--text-muted)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
          {title}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 48, height: 26, borderRadius: 13, padding: 3, border: 'none',
        background: checked ? 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))' : 'rgba(255,255,255,0.1)',
        cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: 'white',
        transform: checked ? 'translateX(22px)' : 'translateX(0)',
        transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}