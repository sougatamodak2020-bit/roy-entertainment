// src/app/admin/settings/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Settings, Save, RefreshCw, Shield, Bell, Palette, Database, Globe,
  Users, Film, Tv, Upload, BarChart3, TrendingUp, Home, LogOut,
  Menu, X, CheckCircle, XCircle, Loader2, Eye, EyeOff, Key,
  ToggleLeft, ToggleRight, Server, Mail, Lock, Sliders,
  AlertTriangle, Info, ChevronRight, Zap,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

/* ── Types ── */
interface SiteSettings {
  id?: string
  site_name: string
  site_tagline: string
  site_description: string
  contact_email: string
  allow_uploads: boolean
  require_approval: boolean
  max_upload_size_mb: number
  allowed_video_types: string[]
  featured_count: number
  trending_count: number
  maintenance_mode: boolean
  registration_open: boolean
  default_language: string
  tmdb_api_key: string
  youtube_api_key: string
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_pass: string
  primary_color: string
  accent_color: string
  updated_at?: string
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'Roy Entertainment',
  site_tagline: 'Stream. Watch. Enjoy.',
  site_description: 'Your ultimate streaming platform for movies and series.',
  contact_email: '',
  allow_uploads: true,
  require_approval: true,
  max_upload_size_mb: 500,
  allowed_video_types: ['mp4', 'mkv', 'avi', 'mov'],
  featured_count: 10,
  trending_count: 10,
  maintenance_mode: false,
  registration_open: true,
  default_language: 'English',
  tmdb_api_key: '',
  youtube_api_key: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  primary_color: '#FF6200',
  accent_color: '#FFB733',
}

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin',          icon: BarChart3  },
  { label: 'Movies',    href: '/admin/movies',    icon: Film       },
  { label: 'Series',    href: '/admin/series',    icon: Tv         },
  { label: 'Upload',    href: '/admin/upload',    icon: Upload     },
  { label: 'Users',     href: '/admin/users',     icon: Users      },
  { label: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings,  active: true },
]

const TABS = [
  { id: 'general',      label: 'General',      icon: Globe    },
  { id: 'content',      label: 'Content',      icon: Film     },
  { id: 'users',        label: 'Users & Auth',  icon: Users    },
  { id: 'integrations', label: 'Integrations', icon: Zap      },
  { id: 'email',        label: 'Email / SMTP', icon: Mail     },
  { id: 'appearance',   label: 'Appearance',   icon: Palette  },
  { id: 'danger',       label: 'Danger Zone',  icon: AlertTriangle },
]

export default function AdminSettingsPage() {
  const router   = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [activeTab,    setActiveTab]    = useState('general')
  const [settings,     setSettings]    = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [original,     setOriginal]    = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading,      setLoading]     = useState(true)
  const [saving,       setSaving]      = useState(false)
  const [saved,        setSaved]       = useState(false)
  const [liveIndicator,setLive]        = useState(false)
  const [toast,        setToast]       = useState<{msg:string;type:'ok'|'err'}|null>(null)
  const [showPass,     setShowPass]    = useState<Record<string,boolean>>({})
  const [profile,      setProfile]     = useState<any>(null)
  const [user,         setUser]        = useState<any>(null)

  const channelRef = useRef<any>(null)
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original)

  useEffect(() => {
    init()
    return () => { channelRef.current?.unsubscribe() }
  }, [])

  const showToast = (msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const init = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    setUser(authUser)
    const { data: p } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
    if (!p || p.role !== 'admin') { router.push('/'); return }
    setProfile(p)
    await loadSettings()
    setupRealtime()
  }

  const setupRealtime = () => {
    channelRef.current = supabase
      .channel('settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, payload => {
        setLive(true)
        setTimeout(() => setLive(false), 2000)
        if (payload.new) {
          const newSettings = payload.new as SiteSettings
          setSettings(prev => ({ ...prev, ...newSettings }))
          setOriginal(prev => ({ ...prev, ...newSettings }))
        }
      })
      .subscribe()
  }

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('site_settings').select('*').single()
      if (data && !error) {
        const merged = { ...DEFAULT_SETTINGS, ...data }
        setSettings(merged)
        setOriginal(merged)
      }
    } catch (err) {
      // table might not exist yet — use defaults
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const payload = { ...settings, updated_at: new Date().toISOString() }
      const { data: existing } = await supabase.from('site_settings').select('id').single()
      let error
      if (existing?.id) {
        ({ error } = await supabase.from('site_settings').update(payload).eq('id', existing.id))
      } else {
        ({ error } = await supabase.from('site_settings').insert(payload))
      }
      if (error) throw error
      setOriginal(settings)
      setSaved(true)
      showToast('Settings saved successfully!')
      setTimeout(() => setSaved(false), 2000)
    } catch (err: any) {
      showToast('Failed to save: ' + (err.message || err), 'err')
    } finally {
      setSaving(false)
    }
  }

  const set = (patch: Partial<SiteSettings>) => setSettings(prev => ({ ...prev, ...patch }))

  const togglePass = (key: string) => setShowPass(prev => ({ ...prev, [key]: !prev[key] }))

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'var(--bg-void)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Loader2 style={{ width:36, height:36, color:'#FF6200', animation:'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-void)', color:'var(--text-primary)' }}>

      {/* ══ SIDEBAR ══ */}
      <aside style={{ width: sidebarOpen ? 260 : 76, flexShrink:0, background:'rgba(8,8,14,0.98)', borderRight:'1px solid rgba(255,98,0,0.1)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:40, transition:'width 0.3s ease', overflow:'hidden' }}>
        <div style={{ padding:'1.35rem', borderBottom:'1px solid rgba(255,98,0,0.1)', display:'flex', alignItems:'center', gap:'0.75rem', flexShrink:0 }}>
          <div style={{ width:40, height:40, borderRadius:10, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,98,0,0.3)' }}>
            <Image src="/images/logo.jpg" alt="RE" width={40} height={40} style={{ objectFit:'cover', width:'100%', height:'100%' }} />
          </div>
          {sidebarOpen && (
            <div>
              <p style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1rem', letterSpacing:'0.08em', lineHeight:1 }}>
                <span className="gradient-text">ROY</span>
                <span style={{ color:'rgba(255,255,255,0.4)', marginLeft:4, fontSize:'0.7rem', fontFamily:'Outfit,sans-serif' }}>Admin</span>
              </p>
              <p style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.28)', lineHeight:1 }}>Management Panel</p>
            </div>
          )}
        </div>
        <nav style={{ flex:1, padding:'0.75rem', overflowY:'auto' }}>
          {sidebarLinks.map(({ label, href, icon: Icon, active }) => (
            <Link key={href} href={href} style={{ textDecoration:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.72rem 0.9rem', borderRadius:10, marginBottom:'0.2rem', background: active ? 'rgba(255,98,0,0.14)' : 'transparent', border:`1px solid ${active ? 'rgba(255,140,0,0.3)' : 'transparent'}`, color: active ? '#FFB733' : 'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'0.88rem', fontWeight:600, transition:'all 0.18s' }}>
                <Icon style={{ width:18, height:18, flexShrink:0 }} />
                {sidebarOpen && <span>{label}</span>}
              </div>
            </Link>
          ))}
        </nav>
        <div style={{ padding:'0.5rem 0.75rem' }}>
          <Link href="/" style={{ textDecoration:'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 0.9rem', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.45)', fontSize:'0.85rem', fontWeight:600 }}>
              <Home style={{ width:17, height:17, flexShrink:0 }} />
              {sidebarOpen && 'Back to Site'}
            </div>
          </Link>
        </div>
        <div style={{ padding:'0.75rem', borderTop:'1px solid rgba(255,98,0,0.08)' }}>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent: sidebarOpen ? 'flex-start' : 'center', gap:'0.65rem', padding:'0.65rem 0.9rem', background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, color:'#f87171', cursor:'pointer', fontSize:'0.85rem', fontWeight:600 }}>
            <LogOut style={{ width:16, height:16 }} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{ flex:1, marginLeft: sidebarOpen ? 260 : 76, transition:'margin-left 0.3s ease', minWidth:0 }}>

        {/* Header */}
        <header style={{ position:'sticky', top:0, zIndex:30, background:'rgba(5,5,7,0.92)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,98,0,0.1)', padding:'0.9rem 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
            <button onClick={() => setSidebarOpen(s => !s)} className="icon-btn">
              {sidebarOpen ? <X style={{ width:18, height:18 }} /> : <Menu style={{ width:18, height:18 }} />}
            </button>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
                <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:'1.6rem', letterSpacing:'0.06em', lineHeight:1 }}>
                  <span className="gradient-text">Settings</span>
                </h1>
                <div style={{ display:'flex', alignItems:'center', gap:'0.35rem', padding:'0.2rem 0.55rem', background: liveIndicator ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${liveIndicator ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)'}`, borderRadius:9999, transition:'all 0.3s' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', animation: liveIndicator ? 'pulse 1s ease infinite' : 'none' }} />
                  <span style={{ fontSize:'0.65rem', fontWeight:700, color: liveIndicator ? '#4ADE80' : 'rgba(255,255,255,0.3)', letterSpacing:'0.05em' }}>LIVE</span>
                </div>
              </div>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                {hasChanges ? '⚠ Unsaved changes' : 'All changes saved'}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', gap:'0.65rem', alignItems:'center' }}>
            {hasChanges && (
              <button onClick={() => setSettings(original)} className="btn-ghost" style={{ padding:'0.6rem 1rem', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <RefreshCw style={{ width:14, height:14 }} /> Discard
              </button>
            )}
            <button onClick={saveSettings} disabled={saving || !hasChanges} className="btn-fire"
              style={{ display:'flex', alignItems:'center', gap:'0.4rem', padding:'0.6rem 1.2rem', fontSize:'0.88rem', opacity: !hasChanges ? 0.5 : 1, cursor: !hasChanges ? 'not-allowed' : 'pointer' }}>
              {saved ? <><CheckCircle style={{ width:15, height:15 }} /> Saved!</>
                : saving ? <><Loader2 style={{ width:15, height:15, animation:'spin 1s linear infinite' }} /> Saving…</>
                : <><Save style={{ width:15, height:15 }} /> Save Settings</>}
            </button>
          </div>
        </header>

        <div style={{ padding:'2rem', display:'grid', gridTemplateColumns:'220px 1fr', gap:'1.5rem', alignItems:'start' }}>

          {/* Tab sidebar */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'0.6rem', position:'sticky', top:'90px' }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:'0.65rem',
                  padding:'0.72rem 0.9rem', borderRadius:10, marginBottom:'0.15rem',
                  background: activeTab === id ? 'rgba(255,98,0,0.14)' : 'transparent',
                  border:`1px solid ${activeTab === id ? 'rgba(255,140,0,0.3)' : 'transparent'}`,
                  color: activeTab === id ? '#FFB733' : id === 'danger' ? '#f87171' : 'rgba(255,255,255,0.55)',
                  cursor:'pointer', fontSize:'0.85rem', fontWeight:600, fontFamily:'Outfit,sans-serif', transition:'all 0.15s', textAlign:'left',
                }}>
                <Icon style={{ width:16, height:16, flexShrink:0 }} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* ── GENERAL ── */}
            {activeTab === 'general' && (
              <>
                <Section title="Site Identity" icon={<Globe style={{ width:16, height:16 }} />}>
                  <SettingRow label="Site Name" desc="The name displayed across your platform">
                    <TInput value={settings.site_name} onChange={v => set({ site_name: v })} placeholder="Roy Entertainment" />
                  </SettingRow>
                  <SettingRow label="Tagline" desc="Short catchy description shown in hero sections">
                    <TInput value={settings.site_tagline} onChange={v => set({ site_tagline: v })} placeholder="Stream. Watch. Enjoy." />
                  </SettingRow>
                  <SettingRow label="Description" desc="Used for SEO meta description">
                    <textarea value={settings.site_description} onChange={e => set({ site_description: e.target.value })} rows={3}
                      style={{ ...inputSt, resize:'vertical' }} placeholder="Your platform description…" />
                  </SettingRow>
                  <SettingRow label="Contact Email" desc="Public contact email for support">
                    <TInput value={settings.contact_email} onChange={v => set({ contact_email: v })} placeholder="support@yoursite.com" type="email" />
                  </SettingRow>
                </Section>

                <Section title="System" icon={<Server style={{ width:16, height:16 }} />}>
                  <ToggleRow label="Maintenance Mode" desc="Temporarily disable the site for visitors" value={settings.maintenance_mode} onChange={v => set({ maintenance_mode: v })} color="#ef4444" />
                </Section>
              </>
            )}

            {/* ── CONTENT ── */}
            {activeTab === 'content' && (
              <>
                <Section title="Upload Settings" icon={<Upload style={{ width:16, height:16 }} />}>
                  <ToggleRow label="Allow User Uploads" desc="Let registered users submit films for review" value={settings.allow_uploads} onChange={v => set({ allow_uploads: v })} color="#22c55e" />
                  <ToggleRow label="Require Approval" desc="New submissions must be approved by admin before going live" value={settings.require_approval} onChange={v => set({ require_approval: v })} color="#FFB733" />
                  <SettingRow label="Max Upload Size (MB)" desc="Maximum allowed file size for video uploads">
                    <TInput value={settings.max_upload_size_mb.toString()} onChange={v => set({ max_upload_size_mb: parseInt(v)||500 })} placeholder="500" type="number" />
                  </SettingRow>
                </Section>

                <Section title="Homepage Limits" icon={<Sliders style={{ width:16, height:16 }} />}>
                  <SettingRow label="Featured Films Count" desc="How many films appear in the Featured section">
                    <TInput value={settings.featured_count.toString()} onChange={v => set({ featured_count: parseInt(v)||10 })} placeholder="10" type="number" />
                  </SettingRow>
                  <SettingRow label="Trending Films Count" desc="How many films appear in the Trending section">
                    <TInput value={settings.trending_count.toString()} onChange={v => set({ trending_count: parseInt(v)||10 })} placeholder="10" type="number" />
                  </SettingRow>
                </Section>
              </>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && (
              <Section title="User & Auth Settings" icon={<Shield style={{ width:16, height:16 }} />}>
                <ToggleRow label="Open Registration" desc="Allow new users to register. Disable to make the platform invite-only." value={settings.registration_open} onChange={v => set({ registration_open: v })} color="#22c55e" />
                <SettingRow label="Default Language" desc="Default language preference for new users">
                  <select value={settings.default_language} onChange={e => set({ default_language: e.target.value })} style={inputSt}>
                    {['English','Hindi','Tamil','Telugu','Malayalam','Kannada'].map(l => (
                      <option key={l} value={l} style={{ background:'#0e0e18' }}>{l}</option>
                    ))}
                  </select>
                </SettingRow>
              </Section>
            )}

            {/* ── INTEGRATIONS ── */}
            {activeTab === 'integrations' && (
              <Section title="API Keys" icon={<Key style={{ width:16, height:16 }} />}>
                <SettingRow label="TMDB API Key" desc="Used to auto-fetch movie metadata from The Movie Database">
                  <SecretInput id="tmdb" value={settings.tmdb_api_key} onChange={v => set({ tmdb_api_key: v })} show={showPass['tmdb']} onToggle={() => togglePass('tmdb')} placeholder="Your TMDB API key" />
                </SettingRow>
                <SettingRow label="YouTube Data API Key" desc="Used to fetch video details and thumbnails from YouTube">
                  <SecretInput id="yt" value={settings.youtube_api_key} onChange={v => set({ youtube_api_key: v })} show={showPass['yt']} onToggle={() => togglePass('yt')} placeholder="Your YouTube API key" />
                </SettingRow>
              </Section>
            )}

            {/* ── EMAIL ── */}
            {activeTab === 'email' && (
              <Section title="SMTP Configuration" icon={<Mail style={{ width:16, height:16 }} />}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <SettingRow label="SMTP Host" desc="e.g. smtp.gmail.com">
                    <TInput value={settings.smtp_host} onChange={v => set({ smtp_host: v })} placeholder="smtp.gmail.com" />
                  </SettingRow>
                  <SettingRow label="SMTP Port" desc="Usually 587 (TLS) or 465 (SSL)">
                    <TInput value={settings.smtp_port} onChange={v => set({ smtp_port: v })} placeholder="587" />
                  </SettingRow>
                  <SettingRow label="SMTP Username" desc="Usually your email address">
                    <TInput value={settings.smtp_user} onChange={v => set({ smtp_user: v })} placeholder="you@gmail.com" />
                  </SettingRow>
                  <SettingRow label="SMTP Password" desc="App password or SMTP password">
                    <SecretInput id="smtp" value={settings.smtp_pass} onChange={v => set({ smtp_pass: v })} show={showPass['smtp']} onToggle={() => togglePass('smtp')} placeholder="App password" />
                  </SettingRow>
                </div>
              </Section>
            )}

            {/* ── APPEARANCE ── */}
            {activeTab === 'appearance' && (
              <Section title="Theme Colors" icon={<Palette style={{ width:16, height:16 }} />}>
                <SettingRow label="Primary Color" desc="Main brand color (buttons, highlights)">
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <input type="color" value={settings.primary_color} onChange={e => set({ primary_color: e.target.value })}
                      style={{ width:44, height:44, borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', padding:2, background:'rgba(255,255,255,0.04)' }} />
                    <TInput value={settings.primary_color} onChange={v => set({ primary_color: v })} placeholder="#FF6200" />
                  </div>
                </SettingRow>
                <SettingRow label="Accent Color" desc="Secondary accent color">
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <input type="color" value={settings.accent_color} onChange={e => set({ accent_color: e.target.value })}
                      style={{ width:44, height:44, borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', padding:2, background:'rgba(255,255,255,0.04)' }} />
                    <TInput value={settings.accent_color} onChange={v => set({ accent_color: v })} placeholder="#FFB733" />
                  </div>
                </SettingRow>
                {/* Preview */}
                <div style={{ marginTop:'0.5rem', padding:'1.25rem', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14 }}>
                  <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.75rem' }}>Color Preview</p>
                  <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                    <div style={{ padding:'0.6rem 1.25rem', borderRadius:10, background: settings.primary_color, color:'white', fontSize:'0.85rem', fontWeight:700 }}>Primary Button</div>
                    <div style={{ padding:'0.6rem 1.25rem', borderRadius:10, background: settings.accent_color, color:'white', fontSize:'0.85rem', fontWeight:700 }}>Accent Button</div>
                    <div style={{ padding:'0.6rem 1.25rem', borderRadius:10, border:`2px solid ${settings.primary_color}`, color: settings.primary_color, fontSize:'0.85rem', fontWeight:700 }}>Outlined</div>
                  </div>
                </div>
              </Section>
            )}

            {/* ── DANGER ── */}
            {activeTab === 'danger' && (
              <Section title="Danger Zone" icon={<AlertTriangle style={{ width:16, height:16, color:'#ef4444' }} />} borderColor="rgba(239,68,68,0.2)">
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {[
                    { label:'Clear All Cached Data', desc:'Remove server-side cache. Site may be slower temporarily.', btnLabel:'Clear Cache', color:'#f59e0b' },
                    { label:'Reset Site Settings', desc:'Restore all settings to factory defaults. Cannot be undone.', btnLabel:'Reset to Defaults', color:'#ef4444' },
                    { label:'Export All Data', desc:'Download a full JSON export of all movies, series and settings.', btnLabel:'Export JSON', color:'#38BDF8' },
                  ].map(({ label, desc, btnLabel, color }) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 1.25rem', borderRadius:14, border:`1px solid ${color}22`, background:`${color}08`, gap:'1rem' }}>
                      <div>
                        <p style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:'0.2rem' }}>{label}</p>
                        <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{desc}</p>
                      </div>
                      <button onClick={() => showToast(`${btnLabel} action not implemented yet — connect your backend.`, 'err')}
                        style={{ padding:'0.55rem 1.1rem', border:`1px solid ${color}44`, borderRadius:10, background:`${color}12`, color, cursor:'pointer', fontSize:'0.82rem', fontWeight:700, fontFamily:'Outfit,sans-serif', flexShrink:0, whiteSpace:'nowrap' }}>
                        {btnLabel}
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, zIndex:999, padding:'0.85rem 1.25rem', borderRadius:14, background: toast.type === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border:`1px solid ${toast.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.type === 'ok' ? '#4ADE80' : '#f87171', fontSize:'0.88rem', fontWeight:600, backdropFilter:'blur(16px)', display:'flex', alignItems:'center', gap:'0.5rem', boxShadow:'0 8px 30px rgba(0,0,0,0.4)' }}>
          {toast.type === 'ok' ? <CheckCircle style={{ width:16, height:16 }} /> : <XCircle style={{ width:16, height:16 }} />}
          {toast.msg}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
      `}</style>
    </div>
  )
}

/* ── Section ── */
function Section({ title, icon, children, borderColor = 'rgba(255,255,255,0.06)' }: { title:string; icon:React.ReactNode; children:React.ReactNode; borderColor?:string }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.02)', border:`1px solid ${borderColor}`, borderRadius:16, overflow:'hidden' }}>
      <div style={{ padding:'1rem 1.4rem', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:'0.6rem', background:'rgba(255,255,255,0.015)' }}>
        <span style={{ color:'#FF8C00' }}>{icon}</span>
        <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'white' }}>{title}</h3>
      </div>
      <div style={{ padding:'1.25rem 1.4rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>{children}</div>
    </div>
  )
}

/* ── SettingRow ── */
function SettingRow({ label, desc, children }: { label:string; desc:string; children:React.ReactNode }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', alignItems:'start' }}>
      <div>
        <p style={{ fontSize:'0.9rem', fontWeight:600, color:'white', marginBottom:'0.2rem' }}>{label}</p>
        <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', lineHeight:1.5 }}>{desc}</p>
      </div>
      <div>{children}</div>
    </div>
  )
}

/* ── ToggleRow ── */
function ToggleRow({ label, desc, value, onChange, color }: { label:string; desc:string; value:boolean; onChange:(v:boolean)=>void; color:string }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.85rem 1rem', borderRadius:14, border:`1px solid ${value ? color+'44' : 'rgba(255,255,255,0.07)'}`, background: value ? color+'0f' : 'rgba(255,255,255,0.02)', cursor:'pointer', transition:'all 0.18s', gap:'1rem' }}>
      <div>
        <p style={{ fontWeight:700, fontSize:'0.9rem', color: value ? color : 'var(--text-primary)', marginBottom:'0.2rem' }}>{label}</p>
        <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{desc}</p>
      </div>
      <div style={{ width:44, height:24, borderRadius:12, background: value ? color : 'rgba(255,255,255,0.1)', position:'relative', transition:'background 0.25s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, left: value ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.25s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  )
}

/* ── SecretInput ── */
function SecretInput({ id, value, onChange, show, onToggle, placeholder }: { id:string; value:string; onChange:(v:string)=>void; show:boolean; onToggle:()=>void; placeholder:string }) {
  return (
    <div style={{ position:'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputSt, paddingRight:'2.75rem' }}
        onFocus={e => e.target.style.borderColor='rgba(255,140,0,0.45)'}
        onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}
      />
      <button onClick={onToggle} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4, display:'flex' }}>
        {show ? <EyeOff style={{ width:15, height:15 }} /> : <Eye style={{ width:15, height:15 }} />}
      </button>
    </div>
  )
}

function TInput({ value, onChange, placeholder, type='text' }: { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputSt} onFocus={e => e.target.style.borderColor='rgba(255,140,0,0.45)'} onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'} />
}

const inputSt: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'0.7rem 0.9rem', color:'white', fontSize:'0.87rem', outline:'none', fontFamily:'Outfit,sans-serif', transition:'border-color 0.2s', boxSizing:'border-box' }