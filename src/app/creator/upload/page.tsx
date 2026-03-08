// src/app/(main)/creator/upload/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Upload, Plus, X, Film, User, Loader2, CheckCircle, ImageIcon } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface ActorEntry { name: string; character: string; imageFile: File | null; imagePreview: string | null }

const GENRES = ['Action','Comedy','Drama','Horror','Romance','Sci-Fi','Thriller','Mystery','Adventure','Documentary','Fantasy','Crime','Animation','Biography']

export default function CreatorUploadPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [title,          setTitle]          = useState('')
  const [description,    setDescription]    = useState('')
  const [youtubeUrl,     setYoutubeUrl]     = useState('')
  const [trailerUrl,     setTrailerUrl]     = useState('')
  const [releaseYear,    setReleaseYear]    = useState('')
  const [duration,       setDuration]       = useState('')
  const [language,       setLanguage]       = useState('')
  const [director,       setDirector]       = useState('')
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
      const prefix = `${user.id}/${slug}`

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
        uploaded_by:      user.id,
        uploaded_by_type: 'creator',
        is_published:     false,
        is_featured:      false,
        is_trending:      false,
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
            Pending admin review. Redirecting to your studio…
          </p>
        </div>
      </div>
    )
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
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = 'rgba(255,140,0,0.45)')
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = 'rgba(255,255,255,0.1)')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)' }}>
      <header style={{
        background: 'var(--nav-bg)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--glass-border)',
        padding: '0 clamp(1rem,4vw,2rem)', height: 66,
        display: 'flex', alignItems: 'center', gap: '1rem',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
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
        <div style={{ padding: '1rem 1.25rem', borderRadius: 14, background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.22)', marginBottom: '2rem', display: 'flex', gap: '0.65rem' }}>
          <Film style={{ width: 16, height: 16, color: 'var(--brand-gold)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,200,80,0.85)', lineHeight: 1.5 }}>
            All submissions are reviewed by our admin team before going live.
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Film Details */}
          <Section title="Film Details">
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. The Last Horizon" required onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 110, resize: 'vertical' } as any}
                  value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief synopsis…"
                  onFocus={e => (e.target.style.borderColor = 'rgba(255,140,0,0.45)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem' }}>
                {([
                  ['Release Year', releaseYear, setReleaseYear, 'e.g. 2024', 'number'],
                  ['Duration (mins)', duration, setDuration, 'e.g. 120', 'number'],
                  ['Language', language, setLanguage, 'e.g. Hindi', 'text'],
                  ['Director', director, setDirector, 'e.g. Raj Kapoor', 'text'],
                ] as [string, string, (v: string) => void, string, string][]).map(([lbl, val, set, ph, type]) => (
                  <div key={lbl}>
                    <label style={labelStyle}>{lbl}</label>
                    <input type={type} style={inputStyle} value={val} onChange={e => set(e.target.value)} placeholder={ph} onFocus={focus} onBlur={blur} />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* Video Links */}
          <Section title="Video Links">
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>YouTube URL (Main Film)</label>
                <input style={inputStyle} value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label style={labelStyle}>Trailer URL (optional)</label>
                <input style={inputStyle} value={trailerUrl} onChange={e => setTrailerUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" onFocus={focus} onBlur={blur} />
              </div>
            </div>
          </Section>

          {/* Genres */}
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

          {/* Images */}
          <Section title="Images & Thumbnail">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(255,183,51,0.06)', border: '1px solid rgba(255,183,51,0.15)', borderRadius: 10 }}>
              <ImageIcon style={{ width: 14, height: 14, color: 'var(--brand-gold)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,200,100,0.75)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--brand-gold)' }}>Thumbnail</strong> appears on movie cards.
                {' '}<strong style={{ color: 'var(--brand-gold)' }}>Poster</strong> is portrait (2:3).
                {' '}<strong style={{ color: 'var(--brand-gold)' }}>Backdrop</strong> is used in the hero banner.
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

          {/* Cast */}
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
                      <input style={inputStyle} value={actor.name} onChange={e => updateActor(i, 'name', e.target.value)} placeholder="e.g. Amitabh Bachchan" onFocus={focus} onBlur={blur} />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, marginBottom: '0.3rem' }}>Character Name</label>
                      <input style={inputStyle} value={actor.character} onChange={e => updateActor(i, 'character', e.target.value)} placeholder="e.g. Vijay" onFocus={focus} onBlur={blur} />
                    </div>
                  </div>
                  {actors.length > 1 && (
                    <button type="button" onClick={() => removeActor(i)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.4rem', cursor: 'pointer', color: '#f87171', flexShrink: 0, alignSelf: 'flex-start' }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addActor} className="btn-ghost" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <Plus size={15} /> Add Actor
              </button>
            </div>
          </Section>

          {error && (
            <div style={{ padding: '0.9rem 1.1rem', borderRadius: 12, background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: '1.5rem', color: '#fca5a5', fontSize: '0.88rem' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-fire"
            style={{ width: '100%', justifyContent: 'center', padding: '1.1rem', fontSize: '1rem', fontWeight: 700, opacity: submitting ? 0.75 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting
              ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Submitting…</>
              : <><Upload size={17} /> Submit for Review</>}
          </button>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </main>
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
          boxShadow: highlight && !preview ? '0 0 20px rgba(255,183,51,0.07)' : 'none',
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