import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants, applicantEvents } from '@/drizzle/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId
  // Verify applicant belongs to org
  const [app] = await db.select().from(applicants)
    .where(and(eq(applicants.id, params.id), eq(applicants.orgId, orgId))).limit(1)
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const events = await db.select().from(applicantEvents)
    .where(eq(applicantEvents.applicantId, params.id))
    .orderBy(desc(applicantEvents.createdAt))
    .limit(50)
  return NextResponse.json(events)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const { eventType, fromValue, toValue, metadata } = await request.json()
  const { v4: uuidv4 } = await import('uuid')
  const event = await db.insert(applicantEvents).values({
    id: uuidv4(),
    applicantId: params.id,
    actorId: session.id,
    actorName: session.name,
    eventType,
    fromValue,
    toValue,
    metadata,
  }).returning()
  return NextResponse.json(event[0])
}
