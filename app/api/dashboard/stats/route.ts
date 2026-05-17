import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants } from '@/drizzle/schema'
import { eq, and, sql, gte } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  // Count by status
  const statusCounts = await db
    .select({ status: applicants.status, count: sql<number>`count(*)::int` })
    .from(applicants)
    .where(eq(applicants.orgId, orgId))
    .groupBy(applicants.status)

  const counts: Record<string, number> = {}
  statusCounts.forEach(r => { counts[r.status] = r.count })

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  // Enrolled this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const enrolledThisMonth = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applicants)
    .where(and(
      eq(applicants.orgId, orgId),
      eq(applicants.status, 'enrolled'),
      gte(applicants.updatedAt, startOfMonth)
    ))

  // Average AI score
  const avgScore = await db
    .select({ avg: sql<number>`round(avg(ai_suitability_score))` })
    .from(applicants)
    .where(and(
      eq(applicants.orgId, orgId),
      sql`ai_suitability_score is not null`
    ))

  // Recent applicants (last 10)
  const recent = await db
    .select()
    .from(applicants)
    .where(eq(applicants.orgId, orgId))
    .orderBy(sql`updated_at desc`)
    .limit(10)

  return NextResponse.json({
    total,
    enrolledThisMonth: enrolledThisMonth[0]?.count || 0,
    pendingInterviews: counts['interview_scheduled'] || 0,
    avgAiScore: avgScore[0]?.avg || null,
    statusCounts: counts,
    recentApplicants: recent,
  })
}
