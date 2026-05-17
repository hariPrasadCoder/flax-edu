'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/status-pill'
import { APPLICANT_STATUSES } from '@/lib/constants'
import { UserPlus, LayoutGrid, List, Search, Download, Sparkles, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type Applicant = {
  applicant: {
    id: string
    name: string
    email: string
    status: string
    aiSuitabilityScore: number | null
    matchedCourseId: string | null
    createdAt: string
    updatedAt: string
  }
  courseName: string | null
}

const KANBAN_LABELS: Record<string, string> = {
  applied: 'New',
  assessment_scheduled: 'Booked',
  assessment_done: 'Scoring',
  course_matched: 'Course Set',
  interview_scheduled: 'Interview',
  interviewed: 'Decide',
  enrolled: 'Enrolled',
}

const KANBAN_SUBLABELS: Record<string, string> = {
  applied: 'Schedule assessment',
  assessment_scheduled: 'Awaiting scores',
  assessment_done: 'Confirm course',
  course_matched: 'Book interview',
  interview_scheduled: 'After interview',
  interviewed: 'Enrol or decline',
  enrolled: 'All done',
}

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'table'>('kanban')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [bulkAnalysing, setBulkAnalysing] = useState(false)
  const [bulkResult, setBulkResult] = useState<string | null>(null)

  useEffect(() => {
    async function fetchApplicants() {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      try {
        const res = await fetch(`/api/applicants?${params}`)
        if (res.ok) setApplicants(await res.json())
      } finally {
        setLoading(false)
      }
    }
    const t = setTimeout(fetchApplicants, 200)
    return () => clearTimeout(t)
  }, [search, statusFilter])

  async function runBulkAnalysis() {
    setBulkAnalysing(true)
    setBulkResult(null)
    try {
      const res = await fetch('/api/ai/analyze-all', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        const msg = data.total === 0
          ? 'All applicants already have AI scores.'
          : `Done: analysed ${data.processed} of ${data.total} applicant${data.total !== 1 ? 's' : ''}.${data.errors?.length ? ` ${data.errors.length} failed.` : ''}`
        setBulkResult(msg)
        // Refresh list to show new AI scores
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (statusFilter) params.set('status', statusFilter)
        const r = await fetch(`/api/applicants?${params}`)
        if (r.ok) setApplicants(await r.json())
      } else {
        setBulkResult(`Failed: ${data.error || 'Unknown error'}`)
      }
    } catch {
      setBulkResult('Network error. Please try again.')
    } finally {
      setBulkAnalysing(false)
    }
  }

  const unanalysedCount = applicants.filter(
    a => a.applicant.aiSuitabilityScore === null && !['rejected', 'deferred', 'enrolled'].includes(a.applicant.status)
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.75rem] font-serif font-bold text-gray-900 leading-tight">Applicants</h1>
          <p className="text-gray-400 mt-0.5 text-sm">
            {loading ? 'Loading…' : `${applicants.length} applicant${applicants.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unanalysedCount > 0 && (
            <Button
              onClick={runBulkAnalysis}
              disabled={bulkAnalysing}
              variant="outline"
              className="gap-2 h-9 text-sm font-medium rounded-lg border-[#473FCF] text-[#473FCF] hover:bg-indigo-50"
            >
              {bulkAnalysing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing…</>
                : <><Sparkles className="w-3.5 h-3.5" /> Run AI for All ({unanalysedCount})</>
              }
            </Button>
          )}
          {bulkResult && (
            <span className="text-xs text-gray-500 max-w-[200px] leading-tight">{bulkResult}</span>
          )}
          <Link href="/dashboard/applicants/new">
            <Button className="bg-[#473FCF] hover:bg-[#3935B8] text-white gap-2 h-9 text-sm font-medium rounded-lg">
              <UserPlus className="w-4 h-4" />
              Add Applicant
            </Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm border-gray-200 rounded-lg"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#473FCF]"
        >
          <option value="">All statuses</option>
          {APPLICANT_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('kanban')}
            className={cn(
              'px-3 h-9 text-sm flex items-center gap-1.5 transition-colors',
              view === 'kanban' ? 'bg-indigo-50 text-[#473FCF]' : 'text-gray-500 hover:bg-gray-50'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Board
          </button>
          <button
            onClick={() => setView('table')}
            className={cn(
              'px-3 h-9 text-sm flex items-center gap-1.5 border-l border-gray-200 transition-colors',
              view === 'table' ? 'bg-indigo-50 text-[#473FCF]' : 'text-gray-500 hover:bg-gray-50'
            )}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
        </div>

        <a
          href="/api/applicants/export"
          download
          className="inline-flex items-center gap-1.5 h-9 px-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </a>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-none w-[190px]">
              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-4 rounded-full" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: i < 2 ? 2 : 1 }).map((_, j) => (
                  <div key={j} className="bg-white border border-[#E5E7EB] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full flex-none" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-2.5 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : view === 'kanban' ? (
        <KanbanView applicants={applicants} />
      ) : (
        <TableView applicants={applicants} />
      )}
    </div>
  )
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function KanbanView({ applicants }: { applicants: Applicant[] }) {
  const statusesToShow = APPLICANT_STATUSES.filter(s => s.value !== 'rejected')

  return (
    <div
      className="grid gap-2 pb-2"
      style={{ gridTemplateColumns: `repeat(${statusesToShow.length}, minmax(0, 1fr))` }}
    >
      {statusesToShow.map(status => {
        const cards = applicants.filter(a => a.applicant.status === status.value)
        return (
          <div key={status.value} className="min-w-0">
            {/* Column header */}
            <div className="flex items-start gap-1.5 mb-2 px-0.5">
              <span className={cn('w-1.5 h-1.5 rounded-full flex-none shrink-0 mt-1', status.dot)} />
              <div className="min-w-0 flex-1">
                <span className="text-[0.625rem] font-semibold text-gray-600 uppercase tracking-wider block truncate">
                  {KANBAN_LABELS[status.value] || status.label}
                </span>
                <span className="text-[0.5rem] text-gray-300 block mt-0.5 truncate">
                  {KANBAN_SUBLABELS[status.value] || ''}
                </span>
              </div>
              <span className="text-[0.625rem] text-gray-400 tabular-nums font-medium shrink-0 mt-0.5">
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-1.5">
              {cards.map(item => (
                <Link key={item.applicant.id} href={`/dashboard/applicants/${item.applicant.id}`}>
                  <div className="bg-white border border-[#E5E7EB] rounded-lg p-2.5 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-start gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-[#473FCF] flex items-center justify-center text-[0.5rem] font-bold flex-none mt-0.5 shrink-0">
                        {getInitials(item.applicant.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.6875rem] font-semibold text-gray-900 truncate group-hover:text-[#473FCF] transition-colors leading-tight">
                          {item.applicant.name}
                        </p>
                        <p className="text-[0.5625rem] text-gray-400 mt-0.5 truncate">{item.applicant.email}</p>
                      </div>
                    </div>

                    {item.courseName && (
                      <div className="mt-1.5">
                        <span className="inline-block text-[0.5625rem] bg-indigo-50 text-[#473FCF] px-1.5 py-0.5 rounded font-medium truncate max-w-full">
                          {item.courseName}
                        </span>
                      </div>
                    )}

                    {item.applicant.aiSuitabilityScore !== null && (
                      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-50">
                        <span className="text-[0.5rem] text-gray-400 font-medium">AI</span>
                        <div className="flex-1 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${item.applicant.aiSuitabilityScore}%`,
                              backgroundColor:
                                item.applicant.aiSuitabilityScore >= 75
                                  ? '#473FCF'
                                  : item.applicant.aiSuitabilityScore >= 50
                                  ? '#F59E0B'
                                  : '#EF4444',
                            }}
                          />
                        </div>
                        <span className="text-[0.5rem] font-semibold text-gray-500 tabular-nums">
                          {item.applicant.aiSuitabilityScore}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}

              {cards.length === 0 && (
                <div className="h-12 border border-dashed border-gray-100 rounded-lg" />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TableView({ applicants }: { applicants: Applicant[] }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-gray-50/70">
            <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
            <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Email</th>
            <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
            <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Matched Course</th>
            <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">AI Score</th>
            <th className="text-left px-5 py-3 text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wider">Applied</th>
          </tr>
        </thead>
        <tbody>
          {applicants.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-16 text-gray-300 text-sm">
                No applicants match your filters
              </td>
            </tr>
          ) : (
            applicants.map(item => (
              <tr key={item.applicant.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3.5">
                  <Link href={`/dashboard/applicants/${item.applicant.id}`} className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-[#473FCF] flex items-center justify-center text-[0.625rem] font-bold flex-none">
                      {getInitials(item.applicant.name)}
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-[#473FCF] transition-colors text-sm">
                      {item.applicant.name}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-sm">{item.applicant.email}</td>
                <td className="px-5 py-3.5"><StatusPill status={item.applicant.status} /></td>
                <td className="px-5 py-3.5 text-gray-600 text-sm">
                  {item.courseName || <span className="text-gray-200">-</span>}
                </td>
                <td className="px-5 py-3.5">
                  {item.applicant.aiSuitabilityScore !== null ? (
                    <span className="font-semibold text-gray-900 tabular-nums text-sm">
                      {item.applicant.aiSuitabilityScore}
                      <span className="font-normal text-gray-300 text-xs">/100</span>
                    </span>
                  ) : (
                    <span className="text-gray-200">-</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">
                  {format(new Date(item.applicant.createdAt), 'dd MMM yyyy')}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
