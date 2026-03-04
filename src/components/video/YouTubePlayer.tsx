// src/components/video/YouTubePlayer.tsx

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize, 
  SkipBack, SkipForward, Loader2, Settings, Subtitles, 
  MonitorPlay, PictureInPicture2, Gauge, Moon, Bell, BellOff,
  ChevronLeft, ChevronRight, Check, X, Expand, Shrink,
  RotateCcw, RotateCw, Clock, Captions, Sparkles, Zap
} from 'lucide-react'

interface YouTubePlayerProps {
  videoId: string
  title?: string
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  autoPlay?: boolean
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

type SettingsMenu = 'main' | 'quality' | 'speed' | 'subtitles' | 'sleepTimer' | null

interface QualityOption {
  label: string
  value: string
  badge?: string
}

interface SpeedOption {
  label: string
  value: number
}

interface SubtitleOption {
  label: string
  value: string
  language?: string
}

interface SleepTimerOption {
  label: string
  minutes: number
}

const qualityOptions: QualityOption[] = [
  { label: 'Auto', value: 'auto', badge: 'Recommended' },
  { label: '2160p', value: 'hd2160', badge: '4K' },
  { label: '1440p', value: 'hd1440', badge: '2K' },
  { label: '1080p', value: 'hd1080', badge: 'HD' },
  { label: '720p', value: 'hd720', badge: 'HD' },
  { label: '480p', value: 'large' },
  { label: '360p', value: 'medium' },
  { label: '240p', value: 'small' },
  { label: '144p', value: 'tiny' },
]

const speedOptions: SpeedOption[] = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: 'Normal', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '1.75x', value: 1.75 },
  { label: '2x', value: 2 },
]

const subtitleOptions: SubtitleOption[] = [
  { label: 'Off', value: 'off' },
  { label: 'English', value: 'en', language: 'en' },
  { label: 'Hindi', value: 'hi', language: 'hi' },
  { label: 'Bengali', value: 'bn', language: 'bn' },
  { label: 'Spanish', value: 'es', language: 'es' },
  { label: 'French', value: 'fr', language: 'fr' },
  { label: 'Auto-translate', value: 'auto' },
]

const sleepTimerOptions: SleepTimerOption[] = [
  { label: 'Off', minutes: 0 },
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '45 minutes', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: 'End of video', minutes: -1 },
]

export function YouTubePlayer({ 
  videoId, 
  title = 'Video',
  onReady,
  onPlay,
  onPause,
  onEnded,
  autoPlay = false
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  
  // Player State
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(80)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTheatreMode, setIsTheatreMode] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isBuffering, setIsBuffering] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState(0)
  const [showSkipIndicator, setShowSkipIndicator] = useState<'forward' | 'backward' | null>(null)
  
  // Settings State
  const [settingsMenu, setSettingsMenu] = useState<SettingsMenu>(null)
  const [selectedQuality, setSelectedQuality] = useState('auto')
  const [selectedSpeed, setSelectedSpeed] = useState(1)
  const [selectedSubtitle, setSelectedSubtitle] = useState('off')
  const [stableVolume, setStableVolume] = useState(false)
  const [annotations, setAnnotations] = useState(true)
  const [sleepTimer, setSleepTimer] = useState(0)
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null)
  
  // Refs for timers
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const sleepTimerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const skipIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const volumeSliderTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      initPlayer()
      return
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    window.onYouTubeIframeAPIReady = () => {
      initPlayer()
    }

    return () => {
      cleanupTimers()
    }
  }, [videoId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isReady) return
      
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'arrowleft':
        case 'j':
          e.preventDefault()
          skipBackward()
          break
        case 'arrowright':
        case 'l':
          e.preventDefault()
          skipForward()
          break
        case 'arrowup':
          e.preventDefault()
          adjustVolume(10)
          break
        case 'arrowdown':
          e.preventDefault()
          adjustVolume(-10)
          break
        case 'm':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 't':
          e.preventDefault()
          setIsTheatreMode(!isTheatreMode)
          break
        case 'escape':
          if (settingsMenu) {
            setSettingsMenu(null)
          } else if (isFullscreen) {
            toggleFullscreen()
          }
          break
        case 'c':
          e.preventDefault()
          setSelectedSubtitle(selectedSubtitle === 'off' ? 'en' : 'off')
          break
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault()
          const percent = parseInt(e.key) / 10
          seekToPercent(percent)
          break
        case '<':
          e.preventDefault()
          decreaseSpeed()
          break
        case '>':
          e.preventDefault()
          increaseSpeed()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isReady, isPlaying, selectedSpeed, selectedSubtitle, isFullscreen, settingsMenu, isTheatreMode])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Sleep timer
  useEffect(() => {
    if (sleepTimer > 0) {
      setSleepTimerRemaining(sleepTimer * 60)
      
      sleepTimerIntervalRef.current = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev === null || prev <= 0) {
            if (playerRef.current) {
              playerRef.current.pauseVideo()
            }
            clearInterval(sleepTimerIntervalRef.current!)
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setSleepTimerRemaining(null)
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current)
      }
    }

    return () => {
      if (sleepTimerIntervalRef.current) {
        clearInterval(sleepTimerIntervalRef.current)
      }
    }
  }, [sleepTimer])

  const cleanupTimers = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    if (sleepTimerIntervalRef.current) clearInterval(sleepTimerIntervalRef.current)
    if (skipIndicatorTimeoutRef.current) clearTimeout(skipIndicatorTimeoutRef.current)
    if (volumeSliderTimeoutRef.current) clearTimeout(volumeSliderTimeoutRef.current)
  }

  const initPlayer = () => {
    if (playerRef.current) {
      playerRef.current.destroy()
    }

    playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
      videoId: videoId,
      playerVars: {
        autoplay: autoPlay ? 1 : 0,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        iv_load_policy: annotations ? 1 : 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        showinfo: 0,
        cc_load_policy: selectedSubtitle !== 'off' ? 1 : 0,
      },
      events: {
        onReady: handlePlayerReady,
        onStateChange: handleStateChange,
        onPlaybackQualityChange: handleQualityChange,
      },
    })
  }

  const handlePlayerReady = (event: any) => {
    setIsReady(true)
    setDuration(event.target.getDuration())
    event.target.setVolume(volume)
    onReady?.()

    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        setCurrentTime(playerRef.current.getCurrentTime())
        
        // Get buffered
        if (typeof playerRef.current.getVideoLoadedFraction === 'function') {
          setBuffered(playerRef.current.getVideoLoadedFraction() * 100)
        }
      }
    }, 250)
  }

  const handleStateChange = (event: any) => {
    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        setIsPlaying(true)
        setIsBuffering(false)
        onPlay?.()
        break
      case window.YT.PlayerState.PAUSED:
        setIsPlaying(false)
        onPause?.()
        break
      case window.YT.PlayerState.ENDED:
        setIsPlaying(false)
        onEnded?.()
        if (sleepTimer === -1) {
          setSleepTimerRemaining(null)
          setSleepTimer(0)
        }
        break
      case window.YT.PlayerState.BUFFERING:
        setIsBuffering(true)
        break
    }
  }

  const handleQualityChange = (event: any) => {
    console.log('Quality changed to:', event.data)
  }

  const togglePlay = () => {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pauseVideo()
    } else {
      playerRef.current.playVideo()
    }
  }

  const toggleMute = () => {
    if (!playerRef.current) return
    if (isMuted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(volume || 50)
    } else {
      playerRef.current.mute()
    }
    setIsMuted(!isMuted)
  }

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(100, volume + delta))
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume)
      if (newVolume === 0) {
        setIsMuted(true)
      } else {
        setIsMuted(false)
        playerRef.current.unMute()
      }
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume)
      if (newVolume === 0) {
        setIsMuted(true)
      } else {
        setIsMuted(false)
        playerRef.current.unMute()
      }
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration || !progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percent * duration
    playerRef.current.seekTo(newTime, true)
    setCurrentTime(newTime)
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !progressRef.current) return
    const rect = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverTime(percent * duration)
    setHoverPosition(e.clientX - rect.left)
  }

  const seekToPercent = (percent: number) => {
    if (!playerRef.current || !duration) return
    const newTime = percent * duration
    playerRef.current.seekTo(newTime, true)
    setCurrentTime(newTime)
  }

  const skipBackward = () => {
    if (!playerRef.current) return
    const newTime = Math.max(0, currentTime - 10)
    playerRef.current.seekTo(newTime, true)
    setCurrentTime(newTime)
    showSkipIndicatorFn('backward')
  }

  const skipForward = () => {
    if (!playerRef.current) return
    const newTime = Math.min(duration, currentTime + 10)
    playerRef.current.seekTo(newTime, true)
    setCurrentTime(newTime)
    showSkipIndicatorFn('forward')
  }

  const showSkipIndicatorFn = (direction: 'forward' | 'backward') => {
    setShowSkipIndicator(direction)
    if (skipIndicatorTimeoutRef.current) {
      clearTimeout(skipIndicatorTimeoutRef.current)
    }
    skipIndicatorTimeoutRef.current = setTimeout(() => {
      setShowSkipIndicator(null)
    }, 500)
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying && !settingsMenu) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const setQuality = (quality: string) => {
    setSelectedQuality(quality)
    if (playerRef.current && quality !== 'auto') {
      playerRef.current.setPlaybackQuality(quality)
    }
    setSettingsMenu('main')
  }

  const setSpeed = (speed: number) => {
    setSelectedSpeed(speed)
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(speed)
    }
    setSettingsMenu('main')
  }

  const decreaseSpeed = () => {
    const currentIndex = speedOptions.findIndex(s => s.value === selectedSpeed)
    if (currentIndex > 0) {
      setSpeed(speedOptions[currentIndex - 1].value)
    }
  }

  const increaseSpeed = () => {
    const currentIndex = speedOptions.findIndex(s => s.value === selectedSpeed)
    if (currentIndex < speedOptions.length - 1) {
      setSpeed(speedOptions[currentIndex + 1].value)
    }
  }

  const setSubtitle = (subtitle: string) => {
    setSelectedSubtitle(subtitle)
    // Note: YouTube IFrame API has limited CC control
    setSettingsMenu('main')
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatSleepTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) {
      return `${h}h ${m}m`
    }
    if (m > 0) {
      return `${m}m ${s}s`
    }
    return `${s}s`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={20} />
    if (volume < 50) return <Volume1 size={20} />
    return <Volume2 size={20} />
  }

  const getCurrentQualityLabel = () => {
    const option = qualityOptions.find(q => q.value === selectedQuality)
    return option?.label || 'Auto'
  }

  const getCurrentSpeedLabel = () => {
    if (selectedSpeed === 1) return 'Normal'
    return `${selectedSpeed}x`
  }

  return (
    <div
      ref={containerRef}
      className={`youtube-player-container ${isTheatreMode ? 'theatre-mode' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        cursor: showControls ? 'default' : 'none',
        overflow: 'hidden',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying && !settingsMenu) setShowControls(false)
        setShowVolumeSlider(false)
        setHoverTime(null)
      }}
      onClick={(e) => {
        // Close settings if clicking outside
        if (settingsMenu && !(e.target as HTMLElement).closest('.settings-panel')) {
          setSettingsMenu(null)
        }
      }}
    >
      {/* YouTube Player Container */}
      <div
        id={`youtube-player-${videoId}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          pointerEvents: isReady ? 'none' : 'auto',
        }}
      />

      {/* Click to Play/Pause Area */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.controls-bar')) return
          if ((e.target as HTMLElement).closest('.settings-panel')) return
          togglePlay()
        }}
        onDoubleClick={(e) => {
          const rect = containerRef.current?.getBoundingClientRect()
          if (!rect) return
          const clickX = e.clientX - rect.left
          const width = rect.width
          
          if (clickX < width / 3) {
            skipBackward()
          } else if (clickX > (2 * width) / 3) {
            skipForward()
          } else {
            toggleFullscreen()
          }
        }}
      />

      {/* Loading/Buffering Overlay */}
      {(!isReady || isBuffering) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 15,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="loading-spinner" style={{
              width: '60px',
              height: '60px',
              border: '4px solid rgba(139, 92, 246, 0.2)',
              borderTop: '4px solid #8b5cf6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }} />
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              {isBuffering ? 'Buffering...' : 'Loading...'}
            </p>
          </div>
        </div>
      )}

      {/* Skip Indicators */}
      {showSkipIndicator && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: showSkipIndicator === 'backward' ? '20%' : '80%',
            transform: 'translate(-50%, -50%)',
            zIndex: 25,
            animation: 'fadeInOut 0.5s ease',
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {showSkipIndicator === 'backward' ? (
              <RotateCcw size={28} style={{ color: 'white' }} />
            ) : (
              <RotateCw size={28} style={{ color: 'white' }} />
            )}
            <span style={{ color: 'white', fontSize: '0.75rem', marginTop: '4px' }}>10s</span>
          </div>
        </div>
      )}

      {/* Center Play Button (when paused) */}
      {!isPlaying && isReady && !isBuffering && showControls && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.9))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 60px rgba(139, 92, 246, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Play size={36} style={{ color: 'white', fill: 'white', marginLeft: '4px' }} />
          </div>
        </div>
      )}

      {/* Sleep Timer Indicator */}
      {sleepTimerRemaining !== null && sleepTimerRemaining > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 30,
          }}
        >
          <Moon size={16} style={{ color: '#a78bfa' }} />
          <span style={{ color: 'white', fontSize: '0.85rem' }}>
            {formatSleepTime(sleepTimerRemaining)}
          </span>
        </div>
      )}

      {/* Playback Speed Indicator */}
      {selectedSpeed !== 1 && showControls && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.35rem 0.75rem',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            zIndex: 30,
          }}
        >
          <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>
            {selectedSpeed}x
          </span>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className="controls-bar"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
          padding: '3rem 1.5rem 1rem',
          opacity: showControls ? 1 : 0,
          transform: showControls ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none',
          zIndex: 20,
        }}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          style={{
            position: 'relative',
            height: '5px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
          onClick={handleSeek}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Buffered */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${buffered}%`,
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: '3px',
            }}
          />
          
          {/* Progress */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
              borderRadius: '3px',
              transition: 'width 0.1s linear',
            }}
          >
            {/* Scrubber */}
            <div
              style={{
                position: 'absolute',
                right: '-7px',
                top: '50%',
                transform: 'translateY(-50%) scale(1)',
                width: '14px',
                height: '14px',
                backgroundColor: '#a78bfa',
                borderRadius: '50%',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.8)',
                transition: 'transform 0.1s',
              }}
            />
          </div>

          {/* Hover Time Preview */}
          {hoverTime !== null && (
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: hoverPosition,
                transform: 'translateX(-50%)',
                padding: '0.35rem 0.75rem',
                background: 'rgba(0,0,0,0.9)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: 'white',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="control-btn"
              title={isPlaying ? 'Pause (K)' : 'Play (K)'}
              style={controlBtnStyle}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} />}
            </button>

            {/* Skip Backward */}
            <button
              onClick={skipBackward}
              className="control-btn"
              title="Rewind 10 seconds (J)"
              style={controlBtnStyle}
            >
              <RotateCcw size={20} />
            </button>

            {/* Skip Forward */}
            <button
              onClick={skipForward}
              className="control-btn"
              title="Forward 10 seconds (L)"
              style={controlBtnStyle}
            >
              <RotateCw size={20} />
            </button>

            {/* Volume */}
            <div
              style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
              onMouseEnter={() => {
                setShowVolumeSlider(true)
                if (volumeSliderTimeoutRef.current) {
                  clearTimeout(volumeSliderTimeoutRef.current)
                }
              }}
              onMouseLeave={() => {
                volumeSliderTimeoutRef.current = setTimeout(() => {
                  setShowVolumeSlider(false)
                }, 500)
              }}
            >
              <button
                onClick={toggleMute}
                className="control-btn"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                style={controlBtnStyle}
              >
                {getVolumeIcon()}
              </button>
              
              <div
                style={{
                  width: showVolumeSlider ? '80px' : '0px',
                  overflow: 'hidden',
                  transition: 'width 0.2s ease',
                  marginLeft: '0.25rem',
                }}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{
                    width: '80px',
                    height: '4px',
                    accentColor: '#8b5cf6',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* Time Display */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: '0.85rem', 
              color: 'rgba(255,255,255,0.9)',
              marginLeft: '0.5rem',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <span>{formatTime(currentTime)}</span>
              <span style={{ margin: '0 0.35rem', opacity: 0.5 }}>/</span>
              <span style={{ opacity: 0.7 }}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Center - Title (only in fullscreen) */}
          {isFullscreen && (
            <div style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '40%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'white',
            }}>
              {title}
            </div>
          )}

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {/* Subtitles/CC */}
            <button
              onClick={() => setSelectedSubtitle(selectedSubtitle === 'off' ? 'en' : 'off')}
              className="control-btn"
              title="Subtitles (C)"
              style={{
                ...controlBtnStyle,
                color: selectedSubtitle !== 'off' ? '#fbbf24' : 'white',
              }}
            >
              <Captions size={20} />
            </button>

            {/* Settings */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSettingsMenu(settingsMenu ? null : 'main')}
                className="control-btn"
                title="Settings"
                style={{
                  ...controlBtnStyle,
                  backgroundColor: settingsMenu ? 'rgba(255,255,255,0.2)' : 'transparent',
                }}
              >
                <Settings 
                  size={20} 
                  style={{ 
                    transition: 'transform 0.3s',
                    transform: settingsMenu ? 'rotate(45deg)' : 'rotate(0deg)',
                  }} 
                />
              </button>

              {/* Settings Panel */}
              {settingsMenu && (
                <div
                  className="settings-panel"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    right: 0,
                    marginBottom: '10px',
                    width: '280px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'rgba(20, 20, 25, 0.98)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    zIndex: 100,
                  }}
                >
                  {/* Main Menu */}
                  {settingsMenu === 'main' && (
                    <div style={{ padding: '0.5rem 0' }}>
                      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>Settings</span>
                      </div>
                      
                      {/* Quality */}
                      <button
                        onClick={() => setSettingsMenu('quality')}
                        style={settingsItemStyle}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Sparkles size={18} style={{ color: '#a78bfa' }} />
                          <span>Quality</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            {getCurrentQualityLabel()}
                          </span>
                          <ChevronRight size={16} style={{ opacity: 0.5 }} />
                        </div>
                      </button>

                      {/* Playback Speed */}
                      <button
                        onClick={() => setSettingsMenu('speed')}
                        style={settingsItemStyle}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Gauge size={18} style={{ color: '#fbbf24' }} />
                          <span>Playback speed</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            {getCurrentSpeedLabel()}
                          </span>
                          <ChevronRight size={16} style={{ opacity: 0.5 }} />
                        </div>
                      </button>

                      {/* Subtitles */}
                      <button
                        onClick={() => setSettingsMenu('subtitles')}
                        style={settingsItemStyle}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Subtitles size={18} style={{ color: '#22c55e' }} />
                          <span>Subtitles/CC</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            {subtitleOptions.find(s => s.value === selectedSubtitle)?.label || 'Off'}
                          </span>
                          <ChevronRight size={16} style={{ opacity: 0.5 }} />
                        </div>
                      </button>

                      {/* Sleep Timer */}
                      <button
                        onClick={() => setSettingsMenu('sleepTimer')}
                        style={settingsItemStyle}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Moon size={18} style={{ color: '#818cf8' }} />
                          <span>Sleep timer</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                            {sleepTimerOptions.find(s => s.minutes === sleepTimer)?.label || 'Off'}
                          </span>
                          <ChevronRight size={16} style={{ opacity: 0.5 }} />
                        </div>
                      </button>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />

                      {/* Stable Volume */}
                      <button
                        onClick={() => setStableVolume(!stableVolume)}
                        style={settingsItemStyle}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Volume2 size={18} style={{ color: '#f97316' }} />
                          <span>Stable volume</span>
                        </div>
                        <div style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          backgroundColor: stableVolume ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: stableVolume ? '18px' : '2px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            transition: 'left 0.2s',
                          }} />
                        </div>
                      </button>

                      {/* Annotations */}
                      <button
                        onClick={() => setAnnotations(!annotations)}
                        style={settingsItemStyle}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {annotations ? (
                            <Bell size={18} style={{ color: '#06b6d4' }} />
                          ) : (
                            <BellOff size={18} style={{ color: '#ef4444' }} />
                          )}
                          <span>Annotations</span>
                        </div>
                        <div style={{
                          width: '36px',
                          height: '20px',
                          borderRadius: '10px',
                          backgroundColor: annotations ? '#8b5cf6' : 'rgba(255,255,255,0.2)',
                          position: 'relative',
                          transition: 'background 0.2s',
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: annotations ? '18px' : '2px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            transition: 'left 0.2s',
                          }} />
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Quality Menu */}
                  {settingsMenu === 'quality' && (
                    <div style={{ padding: '0.5rem 0' }}>
                      <button
                        onClick={() => setSettingsMenu('main')}
                        style={{
                          ...settingsItemStyle,
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          paddingBottom: '0.75rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ChevronLeft size={18} />
                          <span style={{ fontWeight: 600 }}>Quality</span>
                        </div>
                      </button>
                      {qualityOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setQuality(option.value)}
                          style={{
                            ...settingsItemStyle,
                            backgroundColor: selectedQuality === option.value ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{option.label}</span>
                            {option.badge && (
                              <span style={{
                                padding: '0.15rem 0.4rem',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                backgroundColor: option.badge === '4K' ? '#fbbf24' : option.badge === 'HD' ? '#22c55e' : '#8b5cf6',
                                color: option.badge === '4K' ? '#000' : 'white',
                                borderRadius: '4px',
                              }}>
                                {option.badge}
                              </span>
                            )}
                          </div>
                          {selectedQuality === option.value && (
                            <Check size={18} style={{ color: '#8b5cf6' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Speed Menu */}
                  {settingsMenu === 'speed' && (
                    <div style={{ padding: '0.5rem 0' }}>
                      <button
                        onClick={() => setSettingsMenu('main')}
                        style={{
                          ...settingsItemStyle,
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          paddingBottom: '0.75rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ChevronLeft size={18} />
                          <span style={{ fontWeight: 600 }}>Playback speed</span>
                        </div>
                      </button>
                      {speedOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSpeed(option.value)}
                          style={{
                            ...settingsItemStyle,
                            backgroundColor: selectedSpeed === option.value ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                          }}
                        >
                          <span>{option.label}</span>
                          {selectedSpeed === option.value && (
                            <Check size={18} style={{ color: '#8b5cf6' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Subtitles Menu */}
                  {settingsMenu === 'subtitles' && (
                    <div style={{ padding: '0.5rem 0' }}>
                      <button
                        onClick={() => setSettingsMenu('main')}
                        style={{
                          ...settingsItemStyle,
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          paddingBottom: '0.75rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ChevronLeft size={18} />
                          <span style={{ fontWeight: 600 }}>Subtitles/CC</span>
                        </div>
                      </button>
                      {subtitleOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSubtitle(option.value)}
                          style={{
                            ...settingsItemStyle,
                            backgroundColor: selectedSubtitle === option.value ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                          }}
                        >
                          <span>{option.label}</span>
                          {selectedSubtitle === option.value && (
                            <Check size={18} style={{ color: '#8b5cf6' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sleep Timer Menu */}
                  {settingsMenu === 'sleepTimer' && (
                    <div style={{ padding: '0.5rem 0' }}>
                      <button
                        onClick={() => setSettingsMenu('main')}
                        style={{
                          ...settingsItemStyle,
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          paddingBottom: '0.75rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ChevronLeft size={18} />
                          <span style={{ fontWeight: 600 }}>Sleep timer</span>
                        </div>
                      </button>
                      {sleepTimerOptions.map((option) => (
                        <button
                          key={option.minutes}
                          onClick={() => {
                            setSleepTimer(option.minutes)
                            setSettingsMenu('main')
                          }}
                          style={{
                            ...settingsItemStyle,
                            backgroundColor: sleepTimer === option.minutes ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                          }}
                        >
                          <span>{option.label}</span>
                          {sleepTimer === option.minutes && (
                            <Check size={18} style={{ color: '#8b5cf6' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theatre Mode */}
            <button
              onClick={() => setIsTheatreMode(!isTheatreMode)}
              className="control-btn"
              title="Theatre mode (T)"
              style={{
                ...controlBtnStyle,
                color: isTheatreMode ? '#fbbf24' : 'white',
              }}
            >
              {isTheatreMode ? <Shrink size={20} /> : <Expand size={20} />}
            </button>

            {/* PiP */}
            <button
              onClick={async () => {
                try {
                  const iframe = document.querySelector(`#youtube-player-${videoId}`) as HTMLIFrameElement
                  if (iframe && document.pictureInPictureEnabled) {
                    // PiP is complex with iframes, showing a message instead
                    alert('Picture-in-Picture is not supported for embedded videos')
                  }
                } catch (err) {
                  console.error('PiP error:', err)
                }
              }}
              className="control-btn"
              title="Picture-in-Picture"
              style={controlBtnStyle}
            >
              <PictureInPicture2 size={20} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="control-btn"
              title="Fullscreen (F)"
              style={controlBtnStyle}
            >
              {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help (hidden by default) */}
      <div id="keyboard-shortcuts" style={{ display: 'none' }}>
        <p>Space/K: Play/Pause</p>
        <p>J/←: Rewind 10s</p>
        <p>L/→: Forward 10s</p>
        <p>↑/↓: Volume</p>
        <p>M: Mute</p>
        <p>F: Fullscreen</p>
        <p>T: Theatre mode</p>
        <p>C: Subtitles</p>
        <p>&lt;/&gt;: Speed</p>
        <p>0-9: Seek to %</p>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
        }
        .youtube-player-container.theatre-mode {
          max-width: 100% !important;
          width: 100vw !important;
          margin-left: calc(-50vw + 50%) !important;
        }
        .control-btn:hover {
          background-color: rgba(255,255,255,0.15) !important;
          transform: scale(1.1);
        }
        .control-btn:active {
          transform: scale(0.95);
        }
        .settings-panel::-webkit-scrollbar {
          width: 6px;
        }
        .settings-panel::-webkit-scrollbar-track {
          background: transparent;
        }
        .settings-panel::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        .settings-panel::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #8b5cf6;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}

// Styles
const controlBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  padding: '0.5rem',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
}

const settingsItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.75rem 1rem',
  background: 'transparent',
  border: 'none',
  color: 'white',
  cursor: 'pointer',
  fontSize: '0.9rem',
  textAlign: 'left',
  transition: 'background 0.15s',
}