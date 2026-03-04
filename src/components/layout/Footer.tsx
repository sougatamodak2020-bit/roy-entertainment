'use client'

import Link from 'next/link'
import { Crown, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer 
      style={{
        backgroundColor: '#050506',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '4rem 0 2rem',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* Main Footer Content */}
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem',
          }}
        >
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '1rem' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown style={{ width: '20px', height: '20px', color: 'white' }} />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'var(--font-cinzel), serif' }}>
                <span className="gradient-text">ROY</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', marginLeft: '4px' }}>Entertainment</span>
              </span>
            </Link>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Experience cinema like never before with premium streaming and AI-powered recommendations.
            </p>
          </div>
          
          {/* Links */}
          <div>
            <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['About Us', 'Careers', 'Press', 'Blog'].map((item) => (
                <li key={item} style={{ marginBottom: '0.5rem' }}>
                  <Link href="#" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.875rem', transition: 'color 0.2s' }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Support</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {['Help Center', 'Contact Us', 'FAQ', 'Feedback'].map((item) => (
                <li key={item} style={{ marginBottom: '0.5rem' }}>
                  <Link href="#" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.875rem' }}>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Follow Us</h4>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a 
                  key={i}
                  href="#" 
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.6)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon style={{ width: '18px', height: '18px' }} />
                </a>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bottom */}
        <div 
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            © {currentYear} Roy Entertainment. All rights reserved.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>
            Made with ❤️ in India
          </p>
        </div>
      </div>
    </footer>
  )
}