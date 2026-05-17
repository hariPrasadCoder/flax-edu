import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flax: AI Admissions',
  description: 'AI-powered admissions pipeline for UK Further Education colleges',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
