import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants, courses } from '@/drizzle/schema'
import { eq, sql } from 'drizzle-orm'
import { format } from 'date-fns'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const rows = await db.select({
    applicant: applicants,
    courseName: courses.name,
  })
  .from(applicants)
  .leftJoin(courses, eq(applicants.matchedCourseId, courses.id))
  .where(eq(applicants.orgId, orgId))
  .orderBy(sql`${applicants.createdAt} desc`)

  const headers = [
    'Name', 'Email', 'Phone', 'Status', 'Source', 'Applied Date',
    'Assessment Date', 'English Score', 'Math Score',
    'Interview Date', 'Matched Course', 'AI Score', 'Rejection Reason', 'Notes'
  ]

  const csvRows = rows.map(({ applicant: a, courseName }) => [
    `"${a.name}"`,
    `"${a.email}"`,
    `"${a.phone || ''}"`,
    `"${a.status}"`,
    `"${a.source || ''}"`,
    `"${format(new Date(a.createdAt), 'dd/MM/yyyy')}"`,
    `"${a.assessmentDate ? format(new Date(a.assessmentDate), 'dd/MM/yyyy HH:mm') : ''}"`,
    `"${a.assessmentEnglishScore ?? ''}"`,
    `"${a.assessmentMathScore ?? ''}"`,
    `"${a.interviewDate ? format(new Date(a.interviewDate), 'dd/MM/yyyy HH:mm') : ''}"`,
    `"${courseName || ''}"`,
    `"${a.aiSuitabilityScore ?? ''}"`,
    `"${a.rejectionReason || a.deferralReason || ''}"`,
    `"${(a.notes || '').replace(/"/g, '""')}"`,
  ].join(','))

  const csv = [headers.join(','), ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="applicants-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
    },
  })
}
