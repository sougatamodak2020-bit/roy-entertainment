'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  ArrowLeft, Youtube, Upload, Sparkles, Loader2, Check, X,
  Film, User, Clock, Star, Tag, Globe
} from 'lucide-react'

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

export default function UploadPage() {
  const router = useRouter()
  const pathname = usePathname()
  const isAdmin = pathname.includes('/admin')
  
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  
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

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
    return match ? match[1] : null
  }

  const handleYouTubeExtract = async () => {
    const videoId = extractYouTubeId(youtubeUrl)
    if (!videoId) {
      alert('Invalid YouTube URL')
      return
    }

    setExtracting(true)
    
    // Simulate extraction (in production, call YouTube API)
    setTimeout(() => {
      setForm(prev => ({
        ...prev,
        youtube_url: youtubeUrl,
        poster_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        title: 'Extracted Movie Title',
        description: 'This description would be extracted from YouTube. Edit as needed.',
        duration_minutes: 120,
      }))
      setExtracting(false)
      setStep(2)
    }, 1500)
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
    if (!form.title || !form.youtube_url) {
      alert('Please fill in required fields')
      return
    }

    setIsLoading(true)
    
    // Simulate save
    setTimeout(() => {
      setIsLoading(false)
      alert('Movie uploaded successfully!')
      router.push(isAdmin ? '/admin' : '/creator')
    }, 2000)
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
          <Link href={isAdmin ? '/admin' : '/creator'}>
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
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Upload New Film</h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
              {isAdmin ? 'Admin Upload' : 'Creator Upload'}
            </p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Add YouTube Video</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
              Paste a YouTube URL to automatically extract video information
            </p>
            
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Movie Details</h2>
            
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
                <img src={form.poster_url} alt="Poster" style={{ width: '120px', height: '160px', borderRadius: '8px', objectFit: 'cover' }} />
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{form.title || 'Movie Title'}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    {form.description?.slice(0, 150)}...
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
                  value={form.duration_minutes}
                  onChange={(e) => setForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
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
                  value={form.release_year}
                  onChange={(e) => setForm(prev => ({ ...prev, release_year: parseInt(e.target.value) }))}
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

              {/* Admin Rating (only for admin) */}
              {isAdmin && (
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
              )}

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
                      }}
                    >
                      {form.genre.includes(genre) && <Check style={{ width: '14px', height: '14px', display: 'inline', marginRight: '0.25rem' }} />}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Review & Submit</h2>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
              <img src={form.poster_url} alt="Poster" style={{ width: '200px', borderRadius: '12px' }} />
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{form.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', lineHeight: 1.6 }}>{form.description}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Director</span>
                    <p>{form.director || 'Not specified'}</p>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Actors</span>
                    <p>{form.actors || 'Not specified'}</p>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Duration</span>
                    <p>{form.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Language</span>
                    <p>{form.language}</p>
                  </div>
                  {isAdmin && form.admin_rating > 0 && (
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Admin Rating</span>
                      <p style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Star style={{ width: '16px', height: '16px', fill: '#fbbf24' }} />
                        {form.admin_rating}/10
                      </p>
                    </div>
                  )}
                </div>
                
                <div style={{ marginTop: '1rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Genres</span>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
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
                  <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Check style={{ width: '18px', height: '18px' }} />
                )}
                {isLoading ? 'Publishing...' : 'Publish Movie'}
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}