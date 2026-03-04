// src/types/index.ts

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'user' | 'admin' | 'creator'
  created_at: string
  preferences?: UserPreferences
}

export interface UserPreferences {
  favorite_genres: string[]
  mood_profile: MoodProfile
  watch_time_preference: 'morning' | 'afternoon' | 'evening' | 'night'
}

export interface MoodProfile {
  adventurous: number
  romantic: number
  thrilling: number
  comedic: number
  dramatic: number
  mysterious: number
}

export interface Movie {
  id: string
  slug: string
  title: string
  description: string
  poster_url: string
  backdrop_url?: string
  trailer_url?: string
  video_url?: string
  youtube_id?: string
  youtube_url?: string
  release_year: number
  duration_minutes: number
  rating: number
  admin_rating?: number
  genre: string[]
  language: string
  director?: string
  is_featured: boolean
  is_trending: boolean
  is_published: boolean
  view_count: number
  uploaded_by?: string
  uploaded_by_type?: 'admin' | 'creator'
  created_at: string
  updated_at: string
  directors?: Director[]
  actors?: Actor[]
}

export interface Series {
  id: string
  slug: string
  title: string
  description: string
  poster_url: string
  backdrop_url?: string
  trailer_url?: string
  release_year: number
  rating: number
  genre: string[]
  language: string
  is_featured: boolean
  is_trending: boolean
  is_published: boolean
  total_seasons: number
  total_episodes: number
  status: 'ongoing' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  seasons?: Season[]
  directors?: Director[]
  actors?: Actor[]
}

export interface Season {
  id: string
  series_id: string
  season_number: number
  title: string
  description?: string
  poster_url?: string
  release_year: number
  episodes?: Episode[]
}

export interface Episode {
  id: string
  season_id: string
  episode_number: number
  title: string
  description?: string
  thumbnail_url?: string
  video_url?: string
  youtube_id?: string
  duration_minutes: number
  release_date: string
}

export interface Actor {
  id: string
  name: string
  bio?: string
  photo_url?: string
  birth_date?: string
  nationality?: string
}

export interface Director {
  id: string
  name: string
  bio?: string
  photo_url?: string
  birth_date?: string
  nationality?: string
}

export interface WatchProgress {
  id: string
  user_id: string
  movie_id?: string
  episode_id?: string
  progress_seconds: number
  duration_seconds: number
  completed: boolean
  last_watched: string
  movie?: Movie
  episode?: Episode
}

export interface Favorite {
  id: string
  user_id: string
  movie_id?: string
  series_id?: string
  created_at: string
  movie?: Movie
  series?: Series
}

export interface Rating {
  id: string
  user_id: string
  movie_id?: string
  series_id?: string
  rating: number
  review?: string
  created_at: string
}

export interface Recommendation {
  id: string
  user_id: string
  movie_id?: string
  series_id?: string
  score: number
  reason: string
  ai_generated: boolean
  mood_match?: string
  created_at: string
  movie?: Movie
  series?: Series
}

export interface AILog {
  id: string
  user_id: string
  type: 'chat' | 'search' | 'recommendation'
  query: string
  response: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface WatchParty {
  id: string
  host_id: string
  movie_id?: string
  episode_id?: string
  room_code: string
  is_active: boolean
  current_time: number
  participants: WatchPartyParticipant[]
  created_at: string
}

export interface WatchPartyParticipant {
  id: string
  party_id: string
  user_id: string
  avatar_position: { x: number; y: number; z: number }
  joined_at: string
  user?: User
}

export interface YouTubeMetadata {
  title: string
  description: string
  thumbnail_url: string
  duration_seconds: number
  channel_title: string
  view_count: number
  publish_date: string
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