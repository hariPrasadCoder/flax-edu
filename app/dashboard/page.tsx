import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { orgMembers, applicants, courses } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { StatusPill } from '@/components/status-pill'
import { APPLICANT_STATUSES, ACTIVE_STAGES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import {
  UserPlus, Users, UserCheck, Clock, Sparkles,
  ArrowRight, AlertCircle, Calendar, Zap,
} from 'lucide-react'
import { format, formatDistanceToNow, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

async function getDashboardData(orgId: string) {
  const [allApplicants, allCourses] = await Promise.all([
    db.select().from(applicants).where(eq(applicants.orgId, orgId)),
    db.select().from(courses).where(eq(courses.orgId, orgId)),
  ])

  const statusCounts: Record<string, number> = {}
  APPLICANT_STATUSES.forEach(s => { statusCounts[s.value] = 0 })
  allApplicants.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1 })
  const total = allApplicants.length

  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
  const enrolledThisMonth = allApplicants.filter(a =>
    a.status === 'enrolled' && a.enrolledDate && new Date(a.enrolledDate) >= startOfMonth
  ).length

  const withAiScore = allApplicants.filter(a => a.aiSuitabilityScore !== null)
  const avgAiScore = withAiScore.length > 0
    ? Math.round(withAiScore.reduce((s, a) => s + (a.aiSuitabilityScore || 0), 0) / withAiScore.length)
    : null

  // Upcoming assessments & interviews (next 7 days)
  const now = new Date()
  const in7 = addDays(now, 7)
  const upcomingAssessments = allApplicants.filter(a =>
    a.assessmentDate && new Date(a.assessmentDate) >= now && new Date(a.assessmentDate) <= in7
  ).sort((a, b) => new Date(a.assessmentDate!).getTime() - new Date(b.assessmentDate!).getTime())

  const upcomingInterviews = allApplicants.filter(a =>
    a.interviewDate && new Date(a.interviewDate) >= now && new Date(a.interviewDate) <= in7
  ).sort((a, b) => new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime())

  // Needs attention: active applicants with no status change in >5 days
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
  const needsAttention = allApplicants.filter(a =>
    ACTIVE_STAGES.includes(a.status as typeof ACTIVE_STAGES[number]) &&
    new Date(a.updatedAt) < fiveDaysAgo
  ).sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()).slice(0, 5)

  // Pending AI analysis: have CV but no AI score
  const pendingAI = allApplicants.filter(a => a.cvText && !a.aiSuitabilityScore).length

  // Today's focus tasks
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)
  const todayAssessments = allApplicants
    .filter(a => a.assessmentDate && new Date(a.assessmentDate) >= startOfToday && new Date(a.assessmentDate) <= endOfToday)
    .sort((a, b) => new Date(a.assessmentDate!).getTime() - new Date(b.assessmentDate!).getTime())
  const todayInterviews = allApplicants
    .filter(a => a.interviewDate && new Date(a.interviewDate) >= startOfToday && new Date(a.interviewDate) <= endOfToday)
    .sort((a, b) => new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime())
  const awaitingDecision = allApplicants.filter(a => a.status === 'interviewed')
  const pendingScores = allApplicants.filter(a =>
    a.status === 'assessment_done' && (a.assessmentEnglishScore === null || a.assessmentMathScore === null)
  )

  // Recent activity
  const recent = [...allApplicants]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)

  // Conversion rates (% reaching each stage from applied)
  const conversionRates = APPLICANT_STATUSES
    .filter(s => !['deferred', 'rejected'].includes(s.value))
    .map((status) => {
      const count = statusCounts[status.value] || 0
      return {
        status: status.value,
        label: status.label,
        count,
        rate: total > 0 ? Math.round((count / total) * 100) : 0,
        dot: status.dot,
      }
    })

  const courseCount = allCourses.length
  const isNew = total === 0 && courseCount === 0

  return {
    total, enrolledThisMonth, avgAiScore, statusCounts,
    pendingInterviews: statusCounts['interview_scheduled'] || 0,
    upcomingAssessments, upcomingInterviews, needsAttention, pendingAI,
    recent, conversionRates, allCourses, courseCount, isNew,
    todayAssessments, todayInterviews, awaitingDecision, pendingScores,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth/sign-in')
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) redirect('/auth/sign-in')
  const orgId = member[0].orgId
  const data = await getDashboardData(orgId)

  const statCards = [
    { label: 'Total Applicants', value: data.total, icon: Users, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: 'Enrolled This Month', value: data.enrolledThisMonth, icon: UserCheck, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Pending Interviews', value: data.pendingInterviews, icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { label: 'Avg AI Match Score', value: data.avgAiScore !== null ? data.avgAiScore : 'N/A', suffix: data.avgAiScore !== null ? '/100' : undefined, icon: Sparkles, iconBg: 'bg-indigo-50', iconColor: 'text-[#473FCF]' },
  ]

  if (data.isNew) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[1.75rem] font-serif font-bold text-gray-900 leading-tight">Dashboard</h1>
            <p className="text-gray-400 mt-0.5 text-sm">Overview of your admissions pipeline</p>
          </div>
          <Link href="/dashboard/applicants/new">
            <Button className="bg-[#473FCF] hover:bg-[#3935B8] text-white gap-2 h-9 text-sm font-medium rounded-lg">
              <UserPlus className="w-4 h-4" /> Add Applicant
            </Button>
          </Link>
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-[#473FCF]" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Get started with Flax</h2>
          <p className="text-gray-400 text-sm mt-1.5 max-w-sm mx-auto">Set up your courses first so the AI can match applicants to the right programme.</p>
          <div className="mt-8 max-w-sm mx-auto space-y-2 text-left">
            {[
              { n: 1, done: data.courseCount > 0, href: '/dashboard/courses', label: 'Add your courses' },
              { n: 2, done: data.total > 0, href: '/dashboard/applicants/new', label: 'Add your first applicant' },
              { n: 3, done: false, href: '/dashboard/settings', label: 'Share your public application form' },
            ].map(step => (
              <Link key={step.n} href={step.href}
                className={cn('flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  step.done ? 'border-green-100 bg-green-50 pointer-events-none' : 'border-[#E5E7EB] hover:border-indigo-200 hover:bg-indigo-50 group'
                )}>
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-none',
                  step.done ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-[#473FCF] group-hover:bg-indigo-100'
                )}>
                  {step.done ? '✓' : step.n}
                </div>
                <span className={cn('text-sm font-medium', step.done ? 'text-green-700 line-through' : 'text-gray-700 group-hover:text-[#473FCF]')}>
                  {step.label}
                </span>
                {!step.done && <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-[#473FCF] transition-colors" />}
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.75rem] font-serif font-bold text-gray-900 leading-tight">Dashboard</h1>
          <p className="text-gray-400 mt-0.5 text-sm">Overview of your admissions pipeline</p>
        </div>
        <Link href="/dashboard/applicants/new">
          <Button className="bg-[#473FCF] hover:bg-[#3935B8] text-white gap-2 h-9 text-sm font-medium rounded-lg">
            <UserPlus className="w-4 h-4" /> Add Applicant
          </Button>
        </Link>
      </div>

      {/* Today's Focus */}
      {(data.todayAssessments.length > 0 || data.todayInterviews.length > 0 || data.awaitingDecision.length > 0 || data.pendingScores.length > 0) && (() => {
        const focusCategories = [
          data.todayAssessments.length > 0 ? 'assessments' : null,
          data.todayInterviews.length > 0 ? 'interviews' : null,
          data.awaitingDecision.length > 0 ? 'decision' : null,
          data.pendingScores.length > 0 ? 'scores' : null,
        ].filter(Boolean)
        return (
          <div className="mb-5 bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-[#473FCF] rounded-lg flex items-center justify-center flex-none">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Your focus today</h2>
              <span className="text-[0.625rem] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full ml-auto">
                {format(new Date(), 'EEEE d MMMM')}
              </span>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${focusCategories.length}, 1fr)` }}>
              {data.todayAssessments.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-[0.6875rem] font-semibold text-blue-700 mb-2">
                    {data.todayAssessments.length} assessment{data.todayAssessments.length !== 1 ? 's' : ''} today
                  </p>
                  <div className="space-y-1">
                    {data.todayAssessments.slice(0, 4).map(a => (
                      <Link key={a.id} href={`/dashboard/applicants/${a.id}`}
                        className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium truncate hover:underline">
                        {a.name}
                        {a.assessmentDate && <span className="font-normal text-blue-400 ml-auto shrink-0">{format(new Date(a.assessmentDate), 'HH:mm')}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {data.todayInterviews.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-[0.6875rem] font-semibold text-amber-700 mb-2">
                    {data.todayInterviews.length} interview{data.todayInterviews.length !== 1 ? 's' : ''} today
                  </p>
                  <div className="space-y-1">
                    {data.todayInterviews.slice(0, 4).map(a => (
                      <Link key={a.id} href={`/dashboard/applicants/${a.id}`}
                        className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium truncate hover:underline">
                        {a.name}
                        {a.interviewDate && <span className="font-normal text-amber-400 ml-auto shrink-0">{format(new Date(a.interviewDate), 'HH:mm')}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {data.awaitingDecision.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="text-[0.6875rem] font-semibold text-orange-700 mb-2">
                    {data.awaitingDecision.length} awaiting your decision
                  </p>
                  <div className="space-y-1">
                    {data.awaitingDecision.slice(0, 4).map(a => (
                      <Link key={a.id} href={`/dashboard/applicants/${a.id}`}
                        className="block text-xs text-orange-700 hover:text-orange-900 font-medium truncate hover:underline">
                        {a.name}
                      </Link>
                    ))}
                    {data.awaitingDecision.length > 4 && (
                      <p className="text-[0.5625rem] text-orange-400">+{data.awaitingDecision.length - 4} more</p>
                    )}
                  </div>
                </div>
              )}
              {data.pendingScores.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-3">
                  <p className="text-[0.6875rem] font-semibold text-indigo-700 mb-2">
                    {data.pendingScores.length} need scores entered
                  </p>
                  <div className="space-y-1">
                    {data.pendingScores.slice(0, 4).map(a => (
                      <Link key={a.id} href={`/dashboard/applicants/${a.id}`}
                        className="block text-xs text-indigo-700 hover:text-indigo-900 font-medium truncate hover:underline">
                        {a.name}
                      </Link>
                    ))}
                    {data.pendingScores.length > 4 && (
                      <p className="text-[0.5625rem] text-indigo-400">+{data.pendingScores.length - 4} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', card.iconBg)}>
                <Icon className={cn('w-[1.125rem] h-[1.125rem]', card.iconColor)} />
              </div>
              <div className="mt-3.5">
                <div className="flex items-baseline gap-1">
                  <span className="text-[1.875rem] font-bold text-gray-900 tabular-nums leading-none">{card.value}</span>
                  {card.suffix && <span className="text-xs text-gray-400">{card.suffix}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1.5 font-medium">{card.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Needs attention + Upcoming */}
      {(data.needsAttention.length > 0 || data.upcomingAssessments.length > 0 || data.upcomingInterviews.length > 0) && (
        <div className={cn('grid gap-4 mb-5', data.needsAttention.length > 0 ? 'grid-cols-3' : 'grid-cols-1')}>
          {data.needsAttention.length > 0 && (
            <div className="col-span-2 bg-white border border-amber-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-900">Needs Attention</h2>
                <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium ml-auto">
                  {data.needsAttention.length} stuck &gt;5 days
                </span>
              </div>
              <div className="space-y-2">
                {data.needsAttention.map(a => (
                  <Link key={a.id} href={`/dashboard/applicants/${a.id}`}
                    className="flex items-center gap-3 py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-amber-50 transition-colors group">
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[0.5625rem] font-bold flex-none">
                      {a.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate group-hover:text-amber-700">{a.name}</p>
                      <p className="text-[0.5625rem] text-gray-400">{formatDistanceToNow(new Date(a.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <StatusPill status={a.status} className="text-[0.5625rem]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(data.upcomingAssessments.length > 0 || data.upcomingInterviews.length > 0) && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-[#473FCF]" />
                <h2 className="text-sm font-semibold text-gray-900">This Week</h2>
                <span className="text-[0.625rem] text-gray-400 ml-auto">
                  {data.upcomingAssessments.length + data.upcomingInterviews.length} scheduled
                </span>
              </div>
              {/* Full-width: 2-column grid. Narrow (with Needs Attention): single list */}
              <div className={cn(
                data.needsAttention.length === 0
                  ? 'grid grid-cols-2 gap-x-8 gap-y-1'
                  : 'space-y-2'
              )}>
                {[
                  ...data.upcomingAssessments.slice(0, 4).map(a => ({ ...a, type: 'Assessment' as const, date: a.assessmentDate, dot: 'bg-blue-500' })),
                  ...data.upcomingInterviews.slice(0, 4).map(a => ({ ...a, type: 'Interview' as const, date: a.interviewDate, dot: 'bg-amber-500' })),
                ]
                  .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
                  .map(a => (
                    <Link key={`${a.type}-${a.id}`} href={`/dashboard/applicants/${a.id}`}
                      className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className={cn('w-1.5 h-1.5 rounded-full flex-none', a.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 truncate group-hover:text-[#473FCF]">{a.name}</p>
                        <p className="text-[0.5625rem] text-gray-400">
                          {a.type} · {a.date ? format(new Date(a.date), 'EEE d MMM · HH:mm') : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                {data.upcomingAssessments.length === 0 && data.upcomingInterviews.length === 0 && (
                  <p className="text-xs text-gray-300">Nothing scheduled this week</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline + Recent */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white border border-[#E5E7EB] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Pipeline overview</h2>
            {data.pendingAI > 0 && (
              <span className="text-[0.625rem] bg-indigo-50 text-[#473FCF] px-2 py-0.5 rounded-full font-medium">
                {data.pendingAI} pending AI analysis
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {APPLICANT_STATUSES.map(status => {
              const count = data.statusCounts[status.value] || 0
              const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0
              return (
                <div key={status.value} className="flex items-center gap-3">
                  <div className={cn('w-1.5 h-1.5 rounded-full flex-none', status.dot)} />
                  <div className="w-36 text-xs text-gray-500 truncate">{status.label}</div>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#473FCF] rounded-full transition-all" style={{ width: `${pct}%`, opacity: count > 0 ? 1 : 0 }} />
                  </div>
                  <div className="w-7 text-xs text-gray-400 text-right tabular-nums font-medium">{count}</div>
                  {pct > 0 && <div className="w-8 text-[0.5625rem] text-gray-300 tabular-nums">{pct}%</div>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
            <Link href="/dashboard/applicants" className="text-xs text-[#473FCF] hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="text-xs text-gray-300 mt-2">No applicants yet</p>
          ) : (
            <div className="space-y-1">
              {data.recent.map(applicant => {
                const initials = applicant.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                return (
                  <Link key={applicant.id} href={`/dashboard/applicants/${applicant.id}`}
                    className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 text-[#473FCF] flex items-center justify-center text-[0.5rem] font-bold flex-none">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate group-hover:text-[#473FCF] transition-colors">{applicant.name}</p>
                      <p className="text-[0.5625rem] text-gray-400">{formatDistanceToNow(new Date(applicant.updatedAt), { addSuffix: true })}</p>
                    </div>
                    <StatusPill status={applicant.status} className="text-[0.5625rem] py-0.5 px-1.5 flex-none" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
