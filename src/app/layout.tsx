import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Cinzel, Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/providers/AuthProvider'
import './globals.css'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const cinzel   = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', display: 'swap' })
const inter    = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'Roy Entertainment | Premium Streaming Experience',
  description: 'Experience cinema like never before',
  icons: {
    icon: [
      { url: '/images/logo.jpg', type: 'image/jpeg' },
    ],
    apple: '/images/logo.jpg',
    shortcut: '/images/logo.jpg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        {/* Force favicon from logo.jpg */}
        <link rel="icon"            href="/images/logo.jpg" type="image/jpeg" />
        <link rel="shortcut icon"   href="/images/logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/images/logo.jpg" />
      </head>
      <body className={`${playfair.variable} ${cinzel.variable} ${inter.variable} antialiased bg-[#0a0a0f] text-[#e0e0ff]`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(26,26,35,0.95)',
              color: '#fff',
              border: '1px solid rgba(255,98,0,0.3)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
            },
          }}
        />
      </body>
    </html>
  )
}