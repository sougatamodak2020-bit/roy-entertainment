// src/app/admin/upload/page.tsx
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Youtube, Sparkles, Loader2, Check,
  Film, User, Clock, Star, Tag, Globe, Upload, X, ImageIcon
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

const GENRES    = ['Action','Comedy','Drama','Horror','Romance','Sci-Fi','Thriller','Mystery','Adventure','Documentary']
const LANGUAGES = ['English','Hindi','Bengali','Tamil','Telugu','Malayalam','Korean','Japanese','Spanish','French']

interface MovieForm {
  title: string; description: string; youtube_url: string
  poster_url: string; release_year: number; duration_minutes: number
  genre: string[]; language: string; director: string
  actors: string; admin_rating: number
}

export default function AdminUploadPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [step,       setStep]       = useState(1)
  const [isLoading,  setIsLoading]  = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')

  // Custom image uploads
  const [thumbFile,       setThumbFile]       = useState<File | null>(null)
  const [thumbPreview,    setThumbPreview]    = useState<string | null>(null)
  const [backdropFile,    setBackdropFile]    = useState<File | null>(null)
  const [backdropPreview, setBackdropPreview] = useState<string | null>(null)
  const thumbRef    = useRef<HTMLInputElement>(null!)
  const backdropRef = useRef<HTMLInputElement>(null!)

  const [form, setForm] = useState<MovieForm>({
    title: '', description: '', youtube_url: '',
    poster_url: '', release_year: new Date().getFullYear(),
    duration_minutes: 0, genre: [], language: 'English',
    director: '', actors: '', admin_rating: 0,
  })

  const extractYouTubeId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]
    for (const p of patterns) { const m = url.match(p); if (m) return m[1] }
    return null
  }

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)

  const readPreview = (file: File): Promise<string> =>
    new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(file) })

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { console.error(error); return null }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  }

  const handleYouTubeExtract = async () => {
    const videoId = extractYouTubeId(youtubeUrl)
    if (!videoId) { setError('Invalid YouTube URL'); return }
    setExtracting(true); setError('')
    try {
      setForm(prev => ({
        ...prev,
        youtube_url: youtubeUrl,
        poster_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        title: prev.title || '',
        duration_minutes: prev.duration_minutes || 120,
      }))
      setStep(2)
    } catch { setError('Failed to extract video info') }
    finally { setExtracting(false) }
  }

  const handleSubmit = async () => {
    if (!form.title) { setError('Please enter a movie title'); return }
    if (!form.youtube_url) { setError('Please add a YouTube URL'); return }
    setIsLoading(true); setError(''); setSuccess('')
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Must be logged in')

      const videoId = extractYouTubeId(form.youtube_url)
      if (!videoId) throw new Error('Invalid YouTube URL')

      const slug   = generateSlug(form.title)
      const prefix = `admin/${slug}`

      // Upload custom images if provided
      let posterUrl:   string | null = form.poster_url
      let backdropUrl: string | null = null

      if (thumbFile)    posterUrl   = await uploadFile(thumbFile,    'movies', `${prefix}/thumbnail.${thumbFile.name.split('.').pop()}`) ?? posterUrl
      if (backdropFile) backdropUrl = await uploadFile(backdropFile, 'movies', `${prefix}/backdrop.${backdropFile.name.split('.').pop()}`)

      const actorsArray = form.actors.split(',').map(a => a.trim()).filter(Boolean)

      const { error: insertError } = await supabase.from('movies').insert({
        title:            form.title.trim(),
        slug,
        description:      form.description.trim() || null,
        youtube_id:       videoId,
        youtube_url:      form.youtube_url,
        poster_url:       posterUrl,
        backdrop_url:     backdropUrl,
        release_year:     form.release_year || new Date().getFullYear(),
        duration_minutes: form.duration_minutes || 0,
        language:         form.language || 'English',
        director:         form.director.trim() || null,
        actors:           actorsArray.length > 0 ? actorsArray : null,
        genre:            form.genre.length > 0 ? form.genre : null,
        admin_rating:     form.admin_rating,
        rating:           form.admin_rating,
        is_published:     true,
        is_featured:      false,
        is_trending:      false,
        uploaded_by:      user.id,
        uploaded_by_type: 'admin',
      })

      if (insertError) {
        if (insertError.code === '23505') throw new Error('A movie with this title already exists')
        throw new Error(insertError.message)
      }

      setSuccess('🎉 Movie published!')
      setTimeout(() => router.push('/admin'), 1500)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally { setIsLoading(false) }
  }

  /* ── Styles ── */
  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 20, padding: '2rem',
  }
  const inputSt: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: 'white', outline: 'none', fontFamily: 'Outfit,sans-serif',
    fontSize: '0.92rem', boxSizing: 'border-box',
  }
  const labelSt: React.CSSProperties = {
    display: 'block', marginBottom: '0.45rem',
    fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: 'white', fontFamily: 'Outfit,sans-serif' }}>

      {/* Header */}
      <header style={{ background: 'rgba(15,15,20,0.96)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin">
            <button style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' }}>
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </button>
          </Link>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Upload New Film</h1>
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Admin — published immediately</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem clamp(1rem,4vw,2rem)' }}>

        {/* Alerts */}
        {success && (
          <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, color: '#22c55e', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check style={{ width: 18, height: 18 }} />{success}
          </div>
        )}
        {error && (
          <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#f87171', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* Step indicators */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.88rem',
                background: step >= s ? 'rgba(255,98,0,0.18)' : 'rgba(255,255,255,0.05)',
                border: step >= s ? '2px solid #FF6200' : '2px solid rgba(255,255,255,0.1)',
                color: step >= s ? '#FF8C00' : 'rgba(255,255,255,0.35)',
              }}>
                {step > s ? <Check style={{ width: 16, height: 16 }} /> : s}
              </div>
              <span style={{ fontSize: '0.88rem', color: step >= s ? 'white' : 'rgba(255,255,255,0.35)' }}>
                {s === 1 ? 'Source' : s === 2 ? 'Details' : 'Review'}
              </span>
              {s < 3 && <div style={{ width: 36, height: 2, background: step > s ? '#FF6200' : 'rgba(255,255,255,0.1)', borderRadius: 1 }} />}
            </div>
          ))}
        </div>

        {/* ── Step 1: YouTube ── */}
        {step === 1 && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Youtube style={{ width: 38, height: 38, color: '#ff3333' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Add YouTube Video</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Paste a YouTube URL — we'll use it as the video source
            </p>
            <div style={{ maxWidth: 500, margin: '0 auto' }}>
              <input type="url" value={youtubeUrl} onChange={e => { setYoutubeUrl(e.target.value); setError('') }}
                placeholder="https://www.youtube.com/watch?v=…"
                style={{ ...inputSt, marginBottom: '1rem' }} />
              <button onClick={handleYouTubeExtract} disabled={!youtubeUrl || extracting}
                style={{
                  width: '100%', padding: '1rem',
                  background: 'linear-gradient(135deg, #FF6200, #FF8C00)',
                  border: 'none', borderRadius: 12, color: 'white',
                  fontSize: '1rem', fontWeight: 600,
                  cursor: !youtubeUrl || extracting ? 'not-allowed' : 'pointer',
                  opacity: !youtubeUrl || extracting ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}>
                {extracting
                  ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Extracting…</>
                  : <><Sparkles style={{ width: 18, height: 18 }} /> Continue to Details</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <div style={card}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.75rem' }}>Movie Details</h2>

            {/* YouTube preview */}
            {form.poster_url && (
              <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <img src={form.poster_url} alt="YT thumb" style={{ width: 140, height: 94, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>YouTube auto-thumbnail</p>
                  <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>You can upload a custom poster/thumbnail below to replace this.</p>
                </div>
              </div>
            )}

            {/* ── Custom Image Uploads ── */}
            <div style={{ marginBottom: '1.75rem', padding: '1.25rem', background: 'rgba(255,183,51,0.05)', border: '1px solid rgba(255,183,51,0.16)', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
                <ImageIcon style={{ width: 14, height: 14, color: 'var(--brand-gold, #FFB733)' }} />
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,200,80,0.85)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Custom Images (optional — replaces YouTube thumbnail)
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem' }}>

                {/* Thumbnail / Poster */}
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FFB733', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🖼 Thumbnail / Poster</p>
                  <div
                    onClick={() => !thumbPreview && thumbRef.current?.click()}
                    style={{
                      aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', position: 'relative',
                      border: `2px dashed ${thumbPreview ? 'rgba(255,140,0,0.45)' : 'rgba(255,183,51,0.3)'}`,
                      background: 'rgba(255,183,51,0.04)', cursor: thumbPreview ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseOver={e => { if (!thumbPreview) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.55)' }}
                    onMouseOut={e => { if (!thumbPreview) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,183,51,0.3)' }}
                  >
                    {thumbPreview ? (
                      <>
                        <img src={thumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={e => { e.stopPropagation(); setThumbFile(null); setThumbPreview(null) }}
                          style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <Upload style={{ width: 22, height: 22, color: '#FFB733', margin: '0 auto 0.35rem', opacity: 0.65 }} />
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,183,51,0.6)' }}>Upload thumbnail</p>
                        <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.15rem' }}>1280×720px</p>
                      </div>
                    )}
                  </div>
                  <input ref={thumbRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={async e => { if (e.target.files?.[0]) { setThumbFile(e.target.files[0]); setThumbPreview(await readPreview(e.target.files[0])) }}} />
                </div>

                {/* Backdrop */}
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Backdrop (Hero Banner)</p>
                  <div
                    onClick={() => !backdropPreview && backdropRef.current?.click()}
                    style={{
                      aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', position: 'relative',
                      border: `1.5px dashed ${backdropPreview ? 'rgba(255,140,0,0.45)' : 'rgba(255,255,255,0.14)'}`,
                      background: 'var(--bg-card, #1a1a28)', cursor: backdropPreview ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseOver={e => { if (!backdropPreview) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,140,0,0.4)' }}
                    onMouseOut={e => { if (!backdropPreview) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)' }}
                  >
                    {backdropPreview ? (
                      <>
                        <img src={backdropPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button type="button" onClick={e => { e.stopPropagation(); setBackdropFile(null); setBackdropPreview(null) }}
                          style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                        <Upload style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.3)', margin: '0 auto 0.35rem' }} />
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>Upload backdrop</p>
                        <p style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.18)', marginTop: '0.15rem' }}>1920×1080px</p>
                      </div>
                    )}
                  </div>
                  <input ref={backdropRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={async e => { if (e.target.files?.[0]) { setBackdropFile(e.target.files[0]); setBackdropPreview(await readPreview(e.target.files[0])) }}} />
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelSt}><Film style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter movie title" style={inputSt} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelSt}>Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="Enter movie description" style={{ ...inputSt, resize: 'vertical' } as any} />
              </div>
              <div>
                <label style={labelSt}><User style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Director</label>
                <input type="text" value={form.director} onChange={e => setForm(p => ({ ...p, director: e.target.value }))} placeholder="e.g. Sun Roy" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}><User style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Actors (comma separated)</label>
                <input type="text" value={form.actors} onChange={e => setForm(p => ({ ...p, actors: e.target.value }))} placeholder="e.g. Amaresh Das, Kheya Das" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}><Clock style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Duration (minutes)</label>
                <input type="number" value={form.duration_minutes || ''} onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))} placeholder="120" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Release Year</label>
                <input type="number" value={form.release_year || ''} onChange={e => setForm(p => ({ ...p, release_year: parseInt(e.target.value) || new Date().getFullYear() }))} placeholder="2024" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}><Globe style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Language</label>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} style={{ ...inputSt, cursor: 'pointer' }}>
                  {LANGUAGES.map(l => <option key={l} value={l} style={{ background: '#1a1a1d' }}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}><Star style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Admin Rating</label>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button key={n} type="button" onClick={() => setForm(p => ({ ...p, admin_rating: n }))}
                      style={{
                        width: 32, height: 32, borderRadius: 6, border: 'none',
                        background: form.admin_rating >= n ? '#FF8C00' : 'rgba(255,255,255,0.06)',
                        color: form.admin_rating >= n ? '#000' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelSt}><Tag style={{ width: 13, height: 13, display: 'inline', marginRight: 4 }} />Genres</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {GENRES.map(g => (
                    <button key={g} type="button"
                      onClick={() => setForm(p => ({ ...p, genre: p.genre.includes(g) ? p.genre.filter(x => x !== g) : [...p.genre, g] }))}
                      style={{
                        padding: '0.45rem 0.95rem', borderRadius: 20, border: 'none',
                        background: form.genre.includes(g) ? 'rgba(255,98,0,0.22)' : 'rgba(255,255,255,0.05)',
                        color: form.genre.includes(g) ? '#FF8C00' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer', fontSize: '0.83rem',
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                      }}>
                      {form.genre.includes(g) && <Check style={{ width: 13, height: 13 }} />} {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button onClick={() => setStep(1)} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', cursor: 'pointer' }}>
                Back
              </button>
              <button onClick={() => setStep(3)} style={{ padding: '0.75rem 1.75rem', background: 'linear-gradient(135deg, #FF6200, #FF8C00)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                Review →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div style={card}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.75rem' }}>Review & Publish</h2>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <img
                src={thumbPreview || form.poster_url}
                alt="Poster"
                style={{ width: 200, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=No+Image' }}
              />
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.5rem' }}>{form.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', lineHeight: 1.6, fontSize: '0.9rem' }}>
                  {form.description?.slice(0, 180) || 'No description'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  {[
                    ['Director',  form.director      || 'Not set'],
                    ['Actors',    form.actors        || 'Not set'],
                    ['Duration',  form.duration_minutes ? `${form.duration_minutes} min` : '—'],
                    ['Language',  form.language],
                    ['Year',      String(form.release_year)],
                    ['Rating',    form.admin_rating ? `${form.admin_rating}/10` : '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.38)', marginBottom: '0.15rem' }}>{k}</p>
                      <p style={{ fontSize: '0.88rem', color: 'white' }}>{v}</p>
                    </div>
                  ))}
                </div>
                {form.genre.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {form.genre.map(g => (
                      <span key={g} style={{ padding: '0.22rem 0.7rem', background: 'rgba(255,98,0,0.15)', borderRadius: 20, fontSize: '0.8rem', color: '#FF8C00' }}>{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', cursor: 'pointer' }}>
                Back to Edit
              </button>
              <button onClick={handleSubmit} disabled={isLoading}
                style={{
                  padding: '0.75rem 2rem',
                  background: isLoading ? 'rgba(34,197,94,0.4)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none', borderRadius: 10, color: 'white', fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                {isLoading
                  ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Publishing…</>
                  : <><Check style={{ width: 16, height: 16 }} /> Publish Movie</>
                }
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}