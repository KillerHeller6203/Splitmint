import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SplitMint — Your Gateway to Karbon',
  description: 'Split expenses with friends and family effortlessly',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
