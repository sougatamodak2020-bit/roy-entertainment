// src/types/database.ts

export interface Movie {
  id: string
  created_at: string
  updated_at: string
  title: string
  slug: string
  description: string | null
  youtube_id: string | null
  youtube_url: string | null
  poster_url: string | null
  backdrop_url: string | null
  trailer_url: string | null
  video_url: string | null
  release_year: number
  duration_minutes: number
  language: string
  director: string | null
  actors: string[] | null
  genre: string[] | null
  rating: number
  admin_rating: number
  view_count: number
  is_featured: boolean
  is_trending: boolean
  is_published: boolean
  uploaded_by: string | null
  uploaded_by_type: 'admin' | 'creator' | null
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'creator' | 'user'
  preferences: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// For carousel and grid displays (lighter version)
export interface MovieCard {
  id: string
  slug: string
  title: string
  description: string | null
  poster_url: string | null
  release_year: number
  duration_minutes: number
  rating: number
  genre: string[] | null
  language: string
  is_featured: boolean
  is_trending: boolean
  view_count: number
}

// For forms
export interface MovieFormData {
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