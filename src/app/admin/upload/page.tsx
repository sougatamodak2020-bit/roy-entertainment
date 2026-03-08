// src/app/admin/upload/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Upload, Plus, X, Film, User, Loader2, CheckCircle,
  ImageIcon, BarChart3, Users, Settings, Home, LogOut, Menu,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface ActorEntry { name: string; character: string; imageFile: File | null; imagePreview: string | null }

const GENRES    = ['Action','Comedy','Drama','Horror','Romance','Sci-Fi','Thriller','Mystery','Adventure','Documentary','Fantasy','Crime','Animation','Biography']
const LANGUAGES = ['English','Hindi','Tamil','Telugu','Malayalam','Kannada','Bengali','Punjabi','Marathi','Other']

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin',         icon: BarChart3 },
  { label: 'Movies',    href: '/admin/movies',   icon: Film      },
  { label: 'Upload',    href: '/admin/upload',   icon: Upload,   active: true },
  { label: 'Users',     href: '/admin/users',    icon: Users     },
  { label: 'Settings',  href: '/admin/settings', icon: Settings  },
]

export default function AdminUploadPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [title,          setTitle]          = useState('')
  const [description,    setDescription]    = useState('')
  const [youtubeUrl,     setYoutubeUrl]     = useState('')
  const [trailerUrl,     setTrailerUrl]     = useState('')
  const [releaseYear,    setReleaseYear]    = useState('')
  const [duration,       setDuration]       = useState('')
  const [language,       setLanguage]       = useState('')
  const [director,       setDirector]       = useState('')
  const [adminRating,    setAdminRating]    = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])

  const [posterFile,      setPosterFile]      = useState<File | null>(null)
  const [posterPreview,   setPosterPreview]   = useState<string | null>(null)
  const [thumbFile,       setThumbFile]       = useState<File | null>(null)
  const [thumbPreview,    setThumbPreview]    = useState<string | null>(null)
  const [backdropFile,    setBackdropFile]    = useState<File | null>(null)
  const [backdropPreview, setBackdropPreview] = useState<string | null>(null)

  const [actors, setActors] = useState<ActorEntry[]>([
    { name: '', character: '', imageFile: null, imagePreview: null },
  ])

  const [isPublished, setIsPublished] = useState(true)
  const [isFeatured,  setIsFeatured]  = useState(false)
  const [isTrending,  setIsTrending]  = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')

  const posterRef   = useRef<HTMLInputElement>(null!)
  const thumbRef    = useRef<HTMLInputElement>(null!)
  const backdropRef = useRef<HTMLInputElement>(null!)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [])

  const readPreview = (file: File): Promise<string> =>
    new Promise(res => {
      const r = new FileReader()
      r.onload = e => res(e.target?.result as string)
      r.readAsDataURL(file)
    })

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

  const toggleGenre = (g: string) =>
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const addActor    = () => setActors(prev => [...prev, { name: '', character: '', imageFile: null, imagePreview: null }])
  const removeActor = (i: number) => setActors(prev => prev.filter((_, idx) => idx !== i))
  const updateActor = (i: number, field: keyof ActorEntry, value: any) =>
    setActors(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))

  const handleActorImage = async (i: number, file: File) => {
    const preview = await readPreview(file)
    setActors(prev => prev.map((a, idx) =>
      idx === i ? { ...a, imageFile: file, imagePreview: preview } : a
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setError(''); setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const slug   = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
      const prefix = `admin/${slug}`

      let posterUrl: string | null   = null
      let thumbUrl: string | null    = null
      let backdropUrl: string | null = null

      if (posterFile)   posterUrl   = await uploadFile(posterFile,   'movies', `${prefix}/poster.${posterFile.name.split('.').pop()}`)
      if (thumbFile)    thumbUrl    = await uploadFile(thumbFile,    'movies', `${prefix}/thumbnail.${thumbFile.name.split('.').pop()}`)
      if (backdropFile) backdropUrl = await uploadFile(backdropFile, 'movies', `${prefix}/backdrop.${backdropFile.name.split('.').pop()}`)

      const ytMatch   = youtubeUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
      const youtubeId = ytMatch?.[1] ?? null

      const { data: movieData, error: movieError } = await supabase.from('movies').insert({
        title:            title.trim(),
        slug,
        description:      description.trim() || null,
        youtube_url:      youtubeUrl.trim()  || null,
        youtube_id:       youtubeId,
        trailer_url:      trailerUrl.trim()  || null,
        poster_url:       posterUrl || thumbUrl,
        backdrop_url:     backdropUrl,
        release_year:     releaseYear ? parseInt(releaseYear) : null,
        duration_minutes: duration    ? parseInt(duration)    : null,
        language:         language.trim()  || null,
        director:         director.trim()  || null,
        genre:            selectedGenres.length ? selectedGenres : null,
        admin_rating:     adminRating ? parseFloat(adminRating) : null,
        uploaded_by:      user.id,
        uploaded_by_type: 'admin',
        is_published:     isPublished,
        is_featured:      isFeatured,
        is_trending:      isTrending,
        view_count:       0,
      }).select('id').single()

      if (movieError) throw movieError

      const validActors = actors.filter(a => a.name.trim())
      for (let i = 0; i < validActors.length; i++) {
        const a = validActors[i]
        let actorImageUrl: string | null = null
        if (a.imageFile)
          actorImageUrl = await uploadFile(a.imageFile, 'actors', `${prefix}/actor-${i}.${a.imageFile.name.split('.').pop()}`)

        const { data: actorData } = await supabase.from('actors').upsert(
          { name: a.name.trim(), image_url: actorImageUrl },
          { onConflict: 'name' }
        ).select('id').single()

        if (actorData?.id) {
          await supabase.from('movie_actors').insert({
            movie_id: movieData.id, actor_id: actorData.id,
            character_name: a.character.trim() || null,
          })
        }
      }

      setSuccess(true)
      setTimeout(() => router.push('/admin/movies'), 2500)
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
    padding: '0.85rem 1rem', color: 'white', fontSize: '0.92rem',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Outfit, sans-serif', transition: 'border-color 0.2s',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '0.73rem', fontWeight: 700, color: 'var(--text-muted)',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    marginBottom: '0.5rem', display: 'block',
  }
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'rgba(255,140,0,0.45)')
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'rgba(255,255,255,0.1)')

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle style={{ width: 40, height: 40, color: '#4ADE80' }} />
          </div>
          <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '2.5rem', letterSpacing: '0.05em', marginBottom: '0.75rem', color: 'white' }}>Film Uploaded!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 360, margin: '0 auto' }}>
            {isPublished ? 'Movie is now live on the platform.' : 'Movie saved as draft.'} Redirecting to movies…
          </p>
        </div>
      </div>
    )
  }

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
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap: '0.65rem', padding: '0.65rem 0.9rem', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <LogOut style={{ width: 16, height: 16 }} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{ flex: 1, marginLeft: sidebarOpen ? 260 : 76, transition: 'margin-left 0.3s ease', minWidth: 0 }}>

        {/* Header */}
        <header style={{
          background: 'rgba(5,5,7,0.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,98,0,0.1)',
          padding: '0 2rem', height: 66,
          display: 'flex', alignItems: 'center', gap: '1rem',
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => setSidebarOpen(s => !s)} className="icon-btn">
            {sidebarOpen ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
          </button>
          <div style={{ width: 1, height: 28, background: 'rgba(255,98,0,0.2)' }} />
          <Link href="/admin/movies" style={{ textDecoration: 'none' }}>
            <button className="icon-btn"><ArrowLeft style={{ width: 16, height: 16 }} /></button>
          </Link>
          <div style={{ width: 1, height: 28, background: 'rgba(255,98,0,0.2)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={14} style={{ color: 'white' }} />
            </div>
            <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', letterSpacing: '0.07em' }}>
              <span className="gradient-text">Upload</span> Film
            </p>
          </div>
        </header>

        {/* Form */}
        <div style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(2rem,5vh,3rem) clamp(1rem,4vw,2rem)' }}>

          <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.22)', marginBottom: '2rem', display: 'flex', gap: '0.65rem' }}>
            <Film style={{ width: 16, height: 16, color: 'var(--brand-gold)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,200,80,0.85)', lineHeight: 1.5 }}>
              Films uploaded as admin bypass the review queue. Toggle <strong>Published</strong> on to make them live immediately.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

            {/* ── Film Details ── */}
            <Section title="Film Details">
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. The Last Horizon" required onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical' } as any}
                    value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief synopsis…"
                    onFocus={e => (e.target.style.borderColor = 'rgba(255,140,0,0.45)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem' }}>
                  {([
                    ['Release Year',    releaseYear,  setReleaseYear,  'e.g. 2024',  'number'],
                    ['Duration (mins)', duration,     setDuration,     'e.g. 120',   'number'],
                    ['Director',        director,     setDirector,     'e.g. S.S. Rajamouli', 'text'],
                    ['Admin Rating',    adminRating,  setAdminRating,  'e.g. 8.5',   'number'],
                  ] as [string, string, (v: string) => void, string, string][]).map(([lbl, val, set, ph, type]) => (
                    <div key={lbl}>
                      <label style={labelStyle}>{lbl}</label>
                      <input type={type} style={inputStyle} value={val}
                        onChange={e => set(e.target.value)} placeholder={ph} onFocus={focus} onBlur={blur} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={labelStyle}>Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    style={inputStyle} onFocus={focus} onBlur={blur}>
                    <option value="" style={{ background: '#0e0e18' }}>Select language…</option>
                    {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#0e0e18' }}>{l}</option>)}
                  </select>
                </div>
              </div>
            </Section>

            {/* ── Video Links ── */}
            <Section title="Video Links">
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>YouTube URL (Main Film)</label>
                  <input style={inputStyle} value={youtubeUrl}
                    onChange={e => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…" onFocus={focus} onBlur={blur} />
                </div>
                <div>
                  <label style={labelStyle}>Trailer URL (optional)</label>
                  <input style={inputStyle} value={trailerUrl}
                    onChange={e => setTrailerUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…" onFocus={focus} onBlur={blur} />
                </div>
              </div>
            </Section>

            {/* ── Genres ── */}
            <Section title="Genres">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {GENRES.map(g => (
                  <button type="button" key={g} onClick={() => toggleGenre(g)}
                    className={`filter-pill${selectedGenres.includes(g) ? ' active' : ''}`}>
                    {g}
                  </button>
                ))}
              </div>
            </Section>

            {/* ── Images ── */}
            <Section title="Images & Thumbnail">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,183,51,0.06)', border: '1px solid rgba(255,183,51,0.15)', borderRadius: 10 }}>
                <ImageIcon style={{ width: 14, height: 14, color: 'var(--brand-gold)', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,200,100,0.75)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--brand-gold)' }}>Thumbnail</strong> appears on movie cards.{' '}
                  <strong style={{ color: 'var(--brand-gold)' }}>Poster</strong> is portrait (2:3).{' '}
                  <strong style={{ color: 'var(--brand-gold)' }}>Backdrop</strong> is used in the hero banner.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '1.25rem' }}>
                <ImageUploadBox label="🖼 Thumbnail (16:9)" preview={thumbPreview} ratio="16/9" highlight
                  onFile={async f => { setThumbFile(f); setThumbPreview(await readPreview(f)) }}
                  onClear={() => { setThumbFile(null); setThumbPreview(null) }}
                  inputRef={thumbRef} accept="image/*" hint="Card preview · 1280×720px" />

                <ImageUploadBox label="Poster (2:3)" preview={posterPreview} ratio="2/3"
                  onFile={async f => { setPosterFile(f); setPosterPreview(await readPreview(f)) }}
                  onClear={() => { setPosterFile(null); setPosterPreview(null) }}
                  inputRef={posterRef} accept="image/*" hint="Portrait · 400×600px" />

                <ImageUploadBox label="Backdrop (16:9)" preview={backdropPreview} ratio="16/9"
                  onFile={async f => { setBackdropFile(f); setBackdropPreview(await readPreview(f)) }}
                  onClear={() => { setBackdropFile(null); setBackdropPreview(null) }}
                  inputRef={backdropRef} accept="image/*" hint="Hero banner · 1920×1080px" />
              </div>
            </Section>

            {/* ── Cast ── */}
            <Section title="Cast & Actors">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {actors.map((actor, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 14, flexWrap: 'wrap' }}>
                    <div style={{ flexShrink: 0 }}>
                      <label htmlFor={`actor-img-${i}`} style={{ cursor: 'pointer', display: 'block' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: `2px dashed ${actor.imagePreview ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.15)'}`, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {actor.imagePreview
                            ? <img src={actor.imagePreview} alt="actor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User style={{ width: 28, height: 28, color: 'var(--text-muted)' }} />}
                        </div>
                      </label>
                      <input id={`actor-img-${i}`} type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { if (e.target.files?.[0]) handleActorImage(i, e.target.files[0]) }} />
                      <p style={{ fontSize: '0.63rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.3rem' }}>Photo</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 180, display: 'grid', gap: '0.6rem' }}>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>Actor Name</label>
                        <input style={inputStyle} value={actor.name}
                          onChange={e => updateActor(i, 'name', e.target.value)}
                          placeholder="e.g. Amitabh Bachchan" onFocus={focus} onBlur={blur} />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>Character Name</label>
                        <input style={inputStyle} value={actor.character}
                          onChange={e => updateActor(i, 'character', e.target.value)}
                          placeholder="e.g. Vijay" onFocus={focus} onBlur={blur} />
                      </div>
                    </div>
                    {actors.length > 1 && (
                      <button type="button" onClick={() => removeActor(i)}
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: '#f87171', flexShrink: 0, alignSelf: 'flex-start' }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addActor} className="btn-ghost"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <Plus size={15} /> Add Actor
                </button>
              </div>
            </Section>

            {/* ── Publish Settings ── */}
            <Section title="Publish Settings">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {([
                  { key: 'published', label: 'Published',  desc: 'Immediately visible to all users',          val: isPublished, set: setIsPublished, color: '#22c55e' },
                  { key: 'featured',  label: 'Featured',   desc: 'Show in the Featured Collection section',   val: isFeatured,  set: setIsFeatured,  color: '#FFB733' },
                  { key: 'trending',  label: 'Trending',   desc: 'Show in the Trending Now section',          val: isTrending,  set: setIsTrending,  color: '#ef4444' },
                ]).map(({ key, label, desc, val, set, color }) => (
                  <div key={key} onClick={() => set((v: boolean) => !v)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderRadius: 14, border: `1px solid ${val ? color+'44' : 'rgba(255,255,255,0.07)'}`, background: val ? color+'11' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.18s' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: val ? color : 'var(--text-primary)', marginBottom: '0.2rem' }}>{label}</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</p>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 12, background: val ? color : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 3, left: val ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {error && (
              <div style={{ padding: '0.9rem 1.1rem', borderRadius: 12, background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1.5rem', color: '#fca5a5', fontSize: '0.88rem' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-fire"
              style={{ width: '100%', justifyContent: 'center', padding: '1.1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: submitting ? 0.75 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
              {submitting
                ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Uploading…</>
                : <><Upload size={17} /> Upload Film</>}
            </button>
          </form>
        </div>
      </main>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '1.05rem', letterSpacing: '0.08em', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'inline-block', width: 3, height: '1em', background: 'linear-gradient(180deg,var(--brand-core),var(--brand-gold))', borderRadius: 2 }} />
        {title}
      </h3>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: '1.25rem' }}>
        {children}
      </div>
    </div>
  )
}

function ImageUploadBox({ label, preview, ratio, onFile, onClear, inputRef, accept, hint, highlight = false }: {
  label: string; preview: string | null; ratio: string
  onFile: (f: File) => void; onClear: () => void
  inputRef: React.RefObject<HTMLInputElement>; accept: string; hint?: string; highlight?: boolean
}) {
  return (
    <div>
      <p style={{ fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.5rem', color: highlight ? 'var(--brand-gold)' : 'var(--text-muted)' }}>{label}</p>
      <div
        onClick={() => !preview && inputRef.current?.click()}
        style={{
          aspectRatio: ratio, borderRadius: 12, overflow: 'hidden', position: 'relative',
          border: `${highlight ? '2px' : '1.5px'} dashed ${preview ? 'rgba(255,140,0,0.45)' : highlight ? 'rgba(255,183,51,0.35)' : 'rgba(255,255,255,0.12)'}`,
          background: highlight ? 'rgba(255,183,51,0.04)' : 'var(--bg-card)',
          cursor: preview ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s',
        }}
        onMouseOver={e => { if (!preview) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.5)' }}
        onMouseOut={e => { if (!preview) (e.currentTarget as HTMLElement).style.borderColor = highlight ? 'rgba(255,183,51,0.35)' : 'rgba(255,255,255,0.12)' }}
      >
        {preview ? (
          <>
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={e => { e.stopPropagation(); onClear() }}
              style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.72)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <X size={12} />
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '0.75rem' }}>
            <Upload style={{ width: 24, height: 24, color: highlight ? 'var(--brand-gold)' : 'var(--text-muted)', margin: '0 auto 0.4rem', opacity: 0.65 }} />
            <p style={{ fontSize: '0.72rem', color: highlight ? 'rgba(255,183,51,0.65)' : 'var(--text-muted)' }}>Click to upload</p>
            {hint && <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.2rem' }}>{hint}</p>}
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }} />
    </div>
  )
}