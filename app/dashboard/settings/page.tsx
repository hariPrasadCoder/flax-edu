'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Copy } from 'lucide-react'

type Me = {
  id: string
  email: string
  name: string
  orgId: string
  orgName: string
  role: string
}

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [orgName, setOrgName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.user) {
        setMe(data.user)
        setOrgName(data.user.orgName || '')
      }
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: orgName }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-serif font-bold text-gray-900 leading-tight">Settings</h1>
        <p className="text-gray-400 mt-0.5 text-sm">Manage your organisation and account</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-2 space-y-5">
          {/* Org settings */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Organisation</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="orgName" className="text-xs font-medium text-gray-600">College name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="mt-1 h-9 text-sm border-gray-200 rounded-lg max-w-sm"
                  required
                />
              </div>
              <Button
                type="submit"
                className="bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm font-medium rounded-lg px-4 gap-2"
                disabled={saving}
              >
                {saved ? (
                  <><Check className="w-3.5 h-3.5" /> Saved</>
                ) : saving ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </div>

          {/* Public Application URL */}
          {me && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Public Application Form</h2>
              <p className="text-xs text-gray-400 mb-3">
                Share this link on your college website so applicants can apply directly.
              </p>
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-600 font-mono flex-1 truncate">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/apply/{me.orgId}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/apply/${me.orgId}`)
                  }}
                  className="flex-none p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
              <p className="text-[0.625rem] text-gray-300 mt-2">Uses your Organisation ID as the URL identifier</p>
            </div>
          )}

          {/* Profile */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Your profile</h2>
            {me && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Name</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{me.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">{me.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Role</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 capitalize">{me.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">About Flax</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Flax is an AI-powered admissions pipeline tool built for UK Further Education colleges.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Version</span>
                <span className="text-gray-900 font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Plan</span>
                <span className="bg-indigo-50 text-[#473FCF] px-2 py-0.5 rounded font-semibold text-[0.6875rem]">Free</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
