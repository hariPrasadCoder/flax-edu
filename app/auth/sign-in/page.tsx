'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'

const features = [
  'AI course matching in seconds',
  'Full admissions pipeline tracking',
  'Assessment scoring & CV analysis',
  'Team collaboration built in',
]

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Invalid credentials')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[440px] flex-none bg-[#1E1B6B] flex-col p-12">
        <div>
          <span className="text-white text-2xl font-serif font-bold">Flax</span>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-[2.75rem] font-serif font-bold text-white leading-[1.12] mt-auto">
            Admissions,<br />reimagined.
          </h2>
          <p className="mt-4 text-indigo-200 text-[0.9375rem] leading-relaxed max-w-xs">
            The AI-powered pipeline built for UK Further Education colleges. Stop managing spreadsheets.
          </p>
          <div className="mt-10 space-y-3.5">
            {features.map(f => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-indigo-300 flex-none" />
                <span className="text-indigo-100 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-400 text-xs mt-auto pt-12">© 2026 Flax · Built for FE colleges</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8">
            <span className="text-2xl font-serif font-bold text-gray-900">Flax</span>
          </div>

          <h1 className="text-[1.625rem] font-semibold text-gray-900 tracking-tight">Welcome back</h1>
          <p className="text-gray-400 mt-1.5 text-sm">Sign in to your admissions dashboard</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-700 text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@college.ac.uk"
                required
                className="mt-1.5 h-10 border-gray-200 rounded-lg focus-visible:ring-2 focus-visible:ring-[#473FCF] focus-visible:border-[#473FCF]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-700 text-sm font-medium">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1.5 h-10 border-gray-200 rounded-lg focus-visible:ring-2 focus-visible:ring-[#473FCF] focus-visible:border-[#473FCF]"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-[#473FCF] hover:bg-[#3935B8] text-white font-medium rounded-lg mt-1"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-[#473FCF] hover:underline font-medium">
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
