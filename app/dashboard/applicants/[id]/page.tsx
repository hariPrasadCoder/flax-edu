'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/status-pill'
import {
  REJECTION_REASONS, SOURCE_OPTIONS, EVENT_LABELS,
  STAGE_STEPS, STEP_LABELS, STAGE_PROMPTS, TERMINAL_STAGES, APPLICANT_STATUSES,
} from '@/lib/constants'
import {
  ArrowLeft, Brain, FileText, Loader2, Upload, CheckCircle2,
  Calendar, Clock, ChevronRight, Copy, Check, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

type Applicant = {
  id: string; name: string; email: string; phone: string | null
  status: string; source: string | null; cvUrl: string | null; cvText: string | null; hasCv: boolean
  assessmentDate: string | null; assessmentEnglishScore: number | null; assessmentMathScore: number | null
  interviewDate: string | null; matchedCourseId: string | null; interestedCourseId: string | null
  aiSuitabilityScore: number | null; aiSuitabilitySummary: string | null
  aiMatchedCourses: Array<{ course_name: string; score: number; reason: string }> | null
  notes: string | null; rejectionReason: string | null; deferralReason: string | null
  enrolledDate: string | null; createdAt: string; updatedAt: string
}

type Course = { course: { id: string; name: string; level: string; capacity: number | null }; applicantCount: number }
type Event = { id: string; eventType: string; fromValue: string | null; toValue: string | null; actorName: string | null; metadata: Record<string, unknown> | null; createdAt: string }

function getInitials(name: string | undefined) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function safeFormat(value: string | null | undefined, fmt: string, fallback = '') {
  if (!value) return fallback
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return fallback
    return format(d, fmt)
  } catch { return fallback }
}

function humaniseStatus(value: string) {
  return APPLICANT_STATUSES.find(s => s.value === value)?.label || value
}

function humaniseEventValue(value: string) {
  // Format ISO timestamps to readable dates
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try { return format(new Date(value), 'dd MMM yyyy \'at\' HH:mm') } catch { /* fall through */ }
  }
  return value
}

// Step-by-step progress indicator shown at the top of the applicant detail
function ProgressStepper({ status }: { status: string }) {
  const isTerminal = TERMINAL_STAGES.includes(status as typeof TERMINAL_STAGES[number])
  const currentIdx = STAGE_STEPS.indexOf(status as typeof STAGE_STEPS[number])

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl px-6 py-4 mb-5">
      <div className="flex items-center">
        {STAGE_STEPS.map((step, i) => {
          const isPast = isTerminal || i < currentIdx
          const isCurrent = !isTerminal && i === currentIdx
          const lineIsFilled = isTerminal || i < currentIdx

          return (
            <Fragment key={step}>
              <div className="flex flex-col items-center gap-1.5 flex-none">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold transition-all flex-none',
                  isPast ? 'bg-[#473FCF] text-white' :
                  isCurrent ? 'bg-[#473FCF] text-white ring-4 ring-indigo-100' :
                  'bg-gray-100 text-gray-400'
                )}>
                  {isPast ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={cn(
                  'text-[0.5625rem] font-medium whitespace-nowrap',
                  isCurrent ? 'text-[#473FCF] font-semibold' : isPast ? 'text-gray-400' : 'text-gray-300'
                )}>
                  {STEP_LABELS[step]}
                </span>
              </div>
              {i < STAGE_STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-2 mb-4 transition-colors',
                  lineIsFilled ? 'bg-[#473FCF]' : 'bg-gray-100'
                )} />
              )}
            </Fragment>
          )
        })}
      </div>

      {isTerminal && (
        <div className="flex justify-center mt-2">
          <span className={cn(
            'text-[0.6875rem] font-semibold px-3 py-1 rounded-full',
            status === 'enrolled' ? 'bg-green-50 text-green-700' :
            status === 'rejected' ? 'bg-red-50 text-red-700' :
            'bg-yellow-50 text-yellow-700'
          )}>
            {status === 'enrolled' ? 'Enrolled ✓' :
             status === 'rejected' ? 'Application Declined' :
             'Deferred to later intake'}
          </span>
        </div>
      )}
    </div>
  )
}

// Confirmation modal for destructive actions (reject / defer)
function ConfirmDialog({ open, title, description, confirmLabel, confirmCls, onConfirm, onCancel }: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmCls?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-5">{description}</p>
        <div className="flex gap-2 justify-end">
          <Button onClick={onCancel} variant="ghost" size="sm" className="text-gray-600">
            Cancel
          </Button>
          <Button onClick={onConfirm} size="sm" className={confirmCls}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ApplicantDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchAll = useCallback(async () => {
    const [appRes, coursesRes, eventsRes] = await Promise.all([
      fetch(`/api/applicants/${id}`).then(r => r.json()),
      fetch('/api/courses').then(r => r.json()),
      fetch(`/api/applicants/${id}/events`).then(r => r.json()),
    ])
    const a = appRes.applicant || appRes
    setApplicant(a)
    setNotes(a.notes || '')
    setCourses(Array.isArray(coursesRes) ? coursesRes : [])
    setEvents(Array.isArray(eventsRes) ? eventsRes : [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function updateApplicant(fields: Partial<Applicant>) {
    const res = await fetch(`/api/applicants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    if (res.ok) {
      const updated = await res.json()
      setApplicant(updated)
      fetch(`/api/applicants/${id}/events`).then(r => r.json()).then(e => setEvents(Array.isArray(e) ? e : []))
    }
  }

  async function runAiAnalysis() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/analyze-applicant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicantId: id }),
      })
      const data = await res.json()
      if (res.ok) {
        setApplicant(prev => prev ? {
          ...prev,
          aiSuitabilityScore: data.overallScore,
          aiSuitabilitySummary: data.summary,
          aiMatchedCourses: data.courseMatches,
          matchedCourseId: data.matchedCourseId,
        } : prev)
        fetch(`/api/applicants/${id}/events`).then(r => r.json()).then(e => setEvents(Array.isArray(e) ? e : []))
      } else {
        alert(`Analysis failed: ${data.error || 'Unknown error'}${data.raw ? '\n\nRaw: ' + data.raw.slice(0, 300) : ''}`)
      }
    } catch (err) {
      alert(`Analysis failed: ${err instanceof Error ? err.message : 'Network error'}`)
    } finally {
      setAiLoading(false)
    }
  }

  async function uploadCv(file: File) {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/applicants/${id}/upload-cv`, { method: 'POST', body: formData })
    if (res.ok) await fetchAll()
    setUploading(false)
  }

  async function saveNotes() {
    setSaving(true)
    await updateApplicant({ notes })
    setSaving(false)
    setSavedAt(new Date())
  }

  function copyEmailTemplate(template: string) {
    navigator.clipboard.writeText(template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div>
      {/* Back + header */}
      <div className="flex items-center gap-2 mb-5">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Progress stepper */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl px-6 py-4 mb-5 flex items-center gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-2 w-10" />
            </div>
            {i < 5 && <Skeleton className="flex-1 h-0.5 mb-4" />}
          </div>
        ))}
      </div>
      {/* Name + status row */}
      <div className="flex items-start justify-between mb-5">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      {/* Cards grid */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        <div className="col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="col-span-3 bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-2">
              <Skeleton className="w-1.5 h-1.5 rounded-full mt-1.5 flex-none" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  if (!applicant) return <div className="text-gray-500">Applicant not found</div>

  const source = SOURCE_OPTIONS.find(s => s.value === applicant.source)
  const aiTopMatch = applicant.aiMatchedCourses?.[0] ?? null

  return (
    <div>
      <Link href="/dashboard/applicants" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to applicants
      </Link>

      {/* Progress stepper */}
      <ProgressStepper status={applicant.status} />

      <div className="grid grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="col-span-2 space-y-4">
          {/* Identity card */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-[#473FCF] flex items-center justify-center text-sm font-bold flex-none">
                {getInitials(applicant.name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-gray-900">{applicant.name}</h1>
                <p className="text-sm text-gray-500">{applicant.email}</p>
                {applicant.phone && <p className="text-xs text-gray-400">{applicant.phone}</p>}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <StatusPill status={applicant.status} />
              {source && (
                <span className="text-[0.625rem] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  {source.label}
                </span>
              )}
            </div>
            <p className="text-[0.6875rem] text-gray-400 mt-2">
              Applied {safeFormat(applicant.createdAt, 'dd MMM yyyy')}
            </p>
          </div>

          {/* Stage-specific action card */}
          <StageActions
            applicant={applicant}
            courses={courses}
            onUpdate={updateApplicant}
            onCopyEmail={copyEmailTemplate}
            copied={copied}
            onRunAI={runAiAnalysis}
            aiLoading={aiLoading}
            aiScore={applicant.aiSuitabilityScore}
            aiTopMatch={aiTopMatch}
          />

          {/* Assessment scores + Course assignment - combined card */}
          {['assessment_scheduled','assessment_done','course_matched','interview_scheduled','interviewed','enrolled','deferred','rejected'].includes(applicant.status) && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Assessment Scores</h3>
                  {applicant.assessmentDate && (
                    <span className="text-[0.625rem] text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {safeFormat(applicant.assessmentDate, 'EEE d MMM yyyy')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 font-medium">English /10</label>
                    <input type="number" min="0" max="10"
                      defaultValue={applicant.assessmentEnglishScore ?? ''}
                      onBlur={e => { if (e.target.value) updateApplicant({ assessmentEnglishScore: parseInt(e.target.value) }) }}
                      className="mt-1 w-full h-8 rounded-lg border border-gray-200 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF]"
                      placeholder="0–10" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium">Maths /10</label>
                    <input type="number" min="0" max="10"
                      defaultValue={applicant.assessmentMathScore ?? ''}
                      onBlur={e => { if (e.target.value) updateApplicant({ assessmentMathScore: parseInt(e.target.value) }) }}
                      className="mt-1 w-full h-8 rounded-lg border border-gray-200 px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF]"
                      placeholder="0–10" />
                  </div>
                </div>
              </div>

              {['course_matched','interview_scheduled','interviewed','enrolled'].includes(applicant.status) && (
                <div className="pt-3 border-t border-gray-50">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Assigned Course</h3>
                  <select
                    value={applicant.matchedCourseId || ''}
                    onChange={e => updateApplicant({ matchedCourseId: e.target.value || null })}
                    className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF]"
                  >
                    <option value="">Select course…</option>
                    {courses.map(c => (
                      <option key={c.course.id} value={c.course.id}>
                        {c.course.name} ({c.course.level})
                        {c.course.capacity ? ` (${c.applicantCount}/${c.course.capacity})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="col-span-3 space-y-4">
          {/* AI Analysis */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">AI Analysis</h3>
              <Button onClick={runAiAnalysis} disabled={aiLoading} size="sm"
                className="bg-[#473FCF] hover:bg-[#3935B8] text-white gap-1.5 h-7 text-xs rounded-lg px-3">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                {aiLoading ? 'Analysing…' : applicant.aiSuitabilityScore !== null ? 'Re-run' : 'Run Analysis'}
              </Button>
            </div>
            {applicant.aiSuitabilityScore !== null ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-none">
                    <div className="text-4xl font-bold text-gray-900 tabular-nums">{applicant.aiSuitabilityScore}</div>
                    <div className="text-[0.625rem] text-gray-400 mt-0.5 uppercase tracking-wide">Suitability / 100</div>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${applicant.aiSuitabilityScore}%`,
                        backgroundColor: applicant.aiSuitabilityScore >= 75 ? '#473FCF' : applicant.aiSuitabilityScore >= 50 ? '#F59E0B' : '#EF4444'
                      }} />
                    </div>
                  </div>
                </div>
                {applicant.aiSuitabilitySummary && (
                  <p className="text-sm text-gray-600 leading-relaxed">{applicant.aiSuitabilitySummary}</p>
                )}
                {applicant.aiMatchedCourses && applicant.aiMatchedCourses.length > 0 && (
                  <div>
                    <h4 className="text-[0.6875rem] font-semibold text-gray-400 uppercase tracking-wide mb-2">Course Matches</h4>
                    <div className="space-y-2">
                      {applicant.aiMatchedCourses.map((match, i) => (
                        <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                          <div className={cn(
                            'flex-none w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold',
                            i === 0 ? 'bg-[#473FCF] text-white' : 'bg-indigo-50 text-[#473FCF]'
                          )}>
                            {match.score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{match.course_name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{match.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Brain className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No analysis yet</p>
                <p className="text-xs text-gray-300 mt-1">
                  {applicant.hasCv ? 'Click "Run Analysis" to match courses' : 'Upload a CV first for best results'}
                </p>
              </div>
            )}
          </div>

          {/* CV + Notes - combined card */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
            {/* CV */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">CV / Resume</h3>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="text-xs text-[#473FCF] hover:underline flex items-center gap-1 font-medium">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {uploading ? 'Uploading…' : applicant.hasCv ? 'Replace' : 'Upload CV'}
                </button>
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCv(f) }} />
              {applicant.hasCv ? (
                <a href={`/api/applicants/${id}/cv`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#473FCF] hover:underline">
                  <FileText className="w-4 h-4" /> View uploaded CV
                </a>
              ) : (
                <div onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-100 rounded-lg p-3 text-center cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <p className="text-xs text-gray-400">No CV uploaded. Click to add a PDF.</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="pt-3 border-t border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Notes</h3>
                <div className="flex items-center gap-2">
                  {saving && <span className="text-[0.625rem] text-gray-400">Saving…</span>}
                  {!saving && savedAt && (
                    <span className="text-[0.625rem] text-green-500 flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Saved
                    </span>
                  )}
                  {!saving && (
                    <button onClick={saveNotes} className="text-[0.625rem] font-medium text-[#473FCF] hover:underline">
                      Save
                    </button>
                  )}
                </div>
              </div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
                placeholder="Add notes about this applicant…" rows={3}
                className="w-full resize-none text-sm text-gray-700 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-[#473FCF] focus:border-[#473FCF]" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity log - full width below the grid */}
      {events.length > 0 && (
        <div className="mt-4 bg-white border border-[#E5E7EB] rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">Activity</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {events.map(event => (
              <div key={event.id} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-none mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 font-medium">
                    {EVENT_LABELS[event.eventType] || event.eventType}
                    {event.eventType === 'status_changed' && event.fromValue && event.toValue && (
                      <span className="font-normal text-gray-400">
                        {' '}· {humaniseStatus(event.fromValue)} → {humaniseStatus(event.toValue)}
                      </span>
                    )}
                    {event.toValue && event.eventType !== 'status_changed' && event.eventType !== 'cv_uploaded' && (
                      <span className="font-normal text-gray-400"> · {humaniseEventValue(event.toValue)}</span>
                    )}
                  </p>
                  <p className="text-[0.625rem] text-gray-400 mt-0.5">
                    {event.actorName || 'System'} · {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Stage-specific action component
function StageActions({
  applicant, courses, onUpdate, onCopyEmail, copied, onRunAI, aiLoading, aiScore, aiTopMatch,
}: {
  applicant: Applicant
  courses: Course[]
  onUpdate: (fields: Partial<Applicant>) => Promise<void>
  onCopyEmail: (template: string) => void
  copied: boolean
  onRunAI: () => void
  aiLoading: boolean
  aiScore: number | null
  aiTopMatch: { course_name: string; score: number; reason: string } | null
}) {
  const [assessmentDate, setAssessmentDate] = useState(applicant.assessmentDate?.slice(0, 16) || '')
  const [interviewDate, setInterviewDate] = useState(applicant.interviewDate?.slice(0, 16) || '')
  const [rejectionReason, setRejectionReason] = useState('')
  const [deferralReason, setDeferralReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<{
    title: string; description: string; label: string; cls: string; action: () => void
  } | null>(null)

  async function act(fields: Partial<Applicant>) {
    setSaving(true)
    await onUpdate(fields)
    setSaving(false)
  }

  function askConfirm(
    title: string, description: string, label: string, cls: string, action: () => void
  ) {
    setConfirm({ title, description, label, cls, action })
  }

  const emailTemplate = (subject: string, body: string) =>
    `Subject: ${subject}\n\nDear ${applicant.name},\n\n${body}\n\nKind regards,\nAdmissions Team`

  const prompt = STAGE_PROMPTS[applicant.status]

  if (applicant.status === 'enrolled') {
    return (
      <div className="bg-green-50 border border-green-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-green-800">Enrolled</h3>
        </div>
        {applicant.enrolledDate && (
          <p className="text-xs text-green-600">Enrolled on {safeFormat(applicant.enrolledDate, 'dd MMM yyyy')}</p>
        )}
      </div>
    )
  }

  if (applicant.status === 'rejected') {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-red-800">Application Declined</h3>
        </div>
        {applicant.rejectionReason && <p className="text-xs text-red-600 mt-1">{applicant.rejectionReason}</p>}
        <Button onClick={() => act({ status: 'interviewed' })} size="sm" variant="ghost"
          className="mt-3 text-xs text-gray-500 hover:text-gray-700 h-7 px-2">
          Reconsider applicant
        </Button>
      </div>
    )
  }

  if (applicant.status === 'deferred') {
    return (
      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-yellow-600" />
          <h3 className="text-sm font-semibold text-yellow-800">Deferred</h3>
        </div>
        {applicant.deferralReason && <p className="text-xs text-yellow-700 mt-1">{applicant.deferralReason}</p>}
        <Button onClick={() => act({ status: 'interviewed' })} size="sm" variant="ghost"
          className="mt-3 text-xs text-gray-500 h-7 px-2">Reconsider</Button>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
        {/* Plain-English next step guidance */}
        {prompt && (
          <div className="mb-4 pb-4 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-900 mb-0.5">{prompt.heading}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{prompt.guidance}</p>
          </div>
        )}

        {applicant.status === 'applied' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">Assessment date &amp; time</label>
              <input type="datetime-local" value={assessmentDate}
                onChange={e => setAssessmentDate(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF]" />
            </div>
            <Button disabled={!assessmentDate || saving}
              onClick={() => act({ status: 'assessment_scheduled', assessmentDate })}
              className="w-full bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm rounded-lg gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              Schedule Assessment
            </Button>
            {assessmentDate && (
              <button onClick={() => onCopyEmail(
                emailTemplate(
                  'Your Assessment Invitation',
                  `Thank you for applying to our college. We are pleased to invite you to attend an assessment.\n\nDate & Time: ${safeFormat(assessmentDate, 'EEEE d MMMM yyyy \'at\' HH:mm')}\nLocation: Please arrive at reception 10 minutes before your assessment.\n\nThe assessment covers English and Mathematics and takes approximately 30–45 minutes. Please bring a form of photo ID.`
                )
              )} className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1.5 transition-colors">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                Copy assessment invitation email
              </button>
            )}
            <div className="border-t border-gray-50 pt-3">
              <Button
                onClick={() => askConfirm(
                  `Decline ${applicant.name}?`,
                  'Their application will be declined. You can reconsider this at any time if circumstances change.',
                  'Yes, decline',
                  'bg-red-600 hover:bg-red-700 text-white',
                  () => act({ status: 'rejected', rejectionReason: 'Did not meet initial criteria' })
                )}
                variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 h-7 text-xs">
                Decline application
              </Button>
            </div>
          </div>
        )}

        {applicant.status === 'assessment_scheduled' && (
          <div className="space-y-3">
            {applicant.assessmentDate && (
              <div className="bg-blue-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600 flex-none" />
                <p className="text-xs text-blue-700 font-medium">
                  {safeFormat(applicant.assessmentDate, 'EEE d MMM yyyy \'at\' HH:mm')}
                </p>
              </div>
            )}
            <Button onClick={() => act({ status: 'assessment_done' })} disabled={saving}
              className="w-full bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm rounded-lg gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Mark Assessment Complete
            </Button>
            <Button
              onClick={() => askConfirm(
                `${applicant.name} did not attend?`,
                'This will decline their application due to non-attendance. You can reconsider later.',
                'Yes, mark as no-show',
                'bg-red-600 hover:bg-red-700 text-white',
                () => act({ status: 'rejected', rejectionReason: 'Did not attend assessment' })
              )}
              variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 h-7 text-xs">
              Did not attend
            </Button>
          </div>
        )}

        {applicant.status === 'assessment_done' && (
          <div className="space-y-3">
            {/* Assessment score summary */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-[0.625rem] text-gray-400 font-medium uppercase tracking-wide">English</p>
                <p className="text-lg font-bold text-gray-900">{applicant.assessmentEnglishScore ?? '-'}<span className="text-xs font-normal text-gray-400">/10</span></p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-[0.625rem] text-gray-400 font-medium uppercase tracking-wide">Math</p>
                <p className="text-lg font-bold text-gray-900">{applicant.assessmentMathScore ?? '-'}<span className="text-xs font-normal text-gray-400">/10</span></p>
              </div>
            </div>

            {/* Inline AI recommendation */}
            {aiScore !== null ? (
              <div className="bg-indigo-50 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[0.6875rem] font-semibold text-indigo-700 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> AI Recommendation
                  </p>
                  <span className="text-sm font-bold text-indigo-900">{aiScore}/100</span>
                </div>
                {aiTopMatch && (
                  <p className="text-xs text-indigo-600">Best match: {aiTopMatch.course_name}</p>
                )}
              </div>
            ) : (
              <Button onClick={onRunAI} disabled={aiLoading}
                className="w-full bg-indigo-50 hover:bg-indigo-100 text-[#473FCF] h-9 text-sm rounded-lg gap-1.5 border border-indigo-100">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                {aiLoading ? 'Analysing…' : 'Get AI Course Recommendation'}
              </Button>
            )}

            <Button onClick={() => act({ status: 'course_matched' })}
              disabled={saving} className="w-full bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm rounded-lg gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Confirm Course &amp; Continue
            </Button>
            <Button
              onClick={() => askConfirm(
                `Decline ${applicant.name}?`,
                'Scores are insufficient for this course. Their application will be declined.',
                'Yes, decline',
                'bg-red-600 hover:bg-red-700 text-white',
                () => act({ status: 'rejected', rejectionReason: 'Assessment scores insufficient' })
              )}
              variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 h-7 text-xs">
              Scores insufficient: decline
            </Button>
          </div>
        )}

        {applicant.status === 'course_matched' && (
          <div className="space-y-3">
            {applicant.matchedCourseId && courses.find(c => c.course.id === applicant.matchedCourseId) && (
              <div className="bg-violet-50 rounded-lg px-3 py-2 text-xs text-violet-700 font-medium">
                {courses.find(c => c.course.id === applicant.matchedCourseId)?.course.name}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 font-medium">Interview date &amp; time</label>
              <input type="datetime-local" value={interviewDate}
                onChange={e => setInterviewDate(e.target.value)}
                className="mt-1 w-full h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#473FCF]" />
            </div>
            <Button disabled={!interviewDate || saving}
              onClick={() => act({ status: 'interview_scheduled', interviewDate })}
              className="w-full bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm rounded-lg gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
              Schedule Interview
            </Button>
            {interviewDate && (
              <button onClick={() => onCopyEmail(
                emailTemplate(
                  'Interview Invitation',
                  `Following your recent assessment, we are pleased to invite you to attend an interview for your course.\n\nDate & Time: ${safeFormat(interviewDate, 'EEEE d MMMM yyyy \'at\' HH:mm')}\nCourse: ${courses.find(c => c.course.id === applicant.matchedCourseId)?.course.name || 'TBC'}\n\nPlease bring any relevant certificates or qualifications. This interview usually takes 20–30 minutes.`
                )
              )} className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 py-1.5 transition-colors">
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                Copy interview invitation email
              </button>
            )}
          </div>
        )}

        {applicant.status === 'interview_scheduled' && (
          <div className="space-y-3">
            {applicant.interviewDate && (
              <div className="bg-amber-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-600 flex-none" />
                <p className="text-xs text-amber-700 font-medium">
                  {safeFormat(applicant.interviewDate, 'EEE d MMM yyyy \'at\' HH:mm')}
                </p>
              </div>
            )}
            <Button onClick={() => act({ status: 'interviewed' })} disabled={saving}
              className="w-full bg-[#473FCF] hover:bg-[#3935B8] text-white h-9 text-sm rounded-lg gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Mark as Interviewed
            </Button>
            <Button
              onClick={() => askConfirm(
                `${applicant.name} did not attend?`,
                'This will decline their application due to non-attendance at the interview.',
                'Yes, mark as no-show',
                'bg-red-600 hover:bg-red-700 text-white',
                () => act({ status: 'rejected', rejectionReason: 'Did not attend interview' })
              )}
              variant="ghost" size="sm" className="w-full text-red-400 hover:text-red-600 hover:bg-red-50 h-7 text-xs">
              Did not attend
            </Button>
          </div>
        )}

        {applicant.status === 'interviewed' && (
          <div className="space-y-3">
            {/* Primary action: Enrol */}
            <Button
              onClick={() => askConfirm(
                `Enrol ${applicant.name}?`,
                `They will be enrolled on ${courses.find(c => c.course.id === applicant.matchedCourseId)?.course.name || 'their course'}. This will mark their application as complete.`,
                'Yes, enrol',
                'bg-green-600 hover:bg-green-700 text-white',
                () => act({ status: 'enrolled', enrolledDate: new Date().toISOString() })
              )}
              disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white h-9 text-sm rounded-lg gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Enrol on Course
            </Button>

            {/* Secondary: Defer */}
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <label className="text-xs text-gray-500 font-medium">Defer reason</label>
              <input type="text" placeholder="e.g. Needs Level 2 first, try again in September"
                value={deferralReason} onChange={e => setDeferralReason(e.target.value)}
                className="w-full h-8 rounded-lg border border-gray-200 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" />
              <Button
                onClick={() => {
                  if (deferralReason) askConfirm(
                    `Defer ${applicant.name}?`,
                    `Reason: "${deferralReason}". They will be marked as deferred and you can reconsider later.`,
                    'Yes, defer',
                    'bg-amber-500 hover:bg-amber-600 text-white',
                    () => act({ status: 'deferred', deferralReason })
                  )
                }}
                disabled={!deferralReason || saving} variant="ghost" size="sm"
                className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 text-xs border border-amber-200">
                Defer to later intake
              </Button>
            </div>

            {/* Tertiary: Reject */}
            <div className="border border-gray-100 rounded-lg p-3 space-y-2">
              <label className="text-xs text-gray-500 font-medium">Decline reason</label>
              <select value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                className="w-full h-8 rounded-lg border border-gray-200 px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400 bg-white">
                <option value="">Select reason…</option>
                {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <Button
                onClick={() => {
                  if (rejectionReason) askConfirm(
                    `Decline ${applicant.name}?`,
                    `Reason: "${rejectionReason}". This will decline their application.`,
                    'Yes, decline',
                    'bg-red-600 hover:bg-red-700 text-white',
                    () => act({ status: 'rejected', rejectionReason })
                  )
                }}
                disabled={!rejectionReason || saving} variant="ghost" size="sm"
                className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs border border-red-200">
                Decline application
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation dialog overlay */}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        description={confirm?.description ?? ''}
        confirmLabel={confirm?.label ?? ''}
        confirmCls={confirm?.cls}
        onConfirm={() => {
          confirm?.action()
          setConfirm(null)
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
