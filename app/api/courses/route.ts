import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, courses, applicants } from '@/drizzle/schema'
import { eq, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const result = await db.select({
    course: courses,
    applicantCount: sql<number>`count(${applicants.id})::int`,
  })
    .from(courses)
    .leftJoin(applicants, eq(applicants.matchedCourseId, courses.id))
    .where(eq(courses.orgId, orgId))
    .groupBy(courses.id)
    .orderBy(sql`${courses.createdAt} desc`)

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const { name, level, description, requirements, capacity } = await request.json()

  if (!name || !level || !description || !requirements) {
    return NextResponse.json({ error: 'All fields required' }, { status: 400 })
  }

  const [course] = await db.insert(courses).values({
    id: uuidv4(),
    orgId,
    name,
    level,
    description,
    requirements,
    capacity: capacity || null,
  }).returning()

  return NextResponse.json(course, { status: 201 })
}
