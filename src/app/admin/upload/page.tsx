// src/app/admin/upload/page.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Youtube, Sparkles, Loader2, Check,
  Film, User, Clock, Star, Tag, Globe
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Sci-Fi', 'Thriller', 'Mystery', 'Adventure', 'Documentary']
const languages = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Malayalam', 'Korean', 'Japanese', 'Spanish', 'French']

interface MovieForm {
  title: string
  description: string
  youtube_url: string
  poster_url: string
  release_year: number
  duration_minutes: number
  genre: string[]
  language: string
  director: string
  actors: string
  admin_rating: number
}

export default function AdminUploadPage() {
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [form, setForm] = useState<MovieForm>({
    title: '',
    description: '',
    youtube_url: '',
    poster_url: '',
    release_year: new Date().getFullYear(),
    duration_minutes: 0,
    genre: [],
    language: 'English',
    director: '',
    actors: '',
    admin_rating: 0,
  })

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)
  }

  const handleYouTubeExtract = async () => {
    const videoId = extractYouTubeId(youtubeUrl)
    if (!videoId) {
      setError('Invalid YouTube URL')
      return
    }

    setExtracting(true)
    setError('')
    
    try {
      setForm(prev => ({
        ...prev,
        youtube_url: youtubeUrl,
        poster_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        title: prev.title || 'Enter Movie Title',
        description: prev.description || 'Add a description for your movie',
        duration_minutes: prev.duration_minutes || 120,
      }))
      setStep(2)
    } catch (err) {
      setError('Failed to extract video information')
    } finally {
      setExtracting(false)
    }
  }

  const handleGenreToggle = (genre: string) => {
    setForm(prev => ({
      ...prev,
      genre: prev.genre.includes(genre)
        ? prev.genre.filter(g => g !== genre)
        : [...prev.genre, genre]
    }))
  }

  const handleSubmit = async () => {
    if (!form.title || form.title === 'Enter Movie Title') {
      setError('Please enter a valid movie title')
      return
    }
    
    if (!form.youtube_url) {
      setError('Please add a YouTube URL')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const supabase = createSupabaseBrowserClient()
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('You must be logged in to upload movies')
      }

      const videoId = extractYouTubeId(form.youtube_url)
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }

      const slug = generateSlug(form.title)

      const actorsArray = form.actors
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0)

      const movieData = {
        title: form.title.trim(),
        slug: slug,
        description: form.description.trim() || null,
        youtube_id: videoId,
        youtube_url: form.youtube_url,
        poster_url: form.poster_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        release_year: form.release_year || new Date().getFullYear(),
        duration_minutes: form.duration_minutes || 0,
        language: form.language || 'English',
        director: form.director.trim() || null,
        actors: actorsArray.length > 0 ? actorsArray : null,
        genre: form.genre.length > 0 ? form.genre : null,
        admin_rating: form.admin_rating,
        rating: form.admin_rating,
        is_published: true,
        is_featured: false,
        is_trending: false,
        uploaded_by: user.id,
        uploaded_by_type: 'admin' as const,
      }

      const { data, error: insertError } = await supabase
        .from('movies')
        .insert(movieData)
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        if (insertError.code === '23505') {
          throw new Error('A movie with this title already exists')
        }
        if (insertError.code === '42501') {
          throw new Error('Permission denied. Make sure you have admin access.')
        }
        throw new Error(insertError.message || 'Failed to upload movie')
      }

      setSuccess('🎉 Movie uploaded successfully!')
      
      setTimeout(() => {
        router.push('/admin')
      }, 1500)
      
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload movie')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'rgba(15, 15, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '1rem 2rem',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin">
            <button style={{
              padding: '0.5rem',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
            }}>
              <ArrowLeft style={{ width: '20px', height: '20px' }} />
            </button>
          </Link>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>Upload New Film</h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Admin Upload</p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Success Message */}
        {success && (
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            color: '#22c55e',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <Check style={{ width: '20px', height: '20px' }} />
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            color: '#f87171',
            marginBottom: '1.5rem',
          }}>
            {error}
          </div>
        )}

        {/* Progress Steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                backgroundColor: step >= s ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                border: step >= s ? '2px solid #8b5cf6' : '2px solid rgba(255,255,255,0.1)',
                color: step >= s ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              }}>
                {step > s ? <Check style={{ width: '18px', height: '18px' }} /> : s}
              </div>
              <span style={{ fontSize: '0.9rem', color: step >= s ? 'white' : 'rgba(255,255,255,0.4)' }}>
                {s === 1 ? 'Source' : s === 2 ? 'Details' : 'Review'}
              </span>
              {s < 3 && <div style={{ width: '40px', height: '2px', backgroundColor: step > s ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }} />}
            </div>
          ))}
        </div>

        {/* Step 1: YouTube URL */}
        {step === 1 && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '2.5rem',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(255, 0, 0, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Youtube style={{ width: '40px', height: '40px', color: '#ff0000' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>Add YouTube Video</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
              Paste a YouTube URL to automatically extract video information
            </p>
            
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => {
                  setYoutubeUrl(e.target.value)
                  setError('')
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleYouTubeExtract}
                disabled={!youtubeUrl || extracting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: extracting ? 'not-allowed' : 'pointer',
                  opacity: !youtubeUrl || extracting ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {extracting ? (
                  <>
                    <Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles style={{ width: '20px', height: '20px' }} />
                    Extract & Continue
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Movie Details */}
        {step === 2 && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '2rem',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'white' }}>Movie Details</h2>
            
            {/* Preview */}
            {form.poster_url && (
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                marginBottom: '2rem',
                padding: '1rem',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
              }}>
                <img 
                  src={form.poster_url} 
                  alt="Poster" 
                  style={{ width: '120px', height: '160px', borderRadius: '8px', objectFit: 'cover' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://via.placeholder.com/120x160?text=No+Image'
                  }}
                />
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>{form.title || 'Movie Title'}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    {form.description?.slice(0, 150) || 'No description'}...
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Title */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Film style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.5rem' }} />
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter movie title"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Description */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  placeholder="Enter movie description"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Director */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <User style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.5rem' }} />
                  Director
                </label>
                <input
                  type="text"
                  value={form.director}
                  onChange={(e) => setForm(prev => ({ ...prev, director: e.target.value }))}
                  placeholder="e.g., Sun Roy"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Actors */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <User style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.5rem' }} />
                  Actors (comma separated)
                </label>
                <input
                  type="text"
                  value={form.actors}
                  onChange={(e) => setForm(prev => ({ ...prev, actors: e.target.value }))}
                  placeholder="e.g., Amaresh Das, Kheya Das"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Duration */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Clock style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.5rem' }} />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={form.duration_minutes || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                  placeholder="120"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Year */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>Release Year</label>
                <input
                  type="number"
                  value={form.release_year || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, release_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  placeholder="2024"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Language */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Globe style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.5rem' }} />
                  Language
                </label>
                <select
                  value={form.language}
                  onChange={(e) => setForm(prev => ({ ...prev, language: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    outline: 'none',
                  }}
                >
                  {languages.map(lang => <option key={lang} value={lang} style={{ background: '#1a1a1d' }}>{lang}</option>)}
                </select>
              </div>

              {/* Admin Rating */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Star style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.5rem' }} />
                  Admin Rating
                </label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, admin_rating: n }))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: form.admin_rating >= n ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                        color: form.admin_rating >= n ? '#000' : 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  <Tag style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.5rem' }} />
                  Genres
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {genres.map(genre => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        border: 'none',
                        backgroundColor: form.genre.includes(genre) ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                        color: form.genre.includes(genre) ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {form.genre.includes(genre) && <Check style={{ width: '14px', height: '14px' }} />}
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '2rem',
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'white' }}>Review & Submit</h2>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <img 
                src={form.poster_url} 
                alt="Poster" 
                style={{ width: '200px', borderRadius: '12px' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'https://via.placeholder.com/200x300?text=No+Image'
                }}
              />
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>{form.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', lineHeight: 1.6 }}>{form.description}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Director</span>
                    <p style={{ color: 'white' }}>{form.director || 'Not specified'}</p>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Actors</span>
                    <p style={{ color: 'white' }}>{form.actors || 'Not specified'}</p>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Duration</span>
                    <p style={{ color: 'white' }}>{form.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Language</span>
                    <p style={{ color: 'white' }}>{form.language}</p>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Release Year</span>
                    <p style={{ color: 'white' }}>{form.release_year}</p>
                  </div>
                  {form.admin_rating > 0 && (
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Admin Rating</span>
                      <p style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star style={{ width: '16px', height: '16px', fill: '#fbbf24' }} />
                        {form.admin_rating}/10
                      </p>
                    </div>
                  )}
                </div>
                
                {form.genre.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Genres</span>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {form.genre.map(g => (
                        <span key={g} style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: 'rgba(139, 92, 246, 0.2)',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          color: '#a78bfa',
                        }}>{g}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Back to Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                style={{
                  padding: '0.75rem 2rem',
                  background: isLoading ? 'rgba(34, 197, 94, 0.5)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Check style={{ width: '18px', height: '18px' }} />
                    Publish Movie
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}