import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants, organisations, applicantEvents } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { sendStatusChaser } from '@/lib/email'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const [applicant] = await db.select().from(applicants)
    .where(and(eq(applicants.id, params.id), eq(applicants.orgId, orgId)))
    .limit(1)
  if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId)).limit(1)
  const orgName = org?.name || 'Your College'

  await sendStatusChaser({ id: applicant.id, name: applicant.name, email: applicant.email }, orgName)

  await db.insert(applicantEvents).values({
    id: uuidv4(),
    applicantId: params.id,
    actorId: session.id,
    actorName: session.name,
    eventType: 'status_changed',
    fromValue: null,
    toValue: 'chaser_sent',
    metadata: { type: 'chaser_email' },
  })

  await db.update(applicants).set({ updatedAt: new Date() })
    .where(eq(applicants.id, params.id))

  return NextResponse.json({ success: true })
}
