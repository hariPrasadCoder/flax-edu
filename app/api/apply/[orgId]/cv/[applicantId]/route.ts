import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { applicants } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(
  request: Request,
  { params }: { params: { orgId: string; applicantId: string } }
) {
  const [applicant] = await db.select().from(applicants)
    .where(and(eq(applicants.id, params.applicantId), eq(applicants.orgId, params.orgId)))
    .limit(1)
  if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF required' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const cvData = Buffer.from(bytes).toString('base64')

  await db.update(applicants)
    .set({ cvData, cvUrl: null, cvText: null, updatedAt: new Date() })
    .where(eq(applicants.id, params.applicantId))

  return NextResponse.json({ success: true })
}
