'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, UserPlus, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type Member = {
  id: string
  userId: string
  role: string
  createdAt: string
  userName: string | null
  userEmail: string | null
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/team')
      .then(r => r.json())
      .then(data => {
        setMembers(Array.isArray(data) ? data : [])
      })
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (res.ok) {
        const data = await res.json()
        setInviteLink(data.inviteUrl)
        setInviteEmail('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-serif font-bold text-gray-900 leading-tight">Team</h1>
        <p className="text-gray-400 mt-0.5 text-sm">Manage access to your college workspace</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Invite Form */}
        <div>
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-[#473FCF]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Invite member</h2>
                <p className="text-xs text-gray-400">Generate a shareable link</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <Label htmlFor="inviteEmail" className="text-xs font-medium text-gray-600">Email address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@college.ac.uk"
                  required
                  className="mt-1 h-9 text-sm border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <Label htmlFor="inviteRole" className="text-xs font-medium text-gray-600">Role</Label>
                <select
                  id="inviteRole"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="mt-1 w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#473FCF]"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm font-medium rounded-lg"
                disabled={submitting}
              >
                {submitting ? 'Generating…' : 'Generate link'}
              </Button>
            </form>

            {inviteLink && (
              <div className="mt-4 flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs text-indigo-700 flex-1 truncate font-mono">{inviteLink}</p>
                <button
                  onClick={copyLink}
                  className="flex-none w-7 h-7 rounded-md hover:bg-indigo-100 flex items-center justify-center transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Members Table */}
        <div className="col-span-2">
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900">Members</h2>
              <span className="text-xs text-gray-400 tabular-nums">{loading ? '' : members.length}</span>
            </div>

            {loading ? (
              <table className="w-full text-sm">
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#E5E7EB] last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full flex-none" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-44" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="px-5 py-3.5"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-5 py-3.5"><Skeleton className="h-7 w-16 rounded-lg" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-300">No members yet</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-gray-50/70">
                    <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Member</th>
                    <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 text-[#473FCF] flex items-center justify-center text-[0.625rem] font-bold flex-none">
                            {getInitials(m.userName)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{m.userName || '-'}</p>
                            <p className="text-xs text-gray-400">{m.userEmail || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 text-[0.6875rem] rounded-md font-semibold ${
                          m.role === 'admin'
                            ? 'bg-indigo-50 text-[#473FCF]'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {m.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {new Date(m.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
