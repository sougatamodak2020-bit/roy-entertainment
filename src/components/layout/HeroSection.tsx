'use client'

import Link from 'next/link'
import { Play, Info } from 'lucide-react'

export function HeroSection() {
  return (
    <section 
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background Image */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}
      />
      
      {/* Gradient Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,10,11,0.7) 0%, rgba(10,10,11,0.5) 50%, rgba(10,10,11,1) 100%)',
        }}
      />
      
      {/* Purple Glow */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Content */}
      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 1.5rem',
          maxWidth: '900px',
        }}
      >
        <p 
          style={{
            fontSize: '0.875rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#a78bfa',
            marginBottom: '1rem',
            fontWeight: 500,
          }}
        >
          Welcome to
        </p>
        
        <h1 
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
            fontWeight: 'bold',
            fontFamily: 'var(--font-cinzel), serif',
            marginBottom: '1.5rem',
            lineHeight: 1.1,
          }}
        >
          <span className="gradient-text">ROY ENTERTAINMENT</span>
        </h1>
        
        <p 
          style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '2.5rem',
            fontFamily: 'var(--font-playfair), serif',
            fontStyle: 'italic',
          }}
        >
          Experience Cinema Like Never Before
        </p>
        
        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/movies">
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 2rem',
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
                border: 'none',
                borderRadius: '9999px',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 0 40px rgba(139, 92, 246, 0.6)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(139, 92, 246, 0.4)'
              }}
            >
              <Play style={{ width: '24px', height: '24px', fill: 'white' }} />
              Start Watching
            </button>
          </Link>
          
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '9999px',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            <Info style={{ width: '24px', height: '24px' }} />
            Learn More
          </button>
        </div>
        
        {/* Scroll Indicator */}
        <div 
          style={{
            position: 'absolute',
            bottom: '-120px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            Scroll to explore
          </span>
          <div 
            style={{
              width: '24px',
              height: '40px',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '8px',
            }}
          >
            <div 
              style={{
                width: '4px',
                height: '8px',
                backgroundColor: '#8b5cf6',
                borderRadius: '2px',
                animation: 'bounce 1.5s infinite',
              }}
            />
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
      `}</style>
    </section>
  )
}