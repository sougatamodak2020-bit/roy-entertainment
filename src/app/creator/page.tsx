'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Film, Upload, Eye, Star, TrendingUp, Plus, Clock, CheckCircle,
  XCircle, AlertCircle, LogOut, Crown, User
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreatorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const myMovies = [
    { id: '1', title: 'My First Film', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=100', views: 1250, rating: 7.5, status: 'published' },
    { id: '2', title: 'Short Documentary', poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100', views: 890, rating: 8.2, status: 'pending' },
    { id: '3', title: 'Upcoming Project', poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=100', views: 0, rating: 0, status: 'draft' },
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'rgba(15, 15, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Crown style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
          </Link>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Creator Studio</h1>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Manage your content</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/creator/upload">
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 500,
              cursor: 'pointer',
            }}>
              <Upload style={{ width: '18px', height: '18px' }} />
              Upload Film
            </button>
          </Link>
          <button onClick={handleLogout} style={{
            padding: '0.6rem',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '10px',
            color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
          }}>
            <LogOut style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {/* Welcome Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(245, 158, 11, 0.1))',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Welcome back, {user?.email?.split('@')[0] || 'Creator'}! 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            Ready to share your next masterpiece with the world?
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Films', value: '3', icon: Film, color: '#8b5cf6' },
            { label: 'Total Views', value: '2.1K', icon: Eye, color: '#22c55e' },
            { label: 'Avg Rating', value: '7.9', icon: Star, color: '#fbbf24' },
            { label: 'This Month', value: '+15%', icon: TrendingUp, color: '#00d4ff' },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '1.5rem',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: `${stat.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                <stat.icon style={{ width: '20px', height: '20px', color: stat.color }} />
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>{stat.value}</p>
              <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* My Films */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '16px',
          padding: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>My Films</h3>
            <Link href="/creator/upload" style={{ color: '#8b5cf6', fontSize: '0.9rem', textDecoration: 'none' }}>
              + Add New
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myMovies.map((movie) => (
              <div key={movie.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
              }}>
                <div style={{ width: '80px', height: '100px', borderRadius: '8px', overflow: 'hidden' }}>
                  <Image src={movie.poster} alt={movie.title} width={80} height={100} style={{ objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{movie.title}</h4>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Eye style={{ width: '14px', height: '14px' }} /> {movie.views}
                    </span>
                    {movie.rating > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fbbf24' }}>
                        <Star style={{ width: '14px', height: '14px', fill: '#fbbf24' }} /> {movie.rating}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  backgroundColor: movie.status === 'published' ? 'rgba(34,197,94,0.1)' : movie.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',
                  color: movie.status === 'published' ? '#22c55e' : movie.status === 'pending' ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                }}>
                  {movie.status === 'published' && <CheckCircle style={{ width: '14px', height: '14px' }} />}
                  {movie.status === 'pending' && <Clock style={{ width: '14px', height: '14px' }} />}
                  {movie.status === 'draft' && <AlertCircle style={{ width: '14px', height: '14px' }} />}
                  {movie.status.charAt(0).toUpperCase() + movie.status.slice(1)}
                </span>
                <button style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: '8px',
                  color: '#a78bfa',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}