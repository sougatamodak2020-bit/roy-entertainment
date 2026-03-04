import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Movie, Series, User, WatchProgress } from '@/types'

interface AppState {
  // User state
  user: User | null
  setUser: (user: User | null) => void
  
  // UI state
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Theme
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
  
  // Video player state
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  volume: number
  setVolume: (volume: number) => void
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  
  // Current content
  currentMovie: Movie | null
  setCurrentMovie: (movie: Movie | null) => void
  currentSeries: Series | null
  setCurrentSeries: (series: Series | null) => void
  
  // Watch progress
  watchProgress: WatchProgress[]
  setWatchProgress: (progress: WatchProgress[]) => void
  updateProgress: (progress: WatchProgress) => void
  
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchResults: (Movie | Series)[]
  setSearchResults: (results: (Movie | Series)[]) => void
  
  // AI Chat
  isChatOpen: boolean
  setChatOpen: (open: boolean) => void
  chatMessages: ChatMessage[]
  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void
  
  // Mood
  currentMood: string | null
  setCurrentMood: (mood: string | null) => void
  
  // Watch Party
  watchPartyRoom: string | null
  setWatchPartyRoom: (room: string | null) => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User state
      user: null,
      setUser: (user) => set({ user }),
      
      // UI state
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      
      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      
      // Video player state
      isPlaying: false,
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      volume: 0.8,
      setVolume: (volume) => set({ volume }),
      isMuted: false,
      setIsMuted: (muted) => set({ isMuted: muted }),
      
      // Current content
      currentMovie: null,
      setCurrentMovie: (movie) => set({ currentMovie: movie }),
      currentSeries: null,
      setCurrentSeries: (series) => set({ currentSeries: series }),
      
      // Watch progress
      watchProgress: [],
      setWatchProgress: (progress) => set({ watchProgress: progress }),
      updateProgress: (progress) =>
        set((state) => ({
          watchProgress: state.watchProgress.some((p) => p.id === progress.id)
            ? state.watchProgress.map((p) => (p.id === progress.id ? progress : p))
            : [...state.watchProgress, progress],
        })),
      
      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      searchResults: [],
      setSearchResults: (results) => set({ searchResults: results }),
      
      // AI Chat
      isChatOpen: false,
      setChatOpen: (open) => set({ isChatOpen: open }),
      chatMessages: [],
      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      clearChat: () => set({ chatMessages: [] }),
      
      // Mood
      currentMood: null,
      setCurrentMood: (mood) => set({ currentMood: mood }),
      
      // Watch Party
      watchPartyRoom: null,
      setWatchPartyRoom: (room) => set({ watchPartyRoom: room }),
    }),
    {
      name: 'roy-entertainment-store',
      partialize: (state) => ({
        theme: state.theme,
        volume: state.volume,
        isMuted: state.isMuted,
      }),
    }
  )
)
