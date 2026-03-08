'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Youtube, Mail, Flame } from 'lucide-react'

// Twitter and Instagram removed per request
const SOCIALS = [
  { Icon: Facebook, href: '#', label: 'Facebook' },
  { Icon: Youtube,  href: '#', label: 'YouTube'  },
  { Icon: Mail,     href: '#', label: 'Email'    },
]

const NAV_COLS = {
  Explore: [
    { label: 'Movies',       href: '/movies'                 },
    { label: 'Series',       href: '/series'                 },
    { label: 'New Releases', href: '/movies?filter=new'      },
    { label: 'Trending',     href: '/movies?filter=trending' },
  ],
  Company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers',  href: '#' },
    { label: 'Blog',     href: '#' },
    { label: 'Press',    href: '#' },
  ],
  Support: [
    { label: 'Help Center', href: '#' },
    { label: 'Contact Us',  href: '#' },
    { label: 'FAQ',         href: '#' },
    { label: 'Feedback',    href: '#' },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 650, height: 280,
        background: 'radial-gradient(ellipse at bottom, var(--glow-lg) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="container" style={{ position: 'relative' }}>
        <div className="footer-grid">

          {/* Brand column */}
          <div>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none', marginBottom: '1.1rem' }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--brand-core), var(--brand-gold))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px var(--glow-sm)', overflow: 'hidden', flexShrink: 0,
              }}>
                <Image
                  src="/images/logo.jpg"
                  alt="Roy Entertainment"
                  width={42} height={42}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  onError={(e) => {
                    const t = e.target as HTMLImageElement
                    t.style.display = 'none'
                    if (t.parentElement) {
                      t.parentElement.innerHTML = `<span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:white">RE</span>`
                    }
                  }}
                />
              </div>
              <div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.35rem', letterSpacing: '0.08em', lineHeight: 1 }}>
                  <span className="gradient-text">ROY</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 5, fontSize: '0.9rem', fontFamily: 'Outfit,sans-serif', fontWeight: 500, letterSpacing: 0 }}>
                    Entertainment
                  </span>
                </div>
              </div>
            </Link>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.72, marginBottom: '1.5rem' }}>
              Premium streaming, handpicked cinema, and AI-powered recommendations — all in one place. Made for true movie lovers.
            </p>

            <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
              {SOCIALS.map(({ Icon, href, label }) => (
                <a key={label} href={href} aria-label={label} className="footer-social-btn">
                  <Icon style={{ width: 16, height: 16 }} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(NAV_COLS).map(([heading, links]) => (
            <div key={heading}>
              <p className="footer-heading">{heading}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="footer-link">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© {year} Roy Entertainment. All rights reserved.</p>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {['Privacy Policy', 'Terms of Service'].map(t => (
              <Link key={t} href="#" className="footer-link" style={{ padding: 0, fontSize: '0.8rem' }}>{t}</Link>
            ))}
          </div>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Made with <Flame style={{ width: 13, height: 13, color: 'var(--brand-core)' }} /> in India
          </p>
        </div>
      </div>
    </footer>
  )
}