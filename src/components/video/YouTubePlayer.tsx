// src/components/video/YouTubePlayer.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  Settings, Subtitles, PictureInPicture2, Gauge, Moon, Bell, BellOff,
  ChevronLeft, ChevronRight, Check, Expand, Shrink,
  RotateCcw, RotateCw, Captions, Sparkles,
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
    onYouTubeIframeAPIReady: (() => void) | undefined
    _ytApiCallbacks: (() => void)[]
    _ytApiLoading: boolean
  }
}

type SettingsMenu = 'main' | 'quality' | 'speed' | 'subtitles' | 'sleepTimer' | null

const qualityOptions = [
  { label: 'Auto',   value: 'auto',    badge: 'Recommended' },
  { label: '2160p',  value: 'hd2160',  badge: '4K' },
  { label: '1440p',  value: 'hd1440',  badge: '2K' },
  { label: '1080p',  value: 'hd1080',  badge: 'HD' },
  { label: '720p',   value: 'hd720',   badge: 'HD' },
  { label: '480p',   value: 'large' },
  { label: '360p',   value: 'medium' },
  { label: '240p',   value: 'small' },
  { label: '144p',   value: 'tiny' },
]

const speedOptions = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x',  value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: 'Normal',value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x',  value: 1.5 },
  { label: '1.75x', value: 1.75 },
  { label: '2x',    value: 2 },
]

const subtitleOptions = [
  { label: 'Off',          value: 'off' },
  { label: 'English',      value: 'en' },
  { label: 'Hindi',        value: 'hi' },
  { label: 'Bengali',      value: 'bn' },
  { label: 'Spanish',      value: 'es' },
  { label: 'French',       value: 'fr' },
  { label: 'Auto-translate', value: 'auto' },
]

const sleepTimerOptions = [
  { label: 'Off',          minutes: 0 },
  { label: '15 minutes',   minutes: 15 },
  { label: '30 minutes',   minutes: 30 },
  { label: '45 minutes',   minutes: 45 },
  { label: '1 hour',       minutes: 60 },
  { label: '1.5 hours',    minutes: 90 },
  { label: '2 hours',      minutes: 120 },
  { label: 'End of video', minutes: -1 },
]

/* ─────────────────────────────────────────────
   Singleton YT API loader — safe for multi-instance
   ───────────────────────────────────────────── */
function loadYTApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player)            return Promise.resolve()

  return new Promise((resolve) => {
    if (!window._ytApiCallbacks) window._ytApiCallbacks = []
    window._ytApiCallbacks.push(resolve)

    if (window._ytApiLoading) return
    window._ytApiLoading = true

    window.onYouTubeIframeAPIReady = () => {
      window._ytApiCallbacks.forEach(cb => cb())
      window._ytApiCallbacks = []
    }

    const tag    = document.createElement('script')
    tag.src      = 'https://www.youtube.com/iframe_api'
    tag.async    = true
    document.head.appendChild(tag)
  })
}

export function YouTubePlayer({
  videoId,
  title    = 'Video',
  onReady,
  onPlay,
  onPause,
  onEnded,
  autoPlay = false,
}: YouTubePlayerProps) {
  const playerRef      = useRef<any>(null)
  const containerRef   = useRef<HTMLDivElement>(null)
  const progressRef    = useRef<HTMLDivElement>(null)
  const playerId       = useRef(`ytp-${Math.random().toString(36).slice(2, 8)}`).current

  // Player state
  const [isReady,       setIsReady]       = useState(false)
  const [isPlaying,     setIsPlaying]     = useState(false)
  const [isMuted,       setIsMuted]       = useState(false)
  const [volume,        setVolume]        = useState(80)
  const [currentTime,   setCurrentTime]   = useState(0)
  const [duration,      setDuration]      = useState(0)
  const [buffered,      setBuffered]      = useState(0)
  const [isFullscreen,  setIsFullscreen]  = useState(false)
  const [isTheatre,     setIsTheatre]     = useState(false)
  const [showControls,  setShowControls]  = useState(true)
  const [isBuffering,   setIsBuffering]   = useState(false)
  const [showVolSlider, setShowVolSlider] = useState(false)
  const [hoverTime,     setHoverTime]     = useState<number | null>(null)
  const [hoverPos,      setHoverPos]      = useState(0)
  const [skipIndicator, setSkipIndicator] = useState<'forward' | 'backward' | null>(null)

  // Settings state
  const [settingsMenu,   setSettingsMenu]   = useState<SettingsMenu>(null)
  const [selQuality,     setSelQuality]     = useState('auto')
  const [selSpeed,       setSelSpeed]       = useState(1)
  const [selSubtitle,    setSelSubtitle]    = useState('off')
  const [stableVol,      setStableVol]      = useState(false)
  const [annotations,    setAnnotations]    = useState(true)
  const [sleepTimer,     setSleepTimer]     = useState(0)
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null)

  // Timer refs
  const ctrlTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const sleepIntRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const skipTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Init player ── */
  useEffect(() => {
    let cancelled = false

    loadYTApi().then(() => {
      if (cancelled) return

      // destroy previous instance if videoId changed
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch {}
        playerRef.current = null
        setIsReady(false)
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)
        setBuffered(0)
      }

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          autoplay:       autoPlay ? 1 : 0,
          controls:       0,
          disablekb:      1,
          enablejsapi:    1,
          fs:             0,
          iv_load_policy: annotations ? 1 : 3,
          modestbranding: 1,
          playsinline:    1,
          rel:            0,
          showinfo:       0,
          origin:         typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady:                (e: any) => { if (!cancelled) handlePlayerReady(e) },
          onStateChange:          (e: any) => { if (!cancelled) handleStateChange(e) },
          onPlaybackQualityChange: () => {},
        },
      })
    })

    return () => {
      cancelled = true
      cleanupTimers()
      try { playerRef.current?.destroy() } catch {}
      playerRef.current = null
    }
  }, [videoId])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isReady) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break
        case 'arrowleft': case 'j': e.preventDefault(); skipBackward(); break
        case 'arrowright': case 'l': e.preventDefault(); skipForward(); break
        case 'arrowup':   e.preventDefault(); adjustVolume(10); break
        case 'arrowdown': e.preventDefault(); adjustVolume(-10); break
        case 'm': e.preventDefault(); toggleMute(); break
        case 'f': e.preventDefault(); toggleFullscreen(); break
        case 't': e.preventDefault(); setIsTheatre(v => !v); break
        case 'c': e.preventDefault(); setSelSubtitle(v => v === 'off' ? 'en' : 'off'); break
        case 'escape':
          if (settingsMenu) setSettingsMenu(null)
          else if (isFullscreen) toggleFullscreen()
          break
        case '<': e.preventDefault(); changeSpeed(-1); break
        case '>': e.preventDefault(); changeSpeed(+1); break
        default:
          if (/^[0-9]$/.test(e.key)) {
            e.preventDefault()
            seekToPercent(parseInt(e.key) / 10)
          }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isReady, isPlaying, selSpeed, selSubtitle, isFullscreen, settingsMenu, isTheatre])

  /* ── Fullscreen listener ── */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  /* ── Sleep timer ── */
  useEffect(() => {
    if (sleepTimer > 0) {
      setSleepRemaining(sleepTimer * 60)
      sleepIntRef.current = setInterval(() => {
        setSleepRemaining(prev => {
          if (prev === null || prev <= 1) {
            if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
              playerRef.current.pauseVideo()
            }
            clearInterval(sleepIntRef.current!)
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setSleepRemaining(null)
      if (sleepIntRef.current) clearInterval(sleepIntRef.current)
    }
    return () => { if (sleepIntRef.current) clearInterval(sleepIntRef.current) }
  }, [sleepTimer])

  const cleanupTimers = () => {
    if (progressIntRef.current) clearInterval(progressIntRef.current)
    if (ctrlTimeoutRef.current)  clearTimeout(ctrlTimeoutRef.current)
    if (sleepIntRef.current)     clearInterval(sleepIntRef.current)
    if (skipTimeoutRef.current)  clearTimeout(skipTimeoutRef.current)
    if (volTimeoutRef.current)   clearTimeout(volTimeoutRef.current)
  }

  /* ── Player event handlers ── */
  const handlePlayerReady = (event: any) => {
    setIsReady(true)
    setDuration(event.target.getDuration() || 0)
    event.target.setVolume(volume)
    onReady?.()

    if (progressIntRef.current) clearInterval(progressIntRef.current)
    progressIntRef.current = setInterval(() => {
      const p = playerRef.current
      if (!p) return
      if (typeof p.getCurrentTime         === 'function') setCurrentTime(p.getCurrentTime())
      if (typeof p.getVideoLoadedFraction === 'function') setBuffered(p.getVideoLoadedFraction() * 100)
    }, 250)
  }

  const handleStateChange = (event: any) => {
    const S = window.YT?.PlayerState
    if (!S) return
    switch (event.data) {
      case S.PLAYING:   setIsPlaying(true);  setIsBuffering(false); onPlay?.(); break
      case S.PAUSED:    setIsPlaying(false); onPause?.(); break
      case S.BUFFERING: setIsBuffering(true); break
      case S.ENDED:
        setIsPlaying(false)
        onEnded?.()
        if (sleepTimer === -1) { setSleepTimer(0); setSleepRemaining(null) }
        break
    }
  }

  /* ── Controls ── */
  const safeCall = (method: string, ...args: any[]) => {
    const p = playerRef.current
    if (p && isReady && typeof p[method] === 'function') p[method](...args)
  }

  const togglePlay = () => {
    if (!isReady) return
    if (isPlaying) safeCall('pauseVideo')
    else           safeCall('playVideo')
  }

  const toggleMute = () => {
    if (!isReady) return
    if (isMuted) { safeCall('unMute'); safeCall('setVolume', volume || 50) }
    else         { safeCall('mute') }
    setIsMuted(v => !v)
  }

  const adjustVolume = (delta: number) => {
    const next = Math.max(0, Math.min(100, volume + delta))
    setVolume(next)
    safeCall('setVolume', next)
    if (next === 0) { setIsMuted(true) }
    else            { setIsMuted(false); safeCall('unMute') }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseInt(e.target.value)
    setVolume(next)
    safeCall('setVolume', next)
    if (next === 0) { setIsMuted(true) }
    else            { setIsMuted(false); safeCall('unMute') }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isReady || !duration || !progressRef.current) return
    const rect    = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percent * duration
    safeCall('seekTo', newTime, true)
    setCurrentTime(newTime)
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !progressRef.current) return
    const rect    = progressRef.current.getBoundingClientRect()
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoverTime(percent * duration)
    setHoverPos(e.clientX - rect.left)
  }

  const seekToPercent = (percent: number) => {
    if (!isReady || !duration) return
    const newTime = percent * duration
    safeCall('seekTo', newTime, true)
    setCurrentTime(newTime)
  }

  const skipBackward = () => {
    const t = Math.max(0, currentTime - 10)
    safeCall('seekTo', t, true); setCurrentTime(t)
    flashSkip('backward')
  }

  const skipForward = () => {
    const t = Math.min(duration, currentTime + 10)
    safeCall('seekTo', t, true); setCurrentTime(t)
    flashSkip('forward')
  }

  const flashSkip = (dir: 'forward' | 'backward') => {
    setSkipIndicator(dir)
    if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current)
    skipTimeoutRef.current = setTimeout(() => setSkipIndicator(null), 600)
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) await containerRef.current.requestFullscreen()
      else                             await document.exitFullscreen()
    } catch {}
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (ctrlTimeoutRef.current) clearTimeout(ctrlTimeoutRef.current)
    if (isPlaying && !settingsMenu) {
      ctrlTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }

  const applyQuality = (q: string) => {
    setSelQuality(q)
    if (q !== 'auto') safeCall('setPlaybackQuality', q)
    setSettingsMenu('main')
  }

  const applySpeed = (s: number) => {
    setSelSpeed(s)
    safeCall('setPlaybackRate', s)
    setSettingsMenu('main')
  }

  const changeSpeed = (dir: 1 | -1) => {
    const idx  = speedOptions.findIndex(o => o.value === selSpeed)
    const next = speedOptions[idx + dir]
    if (next) applySpeed(next.value)
  }

  /* ── Helpers ── */
  const fmtTime = (s: number) => {
    if (isNaN(s) || s < 0) return '0:00'
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = Math.floor(s % 60)
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${m}:${String(sec).padStart(2,'0')}`
  }

  const fmtSleep = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${sec}s`
    return `${sec}s`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const VolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={20} />
    if (volume < 50)             return <Volume1 size={20} />
    return <Volume2 size={20} />
  }

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <div
      ref={containerRef}
      className={`yt-player-wrap${isTheatre ? ' theatre' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden', cursor: showControls ? 'default' : 'none' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying && !settingsMenu) setShowControls(false)
        setShowVolSlider(false)
        setHoverTime(null)
      }}
    >
      {/* ── IFrame target ── */}
      <div
        id={playerId}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      />

      {/* ── Click / double-click overlay ── */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 5 }}
        onClick={e => {
          if ((e.target as HTMLElement).closest('.yt-controls-bar')) return
          if ((e.target as HTMLElement).closest('.yt-settings-panel')) return
          if (settingsMenu) { setSettingsMenu(null); return }
          togglePlay()
        }}
        onDoubleClick={e => {
          const rect  = containerRef.current?.getBoundingClientRect()
          if (!rect) return
          const x = e.clientX - rect.left
          if      (x < rect.width / 3)       skipBackward()
          else if (x > (2 * rect.width) / 3) skipForward()
          else                               toggleFullscreen()
        }}
      />

      {/* ── Loading / Buffering ── */}
      {(!isReady || isBuffering) && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid rgba(255,140,0,0.2)', borderTopColor: 'var(--brand-core,#FF6200)', animation: 'yt-spin 0.75s linear infinite', marginBottom: '0.75rem' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{isBuffering ? 'Buffering…' : 'Loading…'}</p>
        </div>
      )}

      {/* ── Center play button (when paused after load) ── */}
      {!isPlaying && isReady && !isBuffering && showControls && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-core,#FF6200), var(--brand-gold,#FFB733))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 60px rgba(255,98,0,0.5)', backdropFilter: 'blur(8px)' }}>
            <Play size={34} style={{ color: 'white', fill: 'white', marginLeft: 4 }} />
          </div>
        </div>
      )}

      {/* ── Skip indicators ── */}
      {skipIndicator && (
        <div style={{ position: 'absolute', top: '50%', left: skipIndicator === 'backward' ? '20%' : '80%', transform: 'translate(-50%,-50%)', zIndex: 25, animation: 'yt-fadeInOut 0.6s ease forwards' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {skipIndicator === 'backward' ? <RotateCcw size={26} style={{ color: 'white' }} /> : <RotateCw size={26} style={{ color: 'white' }} />}
            <span style={{ color: 'white', fontSize: '0.7rem' }}>10s</span>
          </div>
        </div>
      )}

      {/* ── Sleep timer badge ── */}
      {sleepRemaining !== null && sleepRemaining > 0 && (
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 30, padding: '0.45rem 0.9rem', background: 'var(--glass-bg,rgba(26,18,10,0.78))', backdropFilter: 'blur(12px)', borderRadius: 20, border: '1px solid var(--glass-border,rgba(255,140,0,0.16))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Moon size={15} style={{ color: 'var(--brand-gold,#FFB733)' }} />
          <span style={{ color: 'white', fontSize: '0.82rem' }}>{fmtSleep(sleepRemaining)}</span>
        </div>
      )}

      {/* ── Speed badge ── */}
      {selSpeed !== 1 && showControls && (
        <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 30, padding: '0.3rem 0.7rem', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: 14 }}>
          <span style={{ color: 'var(--brand-gold,#FFB733)', fontSize: '0.78rem', fontWeight: 700 }}>{selSpeed}x</span>
        </div>
      )}

      {/* ══════════════════════════════════════
          CONTROLS BAR
          ══════════════════════════════════════ */}
      <div
        className="yt-controls-bar"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 65%, transparent 100%)', padding: '2.5rem 1.25rem 0.85rem', opacity: showControls ? 1 : 0, transform: showControls ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.28s ease', pointerEvents: showControls ? 'auto' : 'none', zIndex: 20 }}
      >
        {/* ── Progress bar ── */}
        <div
          ref={progressRef}
          style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2, cursor: 'pointer', marginBottom: '0.85rem' }}
          onClick={handleSeek}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* buffered */}
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${buffered}%`, background: 'rgba(255,255,255,0.28)', borderRadius: 2 }} />
          {/* progress */}
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--brand-core,#FF6200), var(--brand-gold,#FFB733))', borderRadius: 2, transition: 'width 0.1s linear' }}>
            {/* scrubber dot */}
            <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, background: 'var(--brand-gold,#FFB733)', borderRadius: '50%', boxShadow: '0 0 8px rgba(255,140,0,0.7)' }} />
          </div>
          {/* hover preview */}
          {hoverTime !== null && (
            <div style={{ position: 'absolute', bottom: 18, left: hoverPos, transform: 'translateX(-50%)', padding: '0.3rem 0.65rem', background: 'rgba(0,0,0,0.88)', borderRadius: 6, fontSize: '0.78rem', color: 'white', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
              {fmtTime(hoverTime)}
            </div>
          )}
        </div>

        {/* ── Controls row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <button onClick={togglePlay}    style={CB} title={isPlaying ? 'Pause (K)' : 'Play (K)'}>
              {isPlaying ? <Pause size={21} /> : <Play size={21} />}
            </button>
            <button onClick={skipBackward}  style={CB} title="−10s (J)"><RotateCcw size={19} /></button>
            <button onClick={skipForward}   style={CB} title="+10s (L)"><RotateCw  size={19} /></button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center' }}
              onMouseEnter={() => { setShowVolSlider(true); if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current) }}
              onMouseLeave={() => { volTimeoutRef.current = setTimeout(() => setShowVolSlider(false), 500) }}
            >
              <button onClick={toggleMute} style={CB} title="Mute (M)"><VolumeIcon /></button>
              <div style={{ width: showVolSlider ? 78 : 0, overflow: 'hidden', transition: 'width 0.2s ease', marginLeft: showVolSlider ? 4 : 0 }}>
                <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={handleVolumeChange}
                  style={{ width: 78, height: 4, accentColor: 'var(--brand-core,#FF6200)', cursor: 'pointer', display: 'block' }} />
              </div>
            </div>

            {/* Time */}
            <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', marginLeft: 4, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {fmtTime(currentTime)} <span style={{ opacity: 0.45 }}>/</span> {fmtTime(duration)}
            </span>
          </div>

          {/* Center (fullscreen title) */}
          {isFullscreen && (
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', maxWidth: '38%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.95rem', fontWeight: 600, color: 'white' }}>
              {title}
            </div>
          )}

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
            {/* CC */}
            <button onClick={() => setSelSubtitle(v => v === 'off' ? 'en' : 'off')} style={{ ...CB, color: selSubtitle !== 'off' ? 'var(--brand-gold,#FFB733)' : 'white' }} title="Subtitles (C)">
              <Captions size={19} />
            </button>

            {/* Settings */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setSettingsMenu(v => v ? null : 'main')} style={{ ...CB, background: settingsMenu ? 'rgba(255,255,255,0.18)' : 'transparent' }} title="Settings">
                <Settings size={19} style={{ transition: 'transform 0.3s', transform: settingsMenu ? 'rotate(45deg)' : 'rotate(0)' }} />
              </button>

              {/* Settings panel */}
              {settingsMenu && (
                <div className="yt-settings-panel" style={{ position: 'absolute', bottom: 'calc(100% + 10px)', right: 0, width: 272, maxHeight: 420, overflowY: 'auto', background: 'rgba(14,11,7,0.97)', backdropFilter: 'blur(20px)', borderRadius: 12, border: '1px solid var(--glass-border,rgba(255,140,0,0.16))', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 100 }}>

                  {settingsMenu === 'main' && (
                    <div style={{ padding: '0.4rem 0' }}>
                      <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>Settings</div>
                      <SItem icon={<Sparkles size={17} style={{ color: 'var(--brand-mid,#FF8C00)' }} />} label="Quality"         value={qualityOptions.find(q => q.value === selQuality)?.label || 'Auto'} onClick={() => setSettingsMenu('quality')} />
                      <SItem icon={<Gauge     size={17} style={{ color: 'var(--brand-gold,#FFB733)' }} />} label="Speed"          value={selSpeed === 1 ? 'Normal' : `${selSpeed}x`}                          onClick={() => setSettingsMenu('speed')} />
                      <SItem icon={<Subtitles size={17} style={{ color: '#22c55e' }} />}                   label="Subtitles/CC"   value={subtitleOptions.find(s => s.value === selSubtitle)?.label || 'Off'}   onClick={() => setSettingsMenu('subtitles')} />
                      <SItem icon={<Moon      size={17} style={{ color: '#818cf8' }} />}                   label="Sleep timer"    value={sleepTimerOptions.find(s => s.minutes === sleepTimer)?.label || 'Off'} onClick={() => setSettingsMenu('sleepTimer')} />
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0.4rem 0' }} />
                      <SToggle icon={<Bell size={17} style={{ color: '#06b6d4' }} />} label="Annotations"   on={annotations} onChange={setAnnotations} />
                      <SToggle icon={<Volume2 size={17} style={{ color: 'var(--brand-core,#FF6200)' }} />} label="Stable volume" on={stableVol}    onChange={setStableVol} />
                    </div>
                  )}

                  {settingsMenu === 'quality' && (
                    <SubMenu title="Quality" onBack={() => setSettingsMenu('main')}>
                      {qualityOptions.map(o => (
                        <button key={o.value} onClick={() => applyQuality(o.value)} style={{ ...SI, background: selQuality === o.value ? 'rgba(255,98,0,0.15)' : 'transparent' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{o.label}</span>
                            {o.badge && <span style={{ padding: '1px 5px', fontSize: '0.62rem', fontWeight: 700, borderRadius: 4, background: o.badge === '4K' ? '#fbbf24' : o.badge === 'HD' ? '#22c55e' : 'var(--brand-core,#FF6200)', color: o.badge === '4K' ? '#000' : 'white' }}>{o.badge}</span>}
                          </div>
                          {selQuality === o.value && <Check size={16} style={{ color: 'var(--brand-gold,#FFB733)' }} />}
                        </button>
                      ))}
                    </SubMenu>
                  )}

                  {settingsMenu === 'speed' && (
                    <SubMenu title="Playback speed" onBack={() => setSettingsMenu('main')}>
                      {speedOptions.map(o => (
                        <button key={o.value} onClick={() => applySpeed(o.value)} style={{ ...SI, background: selSpeed === o.value ? 'rgba(255,98,0,0.15)' : 'transparent' }}>
                          <span>{o.label}</span>
                          {selSpeed === o.value && <Check size={16} style={{ color: 'var(--brand-gold,#FFB733)' }} />}
                        </button>
                      ))}
                    </SubMenu>
                  )}

                  {settingsMenu === 'subtitles' && (
                    <SubMenu title="Subtitles/CC" onBack={() => setSettingsMenu('main')}>
                      {subtitleOptions.map(o => (
                        <button key={o.value} onClick={() => { setSelSubtitle(o.value); setSettingsMenu('main') }} style={{ ...SI, background: selSubtitle === o.value ? 'rgba(255,98,0,0.15)' : 'transparent' }}>
                          <span>{o.label}</span>
                          {selSubtitle === o.value && <Check size={16} style={{ color: 'var(--brand-gold,#FFB733)' }} />}
                        </button>
                      ))}
                    </SubMenu>
                  )}

                  {settingsMenu === 'sleepTimer' && (
                    <SubMenu title="Sleep timer" onBack={() => setSettingsMenu('main')}>
                      {sleepTimerOptions.map(o => (
                        <button key={o.minutes} onClick={() => { setSleepTimer(o.minutes); setSettingsMenu('main') }} style={{ ...SI, background: sleepTimer === o.minutes ? 'rgba(255,98,0,0.15)' : 'transparent' }}>
                          <span>{o.label}</span>
                          {sleepTimer === o.minutes && <Check size={16} style={{ color: 'var(--brand-gold,#FFB733)' }} />}
                        </button>
                      ))}
                    </SubMenu>
                  )}
                </div>
              )}
            </div>

            {/* Theatre mode */}
            <button onClick={() => setIsTheatre(v => !v)} style={{ ...CB, color: isTheatre ? 'var(--brand-gold,#FFB733)' : 'white' }} title="Theatre (T)">
              {isTheatre ? <Shrink size={19} /> : <Expand size={19} />}
            </button>

            {/* PiP (graceful no-op) */}
            <button onClick={() => alert('Picture-in-Picture is not supported for embedded YouTube videos.')} style={CB} title="PiP">
              <PictureInPicture2 size={19} />
            </button>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} style={CB} title="Fullscreen (F)">
              {isFullscreen ? <Minimize size={21} /> : <Maximize size={21} />}
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes yt-spin       { to { transform: rotate(360deg); } }
        @keyframes yt-fadeInOut  {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.75); }
          40%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.15); }
        }
        .yt-player-wrap.theatre {
          width: 100vw !important;
          max-width: 100% !important;
          margin-left: calc(-50vw + 50%) !important;
        }
        .yt-controls-bar button:hover  { background: rgba(255,255,255,0.14) !important; transform: scale(1.08); }
        .yt-controls-bar button:active { transform: scale(0.93); }
        .yt-settings-panel::-webkit-scrollbar       { width: 5px; }
        .yt-settings-panel::-webkit-scrollbar-track  { background: transparent; }
        .yt-settings-panel::-webkit-scrollbar-thumb  { background: rgba(255,140,0,0.25); border-radius: 3px; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 11px; height: 11px;
          background: var(--brand-core,#FF6200);
          border-radius: 50%; cursor: pointer;
        }
        input[type=range]::-moz-range-thumb {
          width: 11px; height: 11px;
          background: var(--brand-core,#FF6200);
          border-radius: 50%; cursor: pointer; border: none;
        }
      `}</style>
    </div>
  )
}

/* ── Shared micro-components ── */
function SubMenu({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0.4rem 0' }}>
      <button onClick={onBack} style={{ ...SI, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.65rem', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronLeft size={17} /><span style={{ fontWeight: 700 }}>{title}</span>
        </div>
      </button>
      {children}
    </div>
  )
}

function SItem({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={SI}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>{icon}<span>{label}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>{value}</span>
        <ChevronRight size={14} style={{ opacity: 0.4 }} />
      </div>
    </button>
  )
}

function SToggle({ icon, label, on, onChange }: { icon: React.ReactNode; label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={SI}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>{icon}<span>{label}</span></div>
      <div style={{ width: 34, height: 18, borderRadius: 9, background: on ? 'var(--brand-core,#FF6200)' : 'rgba(255,255,255,0.18)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
      </div>
    </button>
  )
}

/* ── Shared styles ── */
const CB: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'white',
  cursor: 'pointer', padding: '0.45rem', borderRadius: 7,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s ease', flexShrink: 0,
}

const SI: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0.65rem 1rem', background: 'transparent', border: 'none',
  color: 'white', cursor: 'pointer', fontSize: '0.875rem', textAlign: 'left',
  transition: 'background 0.15s',
}