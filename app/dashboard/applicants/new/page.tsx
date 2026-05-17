'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Brain, FileText, Sparkles, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function NewApplicantPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create applicant
      const res = await fetch('/api/applicants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create applicant')
        setLoading(false)
        return
      }

      const applicant = await res.json()

      // Upload CV if provided
      if (cvFile) {
        const formData = new FormData()
        formData.append('file', cvFile)

        await fetch(`/api/applicants/${applicant.id}/upload-cv`, {
          method: 'POST',
          body: formData,
        })

        // Auto-trigger AI analysis if we have a CV
        await fetch('/api/ai/analyze-applicant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicantId: applicant.id }),
        })
      }

      router.push(`/dashboard/applicants/${applicant.id}`)
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <Link
        href="/dashboard/applicants"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to applicants
      </Link>

      <div className="mb-6">
        <h1 className="text-[1.75rem] font-serif font-bold text-gray-900 leading-tight">Add Applicant</h1>
        <p className="text-gray-400 mt-0.5 text-sm">Create a new applicant record</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="col-span-2">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium text-gray-600">Full name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Amara Osei"
                    required
                    className="mt-1 h-9 text-sm border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-medium text-gray-600">Phone number</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="07700 900123"
                    className="mt-1 h-9 text-sm border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-xs font-medium text-gray-600">Email address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="amara@example.com"
                  required
                  className="mt-1 h-9 text-sm border-gray-200 rounded-lg"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-gray-600">CV / Resume (PDF)</Label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="mt-1 border-2 border-dashed border-[#E5E7EB] rounded-xl p-8 text-center cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors group"
                >
                  <div className="w-9 h-9 bg-gray-50 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2.5 transition-colors">
                    <Upload className="w-4 h-4 text-gray-400 group-hover:text-[#473FCF] transition-colors" />
                  </div>
                  {cvFile ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cvFile.name}</p>
                      <p className="text-xs text-[#473FCF] mt-0.5">AI analysis will run on save</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">Click to upload PDF</p>
                      <p className="text-xs text-gray-400 mt-1">AI will extract text and match courses automatically</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => setCvFile(e.target.files?.[0] || null)}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  className="bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm font-medium rounded-lg px-5"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {cvFile ? 'Creating & analysing…' : 'Creating…'}
                    </span>
                  ) : 'Create applicant'}
                </Button>
                <Link href="/dashboard/applicants">
                  <Button variant="ghost" type="button" className="h-9 text-sm">Cancel</Button>
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Info panel */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-[#473FCF]" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">What happens next</h3>
            </div>
            <div className="space-y-3">
              {[
                { icon: FileText, text: 'Applicant added to your pipeline at "Applied" stage' },
                { icon: Brain, text: 'If a CV is uploaded, AI extracts text and runs course matching' },
                { icon: CheckCircle2, text: 'You can then schedule an assessment and progress them through stages' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-gray-50 flex items-center justify-center flex-none mt-0.5">
                    <item.icon className="w-3 h-3 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-[#473FCF]" />
              <h3 className="text-sm font-semibold text-[#473FCF]">AI tip</h3>
            </div>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Upload a CV for the most accurate course matching. The AI reads the applicant&apos;s background and scores them against each of your courses.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
