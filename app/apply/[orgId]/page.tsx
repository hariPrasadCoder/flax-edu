'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SOURCE_OPTIONS } from '@/lib/constants'

type Course = { id: string; name: string; level: string }

export default function ApplyPage() {
  const params = useParams()
  const orgId = params.orgId as string

  const [orgName, setOrgName] = useState('')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    interestedCourseId: '',
    source: '',
    statement: '',
  })

  useEffect(() => {
    fetch(`/api/apply/${orgId}`)
      .then(r => r.json())
      .then(data => {
        if (data.org) setOrgName(data.org.name)
        if (data.courses) setCourses(data.courses)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [orgId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/apply/${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Something went wrong')
        setSubmitting(false)
        return
      }
      const { applicantId } = await res.json()
      // Upload CV if provided
      if (cvFile && applicantId) {
        const fd = new FormData()
        fd.append('file', cvFile)
        await fetch(`/api/apply/${orgId}/cv/${applicantId}`, { method: 'POST', body: fd })
      }
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-7 h-7 text-green-500" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">Application received</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Thank you, <strong>{form.name}</strong>. We&apos;ve received your application to {orgName}.
          A member of our admissions team will be in touch within 3 working days to arrange your assessment.
        </p>
        <p className="text-gray-400 text-xs mt-4">You can close this window.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-[#473FCF] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L10.5 9H1.5L6 1Z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">{orgName || 'College'}</span>
            <span className="text-gray-300 mx-2">·</span>
            <span className="text-xs text-gray-400">Powered by Flax</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-gray-900">Apply for a course</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Fill in your details and we&apos;ll match you with the right course. Our AI will assess your background and our admissions team will be in touch.
          </p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-xs font-medium text-gray-600">Full name *</Label>
                <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Amara Osei" required className="mt-1 h-9 text-sm border-gray-200 rounded-lg" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs font-medium text-gray-600">Phone number</Label>
                <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="07700 900123" className="mt-1 h-9 text-sm border-gray-200 rounded-lg" />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-xs font-medium text-gray-600">Email address *</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="amara@example.com" required className="mt-1 h-9 text-sm border-gray-200 rounded-lg" />
            </div>

            {courses.length > 0 && (
              <div>
                <Label htmlFor="course" className="text-xs font-medium text-gray-600">Course you&apos;re interested in</Label>
                <select id="course" value={form.interestedCourseId}
                  onChange={e => setForm(f => ({ ...f, interestedCourseId: e.target.value }))}
                  className="mt-1 w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF]">
                  <option value="">Not sure yet, let AI match me</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-gray-600">How did you hear about us?</Label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF]">
                <option value="">Please select…</option>
                {SOURCE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">Brief statement (optional)</Label>
              <textarea value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))}
                placeholder="Tell us a bit about yourself, your background, and why you want to study this course…"
                rows={4} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF] resize-none" />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">CV / Resume (PDF) - recommended</Label>
              <div onClick={() => fileRef.current?.click()}
                className="mt-1 border-2 border-dashed border-gray-100 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
                <div className="w-8 h-8 bg-gray-50 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400 group-hover:text-[#473FCF] transition-colors" />
                </div>
                {cvFile ? (
                  <p className="text-sm font-medium text-gray-900">{cvFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">Click to upload your CV</p>
                    <p className="text-xs text-gray-400 mt-1">PDF only · Helps us match you to the right course</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => setCvFile(e.target.files?.[0] || null)} />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={submitting}
              className="w-full bg-[#473FCF] hover:bg-[#3935B8] text-white h-10 text-sm font-medium rounded-lg">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting application…
                </span>
              ) : 'Submit Application'}
            </Button>

            <p className="text-center text-xs text-gray-300">
              Your information is handled securely and used only for admissions purposes.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
