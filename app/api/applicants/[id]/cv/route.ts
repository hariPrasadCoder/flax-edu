import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const [applicant] = await db.select({ cvData: applicants.cvData, name: applicants.name })
    .from(applicants)
    .where(and(eq(applicants.id, params.id), eq(applicants.orgId, orgId)))
    .limit(1)

  if (!applicant?.cvData) return NextResponse.json({ error: 'No CV found' }, { status: 404 })

  const buffer = Buffer.from(applicant.cvData, 'base64')
  const filename = `${applicant.name.replace(/\s+/g, '-')}-CV.pdf`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
