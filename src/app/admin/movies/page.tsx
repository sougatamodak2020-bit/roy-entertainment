// src/app/admin/movies/page.tsx

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Film, Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye, EyeOff,
  Star, TrendingUp, Sparkles, ArrowLeft, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, Calendar, Globe, Loader2, RefreshCw,
  Download, Upload, BarChart3, Crown, Home, Settings, Users, Tv, LogOut,
  Menu, X, Check, AlertTriangle
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { Movie } from '@/types'

interface MovieWithStats extends Movie {
  selected?: boolean
}

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'Movies', href: '/admin/movies', icon: Film, active: true },
  { label: 'Series', href: '/admin/series', icon: Tv },
  { label: 'Upload', href: '/admin/upload', icon: Upload },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminMoviesPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // State
  const [movies, setMovies] = useState<MovieWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [filterFeatured, setFilterFeatured] = useState<'all' | 'featured' | 'trending'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'rating' | 'views'>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedMovies, setSelectedMovies] = useState<string[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const itemsPerPage = 10

  useEffect(() => {
    loadMovies()
  }, [searchQuery, filterStatus, filterFeatured, sortBy, currentPage])

  const loadMovies = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('movies')
        .select('*', { count: 'exact' })

      // Search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      // Status filter
      if (filterStatus === 'published') {
        query = query.eq('is_published', true)
      } else if (filterStatus === 'draft') {
        query = query.eq('is_published', false)
      }

      // Featured filter
      if (filterFeatured === 'featured') {
        query = query.eq('is_featured', true)
      } else if (filterFeatured === 'trending') {
        query = query.eq('is_trending', true)
      }

      // Sorting
      switch (sortBy) {
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'title':
          query = query.order('title', { ascending: true })
          break
        case 'rating':
          query = query.order('rating', { ascending: false })
          break
        case 'views':
          query = query.order('view_count', { ascending: false })
          break
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      setMovies(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error loading movies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublish = async (movie: Movie) => {
    setActionLoading(movie.id)
    try {
      const { error } = await supabase
        .from('movies')
        .update({ is_published: !movie.is_published })
        .eq('id', movie.id)

      if (error) throw error

      setMovies(prev => prev.map(m => 
        m.id === movie.id ? { ...m, is_published: !m.is_published } : m
      ))
    } catch (error) {
      console.error('Error toggling publish:', error)
      alert('Failed to update movie status')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleFeatured = async (movie: Movie) => {
    setActionLoading(movie.id)
    try {
      const { error } = await supabase
        .from('movies')
        .update({ is_featured: !movie.is_featured })
        .eq('id', movie.id)

      if (error) throw error

      setMovies(prev => prev.map(m => 
        m.id === movie.id ? { ...m, is_featured: !m.is_featured } : m
      ))
    } catch (error) {
      console.error('Error toggling featured:', error)
      alert('Failed to update movie')
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleTrending = async (movie: Movie) => {
    setActionLoading(movie.id)
    try {
      const { error } = await supabase
        .from('movies')
        .update({ is_trending: !movie.is_trending })
        .eq('id', movie.id)

      if (error) throw error

      setMovies(prev => prev.map(m => 
        m.id === movie.id ? { ...m, is_trending: !m.is_trending } : m
      ))
    } catch (error) {
      console.error('Error toggling trending:', error)
      alert('Failed to update movie')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteMovie = async () => {
    if (!movieToDelete) return

    setActionLoading(movieToDelete.id)
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', movieToDelete.id)

      if (error) throw error

      setMovies(prev => prev.filter(m => m.id !== movieToDelete.id))
      setTotalCount(prev => prev - 1)
      setShowDeleteModal(false)
      setMovieToDelete(null)
    } catch (error) {
      console.error('Error deleting movie:', error)
      alert('Failed to delete movie')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedMovies.length === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedMovies.length} movies?`)) return

    setActionLoading('bulk')
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .in('id', selectedMovies)

      if (error) throw error

      setMovies(prev => prev.filter(m => !selectedMovies.includes(m.id)))
      setTotalCount(prev => prev - selectedMovies.length)
      setSelectedMovies([])
    } catch (error) {
      console.error('Error bulk deleting:', error)
      alert('Failed to delete movies')
    } finally {
      setActionLoading(null)
    }
  }

  const handleBulkPublish = async (publish: boolean) => {
    if (selectedMovies.length === 0) return

    setActionLoading('bulk')
    try {
      const { error } = await supabase
        .from('movies')
        .update({ is_published: publish })
        .in('id', selectedMovies)

      if (error) throw error

      setMovies(prev => prev.map(m => 
        selectedMovies.includes(m.id) ? { ...m, is_published: publish } : m
      ))
      setSelectedMovies([])
    } catch (error) {
      console.error('Error bulk updating:', error)
      alert('Failed to update movies')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSelectAll = () => {
    if (selectedMovies.length === movies.length) {
      setSelectedMovies([])
    } else {
      setSelectedMovies(movies.map(m => m.id))
    }
  }

  const handleSelectMovie = (id: string) => {
    setSelectedMovies(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0a0b' }}>
      {/* Sidebar */}
      <aside style={{
        width: isSidebarOpen ? '260px' : '80px',
        backgroundColor: '#0f0f12',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Crown style={{ width: '20px', height: '20px', color: 'white' }} />
          </div>
          {isSidebarOpen && (
            <div>
              <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white' }}>ROY Admin</span>
              <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Management Panel</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
          {sidebarLinks.map((link) => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                marginBottom: '0.25rem',
                backgroundColor: link.active ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                border: link.active ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                color: link.active ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}>
                <link.icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                {isSidebarOpen && <span style={{ fontSize: '0.9rem' }}>{link.label}</span>}
              </div>
            </Link>
          ))}
        </nav>

        {/* Back to Site */}
        <div style={{ padding: '0.75rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
            }}>
              <Home style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              {isSidebarOpen && <span style={{ fontSize: '0.9rem' }}>Back to Site</span>}
            </div>
          </Link>
        </div>

        {/* Logout */}
        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarOpen ? 'flex-start' : 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '10px',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            <LogOut style={{ width: '18px', height: '18px' }} />
            {isSidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isSidebarOpen ? '260px' : '80px',
        transition: 'margin-left 0.3s ease',
      }}>
        {/* Header */}
        <header style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'rgba(10, 10, 11, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '1rem 2rem',
          zIndex: 30,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                {isSidebarOpen ? <X style={{ width: '20px', height: '20px' }} /> : <Menu style={{ width: '20px', height: '20px' }} />}
              </button>
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Movies</h1>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  Manage your movie collection
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={loadMovies}
                disabled={loading}
                style={{
                  padding: '0.6rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw style={{ 
                  width: '18px', 
                  height: '18px',
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                }} />
              </button>
              <Link href="/admin/upload">
                <button style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}>
                  <Plus style={{ width: '18px', height: '18px' }} />
                  Add Movie
                </button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}>
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Film style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Total Movies</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white' }}>{totalCount}</p>
            </div>
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <CheckCircle style={{ width: '20px', height: '20px', color: '#22c55e' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Published</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white' }}>
                {movies.filter(m => m.is_published).length}
              </p>
            </div>
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Sparkles style={{ width: '20px', height: '20px', color: '#f59e0b' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Featured</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white' }}>
                {movies.filter(m => m.is_featured).length}
              </p>
            </div>
            <div style={{
              padding: '1.25rem',
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <TrendingUp style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>Trending</span>
              </div>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'white' }}>
                {movies.filter(m => m.is_trending).length}
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                <Search style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: 'rgba(255,255,255,0.4)',
                }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search movies..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 40px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: showFilters ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: showFilters ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: showFilters ? '#a78bfa' : 'white',
                  cursor: 'pointer',
                }}
              >
                <Filter style={{ width: '18px', height: '18px' }} />
                Filters
              </button>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="newest" style={{ background: '#1a1a1d' }}>Newest First</option>
                <option value="oldest" style={{ background: '#1a1a1d' }}>Oldest First</option>
                <option value="title" style={{ background: '#1a1a1d' }}>Title A-Z</option>
                <option value="rating" style={{ background: '#1a1a1d' }}>Highest Rated</option>
                <option value="views" style={{ background: '#1a1a1d' }}>Most Viewed</option>
              </select>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                flexWrap: 'wrap',
              }}>
                {/* Status Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                    Status
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['all', 'published', 'draft'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          setFilterStatus(status)
                          setCurrentPage(1)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: filterStatus === status ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                          color: filterStatus === status ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          textTransform: 'capitalize',
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Featured Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                    Category
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['all', 'featured', 'trending'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setFilterFeatured(cat)
                          setCurrentPage(1)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: filterFeatured === cat ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                          color: filterFeatured === cat ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          textTransform: 'capitalize',
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedMovies.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.5rem',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              marginBottom: '1.5rem',
            }}>
              <span style={{ color: '#a78bfa', fontWeight: 500 }}>
                {selectedMovies.length} selected
              </span>
              <button
                onClick={() => handleBulkPublish(true)}
                disabled={actionLoading === 'bulk'}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: '#22c55e',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Publish All
              </button>
              <button
                onClick={() => handleBulkPublish(false)}
                disabled={actionLoading === 'bulk'}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  color: '#f59e0b',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Unpublish All
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading === 'bulk'}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Delete All
              </button>
              <button
                onClick={() => setSelectedMovies([])}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  marginLeft: 'auto',
                }}
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Movies Table */}
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 80px 1fr 100px 80px 100px 120px 100px',
              gap: '1rem',
              padding: '1rem 1.5rem',
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              alignItems: 'center',
            }}>
              <div>
                <input
                  type="checkbox"
                  checked={selectedMovies.length === movies.length && movies.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#8b5cf6' }}
                />
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>POSTER</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>TITLE</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>RATING</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>VIEWS</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>STATUS</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>BADGES</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>ACTIONS</div>
            </div>

            {/* Loading State */}
            {loading && (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 style={{
                  width: '40px',
                  height: '40px',
                  color: '#8b5cf6',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem',
                }} />
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading movies...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && movies.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Film style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.2)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>No movies found</p>
                <Link href="/admin/upload">
                  <button style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer',
                  }}>
                    Upload First Movie
                  </button>
                </Link>
              </div>
            )}

            {/* Table Rows */}
            {!loading && movies.map((movie) => (
              <div
                key={movie.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 80px 1fr 100px 80px 100px 120px 100px',
                  gap: '1rem',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  alignItems: 'center',
                  backgroundColor: selectedMovies.includes(movie.id) ? 'rgba(139, 92, 246, 0.05)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                {/* Checkbox */}
                <div>
                  <input
                    type="checkbox"
                    checked={selectedMovies.includes(movie.id)}
                    onChange={() => handleSelectMovie(movie.id)}
                    style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#8b5cf6' }}
                  />
                </div>

                {/* Poster */}
                <div style={{
                  width: '60px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                }}>
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={movie.title}
                      width={60}
                      height={80}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      unoptimized
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Film style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                  )}
                </div>

                {/* Title & Info */}
                <div>
                  <Link href={`/watch/${movie.slug}`} style={{ textDecoration: 'none' }}>
                    <h4 style={{ fontWeight: 600, color: 'white', marginBottom: '0.25rem', cursor: 'pointer' }}>
                      {movie.title}
                    </h4>
                  </Link>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                    <span>{movie.release_year}</span>
                    <span>{movie.duration_minutes}m</span>
                    <span>{movie.language}</span>
                  </div>
                </div>

                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star style={{ width: '14px', height: '14px', color: '#fbbf24', fill: '#fbbf24' }} />
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>{movie.rating}</span>
                </div>

                {/* Views */}
                <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {movie.view_count >= 1000 ? `${(movie.view_count / 1000).toFixed(1)}K` : movie.view_count}
                </div>

                {/* Status */}
                <div>
                  <button
                    onClick={() => handleTogglePublish(movie)}
                    disabled={actionLoading === movie.id}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '20px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      backgroundColor: movie.is_published ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: movie.is_published ? '#22c55e' : '#f59e0b',
                    }}
                  >
                    {movie.is_published ? 'Published' : 'Draft'}
                  </button>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    onClick={() => handleToggleFeatured(movie)}
                    disabled={actionLoading === movie.id}
                    title="Toggle Featured"
                    style={{
                      padding: '0.35rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: movie.is_featured ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                      color: movie.is_featured ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    <Sparkles style={{ width: '16px', height: '16px' }} />
                  </button>
                  <button
                    onClick={() => handleToggleTrending(movie)}
                    disabled={actionLoading === movie.id}
                    title="Toggle Trending"
                    style={{
                      padding: '0.35rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: movie.is_trending ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.05)',
                      color: movie.is_trending ? '#f87171' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    <TrendingUp style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/watch/${movie.slug}`}>
                    <button
                      title="View"
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                      }}
                    >
                      <Eye style={{ width: '16px', height: '16px' }} />
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      setMovieToDelete(movie)
                      setShowDeleteModal(true)
                    }}
                    title="Delete"
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      color: '#f87171',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 style={{ width: '16px', height: '16px' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '2rem',
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: currentPage === 1 ? 'rgba(255,255,255,0.3)' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <ChevronLeft style={{ width: '16px', height: '16px' }} />
                Previous
              </button>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: currentPage === pageNum ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)',
                        color: currentPage === pageNum ? '#a78bfa' : 'white',
                        cursor: 'pointer',
                        fontWeight: currentPage === pageNum ? 600 : 400,
                      }}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: currentPage === totalPages ? 'rgba(255,255,255,0.3)' : 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                Next
                <ChevronRight style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && movieToDelete && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '2rem',
        }}>
          <div style={{
            backgroundColor: '#1a1a1d',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <AlertTriangle style={{ width: '30px', height: '30px', color: '#ef4444' }} />
            </div>
            <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'white' }}>Delete Movie?</h3>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
              Are you sure you want to delete "{movieToDelete.title}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setMovieToDelete(null)
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMovie}
                disabled={actionLoading === movieToDelete.id}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#f87171',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                {actionLoading === movieToDelete.id ? (
                  <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    <Trash2 style={{ width: '18px', height: '18px' }} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}