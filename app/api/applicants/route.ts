import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants, courses } from '@/drizzle/schema'
import { eq, and, ilike, or, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const url = new URL(request.url)
  const search = url.searchParams.get('search')
  const status = url.searchParams.get('status')
  const courseId = url.searchParams.get('courseId')

  const conditions = [eq(applicants.orgId, orgId)]

  if (search) {
    conditions.push(or(
      ilike(applicants.name, `%${search}%`),
      ilike(applicants.email, `%${search}%`)
    )!)
  }

  if (status) {
    conditions.push(eq(applicants.status, status))
  }

  if (courseId) {
    conditions.push(eq(applicants.matchedCourseId, courseId))
  }

  const results = await db.select({
    applicant: applicants,
    courseName: courses.name,
  })
    .from(applicants)
    .leftJoin(courses, eq(applicants.matchedCourseId, courses.id))
    .where(and(...conditions))
    .orderBy(sql`${applicants.createdAt} desc`)

  return NextResponse.json(results)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const body = await request.json()
  const { name, email, phone } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const [applicant] = await db.insert(applicants).values({
    id: uuidv4(),
    orgId,
    name,
    email,
    phone: phone || null,
    status: 'applied',
  }).returning()

  return NextResponse.json(applicant, { status: 201 })
}
