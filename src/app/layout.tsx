import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Cinzel, Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/providers/AuthProvider'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Roy Entertainment | Premium Streaming Experience',
  description: 'Experience cinema like never before with Roy Entertainment',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body 
        className={`${playfair.variable} ${cinzel.variable} ${inter.variable} antialiased`}
        style={{ 
          backgroundColor: '#0a0a0b', 
          color: 'white',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          margin: 0,
          padding: 0,
          minHeight: '100vh'
        }}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a1d',
              color: '#fff',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            },
          }}
        />
      </body>
    </html>
  )
}