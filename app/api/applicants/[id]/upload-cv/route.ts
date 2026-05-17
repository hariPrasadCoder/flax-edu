import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants, applicantEvents } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const [applicant] = await db.select().from(applicants)
    .where(and(eq(applicants.id, params.id), eq(applicants.orgId, orgId)))
    .limit(1)
  if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Only PDF files accepted' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const cvData = Buffer.from(bytes).toString('base64')

  await db.update(applicants)
    .set({ cvData, cvUrl: null, cvText: null, updatedAt: new Date() })
    .where(eq(applicants.id, params.id))

  await db.insert(applicantEvents).values({
    id: uuidv4(),
    applicantId: params.id,
    actorId: session.id,
    actorName: session.name,
    eventType: 'cv_uploaded',
    toValue: file.name,
  })

  return NextResponse.json({ success: true })
}
