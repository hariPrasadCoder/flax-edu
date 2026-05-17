import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organisations, courses, applicants } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { sendApplicationConfirmation } from '@/lib/email'

export async function GET(request: Request, { params }: { params: { orgId: string } }) {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, params.orgId)).limit(1)
  if (!org) return NextResponse.json({ error: 'College not found' }, { status: 404 })
  const orgCourses = await db.select({
    id: courses.id, name: courses.name, level: courses.level,
  }).from(courses).where(eq(courses.orgId, params.orgId))
  return NextResponse.json({ org: { id: org.id, name: org.name }, courses: orgCourses })
}

export async function POST(request: Request, { params }: { params: { orgId: string } }) {
  const [org] = await db.select().from(organisations).where(eq(organisations.id, params.orgId)).limit(1)
  if (!org) return NextResponse.json({ error: 'College not found' }, { status: 404 })

  const { name, email, phone, interestedCourseId, source, statement } = await request.json()
  if (!name || !email) return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })

  const applicantId = uuidv4()
  const notesText = statement ? `Applicant statement:\n${statement}` : null

  await db.insert(applicants).values({
    id: applicantId,
    orgId: params.orgId,
    name,
    email,
    phone: phone || null,
    status: 'applied',
    source: source || null,
    interestedCourseId: interestedCourseId || null,
    notes: notesText,
  })

  // Send confirmation email + status tracker link
  let courseName = 'your chosen course'
  if (interestedCourseId) {
    const [course] = await db.select().from(courses).where(eq(courses.id, interestedCourseId)).limit(1)
    courseName = course?.name || courseName
  }
  sendApplicationConfirmation(
    { id: applicantId, name, email },
    org.name,
    courseName
  ).catch(console.error)

  return NextResponse.json({ applicantId, success: true }, { status: 201 })
}
