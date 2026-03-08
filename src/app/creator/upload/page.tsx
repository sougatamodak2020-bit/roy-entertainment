// src/app/(main)/creator/upload/page.tsx
// Full film upload form with thumbnail, poster, actor images + approval flow
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Upload, Plus, X, Film, User, Loader2, CheckCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface ActorEntry { name: string; character: string; imageFile: File | null; imagePreview: string | null }

const GENRES = ['Action','Comedy','Drama','Horror','Romance','Sci-Fi','Thriller','Mystery','Adventure','Documentary','Fantasy','Crime','Animation','Biography']

export default function CreatorUploadPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  // Film details
  const [title,          setTitle]          = useState('')
  const [description,    setDescription]    = useState('')
  const [youtubeUrl,     setYoutubeUrl]     = useState('')
  const [trailerUrl,     setTrailerUrl]     = useState('')
  const [releaseYear,    setReleaseYear]    = useState('')
  const [duration,       setDuration]       = useState('')
  const [language,       setLanguage]       = useState('')
  const [director,       setDirector]       = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])

  // Media files
  const [posterFile,     setPosterFile]     = useState<File | null>(null)
  const [posterPreview,  setPosterPreview]  = useState<string | null>(null)
  const [thumbFile,      setThumbFile]      = useState<File | null>(null)
  const [thumbPreview,   setThumbPreview]   = useState<string | null>(null)
  const [backdropFile,   setBackdropFile]   = useState<File | null>(null)
  const [backdropPreview,setBackdropPreview]= useState<string | null>(null)

  // Actors
  const [actors, setActors] = useState<ActorEntry[]>([{ name: '', character: '', imageFile: null, imagePreview: null }])

  const [submitting, setSubmitting] = useState(false)
  const [success,    setSuccess]    = useState(false)
  const [error,      setError]      = useState('')

  const posterRef   = useRef<HTMLInputElement>(null!)
  const thumbRef    = useRef<HTMLInputElement>(null!)
  const backdropRef = useRef<HTMLInputElement>(null!)

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
    })
  }, [])

  const handleFilePreview = (file: File, setPreview: (v: string) => void) => {
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { console.error('Upload error:', error); return null }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  const toggleGenre = (g: string) =>
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const addActor = () => setActors(prev => [...prev, { name: '', character: '', imageFile: null, imagePreview: null }])
  const removeActor = (i: number) => setActors(prev => prev.filter((_, idx) => idx !== i))
  const updateActor = (i: number, field: keyof ActorEntry, value: any) =>
    setActors(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))

  const handleActorImage = (i: number, file: File) => {
    updateActor(i, 'imageFile', file)
    const reader = new FileReader()
    reader.onload = e => updateActor(i, 'imagePreview', e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setError('')
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()
      const prefix = `${user.id}/${slug}`

      // Upload media
      let posterUrl:   string | null = null
      let thumbUrl:    string | null = null
      let backdropUrl: string | null = null

      if (posterFile)   posterUrl   = await uploadFile(posterFile,   'movies', `${prefix}/poster.${posterFile.name.split('.').pop()}`)
      if (thumbFile)    thumbUrl    = await uploadFile(thumbFile,    'movies', `${prefix}/thumbnail.${thumbFile.name.split('.').pop()}`)
      if (backdropFile) backdropUrl = await uploadFile(backdropFile, 'movies', `${prefix}/backdrop.${backdropFile.name.split('.').pop()}`)

      // Extract youtube_id
      const ytMatch = youtubeUrl.match(/(?:v=|youtu\.be\/)([^&?/]+)/)
      const youtubeId = ytMatch?.[1] ?? null

      // Insert movie (is_published=false → pending admin approval)
      const { data: movieData, error: movieError } = await supabase.from('movies').insert({
        title:            title.trim(),
        slug,
        description:      description.trim() || null,
        youtube_url:      youtubeUrl.trim()  || null,
        youtube_id:       youtubeId,
        trailer_url:      trailerUrl.trim()  || null,
        poster_url:       posterUrl || thumbUrl,   // use thumb as fallback poster
        backdrop_url:     backdropUrl,
        release_year:     releaseYear ? parseInt(releaseYear) : null,
        duration_minutes: duration    ? parseInt(duration)    : null,
        language:         language.trim()    || null,
        director:         director.trim()    || null,
        genre:            selectedGenres.length ? selectedGenres : null,
        uploaded_by:      user.id,
        uploaded_by_type: 'creator',
        is_published:     false,   // ← must be approved by admin
        is_featured:      false,
        is_trending:      false,
        view_count:       0,
      }).select('id').single()

      if (movieError) throw movieError

      const movieId = movieData.id

      // Insert actors
      const validActors = actors.filter(a => a.name.trim())
      for (let i = 0; i < validActors.length; i++) {
        const a = validActors[i]
        let actorImageUrl: string | null = null

        if (a.imageFile) {
          actorImageUrl = await uploadFile(a.imageFile, 'actors', `${prefix}/actor-${i}.${a.imageFile.name.split('.').pop()}`)
        }

        // Upsert actor
        const { data: actorData } = await supabase.from('actors').upsert({
          name:      a.name.trim(),
          image_url: actorImageUrl,
        }, { onConflict: 'name' }).select('id').single()

        if (actorData?.id) {
          await supabase.from('movie_actors').insert({
            movie_id:       movieId,
            actor_id:       actorData.id,
            character_name: a.character.trim() || null,
          })
        }
      }

      setSuccess(true)
      setTimeout(() => router.push('/creator'), 2500)
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle style={{ width: 40, height: 40, color: '#4ADE80' }} />
          </div>
          <h2 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '2.5rem', letterSpacing: '0.05em', marginBottom: '0.75rem', color: 'white' }}>Film Submitted!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 360, margin: '0 auto' }}>
            Your film is now pending admin review and will go live once approved. Redirecting to your studio…
          </p>
        </div>
      </div>
    )
  }

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
    padding: '0.85rem 1rem', color: 'white', fontSize: '0.92rem',
    outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'Outfit, sans-serif', transition: 'border-color 0.2s',
  }
  const labelStyle = { fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: '0.5rem', display: 'block' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <header style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--glass-border)', padding: '0 clamp(1rem,4vw,2rem)', height: 66, display: 'flex', alignItems: 'center', gap: '1rem', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => router.back()} className="icon-btn"><ArrowLeft size={16} /></button>
        <div style={{ width: 1, height: 28, background: 'var(--glass-border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload size={14} style={{ color: 'white' }} />
          </div>
          <p style={{ fontFamily: 'Bebas Neue', fontSize: '1.05rem', letterSpacing: '0.07em' }}>
            <span className="gradient-text">Upload</span> Film
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(2rem,5vh,3rem) clamp(1rem,4vw,2rem)' }}>

        {/* Notice */}
        <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.22)', marginBottom: '2rem', display: 'flex', gap: '0.65rem' }}>
          <Film style={{ width: 16, height: 16, color: 'var(--brand-gold)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,200,80,0.85)', lineHeight: 1.5 }}>
            All submissions are reviewed by our admin team before going live. Ensure your film meets our community guidelines.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Section: Film Details ─────────────────── */}
          <Section title="Film Details">
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Last Horizon" required
                  onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief synopsis of the film…"
                  onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                {[
                  { label: 'Release Year', val: releaseYear, set: setReleaseYear, placeholder: 'e.g. 2024', type: 'number' },
                  { label: 'Duration (mins)', val: duration,    set: setDuration,    placeholder: 'e.g. 120',   type: 'number' },
                  { label: 'Language',       val: language,    set: setLanguage,    placeholder: 'e.g. Hindi',  type: 'text'   },
                  { label: 'Director',       val: director,    set: setDirector,    placeholder: 'e.g. Raj Kapoor', type: 'text' },
                ].map(({ label, val, set, placeholder, type }) => (
                  <div key={label}>
                    <label style={labelStyle}>{label}</label>
                    <input type={type} style={inputStyle} value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
                      onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── Section: Video Links ──────────────────── */}
          <Section title="Video Links">
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>YouTube URL (Main Film)</label>
                <input style={inputStyle} value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
                  onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={labelStyle}>Trailer URL (optional)</label>
                <input style={inputStyle} value={trailerUrl} onChange={e => setTrailerUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..."
                  onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            </div>
          </Section>

          {/* ── Section: Genres ───────────────────────── */}
          <Section title="Genres">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {GENRES.map(g => (
                <button type="button" key={g}
                  onClick={() => toggleGenre(g)}
                  className={`filter-pill${selectedGenres.includes(g) ? ' active' : ''}`}>
                  {g}
                </button>
              ))}
            </div>
          </Section>

          {/* ── Section: Images ───────────────────────── */}
          <Section title="Images">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem' }}>

              {/* Poster */}
              <ImageUploadBox label="Poster (2:3)" preview={posterPreview} ratio="2/3"
                onFile={f => { setPosterFile(f); handleFilePreview(f, setPosterPreview) }}
                onClear={() => { setPosterFile(null); setPosterPreview(null) }}
                inputRef={posterRef} accept="image/*" hint="Recommended: 400×600px" />

              {/* Thumbnail */}
              <ImageUploadBox label="Thumbnail (16:9)" preview={thumbPreview} ratio="16/9"
                onFile={f => { setThumbFile(f); handleFilePreview(f, setPosterPreview => setThumbPreview(f ? URL.createObjectURL(f) : null)) }}
                onClear={() => { setThumbFile(null); setThumbPreview(null) }}
                inputRef={thumbRef} accept="image/*" hint="Recommended: 1280×720px" />

              {/* Backdrop */}
              <ImageUploadBox label="Backdrop (16:9)" preview={backdropPreview} ratio="16/9"
                onFile={f => { setBackdropFile(f); handleFilePreview(f, setBackdropPreview) }}
                onClear={() => { setBackdropFile(null); setBackdropPreview(null) }}
                inputRef={backdropRef} accept="image/*" hint="Recommended: 1920×1080px" />
            </div>
          </Section>

          {/* ── Section: Cast ─────────────────────────── */}
          <Section title="Cast & Actors">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {actors.map((actor, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 14, flexWrap: 'wrap' }}>

                  {/* Actor photo upload */}
                  <div style={{ flexShrink: 0 }}>
                    <label htmlFor={`actor-img-${i}`} style={{ cursor: 'pointer', display: 'block' }}>
                      <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: `2px dashed ${actor.imagePreview ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.15)'}`, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s' }}>
                        {actor.imagePreview
                          ? <img src={actor.imagePreview} alt="actor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <User style={{ width: 28, height: 28, color: 'var(--text-dim)' }} />
                        }
                      </div>
                    </label>
                    <input id={`actor-img-${i}`} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) handleActorImage(i, e.target.files[0]) }} />
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '0.3rem' }}>Photo</p>
                  </div>

                  <div style={{ flex: 1, minWidth: 180, display: 'grid', gap: '0.6rem' }}>
                    <div>
                      <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>Actor Name</label>
                      <input style={inputStyle} value={actor.name} onChange={e => updateActor(i, 'name', e.target.value)} placeholder="e.g. Amitabh Bachchan"
                        onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>Character Name</label>
                      <input style={inputStyle} value={actor.character} onChange={e => updateActor(i, 'character', e.target.value)} placeholder="e.g. Vijay"
                        onFocus={e => e.target.style.borderColor = 'rgba(255,140,0,0.45)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                    </div>
                  </div>

                  {actors.length > 1 && (
                    <button type="button" onClick={() => removeActor(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: '#f87171', flexShrink: 0, alignSelf: 'flex-start' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}

              <button type="button" onClick={addActor} className="btn-ghost" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <Plus size={15} /> Add Actor
              </button>
            </div>
          </Section>

          {/* Error */}
          {error && (
            <div style={{ padding: '0.9rem 1.1rem', borderRadius: 12, background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1.5rem', color: '#fca5a5', fontSize: '0.88rem' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={submitting} className="btn-fire" style={{ width: '100%', justifyContent: 'center', padding: '1.1rem', fontSize: '1rem', fontWeight: 700, opacity: submitting ? 0.75 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting
              ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Submitting…</>
              : <><Upload size={17} /> Submit for Review</>
            }
          </button>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </main>
    </div>
  )
}

/* ── Helpers ──────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3 style={{ fontFamily: 'Bebas Neue,sans-serif', fontSize: '1.1rem', letterSpacing: '0.08em', color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ display: 'inline-block', width: 3, height: '1em', background: 'linear-gradient(180deg,var(--brand-core),var(--brand-gold))', borderRadius: 2 }} />
        {title}
      </h3>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: '1.25rem' }}>
        {children}
      </div>
    </div>
  )
}

function ImageUploadBox({ label, preview, ratio, onFile, onClear, inputRef, accept, hint }: {
  label: string; preview: string | null; ratio: string
  onFile: (f: File) => void; onClear: () => void
  inputRef: React.RefObject<HTMLInputElement>; accept: string; hint?: string
}) {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{label}</p>
      <div
        onClick={() => !preview && inputRef.current?.click()}
        style={{
          aspectRatio: ratio, borderRadius: 12, overflow: 'hidden', position: 'relative',
          border: `2px dashed ${preview ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.12)'}`,
          background: 'var(--bg-card)', cursor: preview ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color 0.2s',
        }}
        onMouseOver={e => { if (!preview) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.35)' }}
        onMouseOut={e => { if (!preview) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
      >
        {preview
          ? <>
              <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={onClear}
                style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <X size={13} />
              </button>
            </>
          : <div style={{ textAlign: 'center', padding: '1rem' }}>
              <Upload style={{ width: 28, height: 28, color: 'var(--text-dim)', margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Click to upload</p>
              {hint && <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>{hint}</p>}
            </div>
        }
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }} />
    </div>
  )
}