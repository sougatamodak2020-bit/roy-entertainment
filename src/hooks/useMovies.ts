'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { Movie, Series } from '@/types'

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMovies()
  }, [])

  const fetchMovies = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setMovies(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch movies')
    } finally {
      setLoading(false)
    }
  }

  const getFeatured = () => movies.filter(m => m.is_featured)
  const getTrending = () => movies.filter(m => m.is_trending)
  const getByGenre = (genre: string) => movies.filter(m => m.genre.includes(genre))

  return { movies, loading, error, refetch: fetchMovies, getFeatured, getTrending, getByGenre }
}

export function useSeries() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSeries()
  }, [])

  const fetchSeries = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSeries(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch series')
    } finally {
      setLoading(false)
    }
  }

  return { series, loading, error, refetch: fetchSeries }
}

export function useMovie(slug: string) {
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (slug) fetchMovie()
  }, [slug])

  const fetchMovie = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (error) throw error
      setMovie(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Movie not found')
    } finally {
      setLoading(false)
    }
  }

  return { movie, loading, error }
}