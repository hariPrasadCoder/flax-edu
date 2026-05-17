import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants, courses, applicantEvents, organisations } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import {
  sendAssessmentInvite,
  sendInterviewInvite,
  sendEnrolmentConfirmation,
  sendApplicationDeclined,
} from '@/lib/email'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId
  const result = await db.select({ applicant: applicants, courseName: courses.name })
    .from(applicants)
    .leftJoin(courses, eq(applicants.matchedCourseId, courses.id))
    .where(and(eq(applicants.id, params.id), eq(applicants.orgId, orgId)))
    .limit(1)
  if (!result[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result[0])
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const [existing] = await db.select().from(applicants)
    .where(and(eq(applicants.id, params.id), eq(applicants.orgId, orgId)))
    .limit(1)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const allowedFields = [
    'status', 'notes', 'phone', 'assessmentEnglishScore', 'assessmentMathScore',
    'matchedCourseId', 'assessmentDate', 'interviewDate', 'rejectionReason',
    'deferralReason', 'source', 'enrolledDate', 'interestedCourseId', 'aiSuitabilityScore',
    'aiSuitabilitySummary', 'aiMatchedCourses',
  ]
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  if (updates.assessmentDate) updates.assessmentDate = new Date(updates.assessmentDate as string)
  if (updates.interviewDate) updates.interviewDate = new Date(updates.interviewDate as string)
  if (updates.enrolledDate) updates.enrolledDate = new Date(updates.enrolledDate as string)

  const [updated] = await db.update(applicants)
    .set(updates)
    .where(and(eq(applicants.id, params.id), eq(applicants.orgId, orgId)))
    .returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Log events
  const eventsToLog = []
  const newStatus = updates.status as string | undefined
  if (newStatus && existing.status !== newStatus) {
    eventsToLog.push({
      id: uuidv4(), applicantId: params.id, actorId: session.id, actorName: session.name,
      eventType: 'status_changed', fromValue: existing.status, toValue: newStatus,
    })
  }
  if (updates.assessmentDate && !existing.assessmentDate) {
    eventsToLog.push({
      id: uuidv4(), applicantId: params.id, actorId: session.id, actorName: session.name,
      eventType: 'assessment_scheduled',
      toValue: (updates.assessmentDate as Date).toISOString(),
    })
  }
  if (updates.interviewDate && !existing.interviewDate) {
    eventsToLog.push({
      id: uuidv4(), applicantId: params.id, actorId: session.id, actorName: session.name,
      eventType: 'interview_scheduled',
      toValue: (updates.interviewDate as Date).toISOString(),
    })
  }
  if (updates.assessmentEnglishScore !== undefined || updates.assessmentMathScore !== undefined) {
    eventsToLog.push({
      id: uuidv4(), applicantId: params.id, actorId: session.id, actorName: session.name,
      eventType: 'scores_recorded',
      metadata: { english: updates.assessmentEnglishScore, math: updates.assessmentMathScore },
    })
  }
  if (eventsToLog.length > 0) {
    await db.insert(applicantEvents).values(eventsToLog)
  }

  // Trigger automated emails on status transitions
  if (newStatus && newStatus !== existing.status) {
    const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId)).limit(1)
    const orgName = org?.name || 'Your College'
    const emailApplicant = { id: updated.id, name: updated.name, email: updated.email }

    if (newStatus === 'assessment_scheduled' && updated.assessmentDate) {
      sendAssessmentInvite(emailApplicant, new Date(updated.assessmentDate), orgName).catch(console.error)
    } else if (newStatus === 'interview_scheduled' && updated.interviewDate) {
      let courseName = 'your course'
      if (updated.matchedCourseId) {
        const [course] = await db.select().from(courses).where(eq(courses.id, updated.matchedCourseId)).limit(1)
        courseName = course?.name || 'your course'
      }
      sendInterviewInvite(emailApplicant, new Date(updated.interviewDate), courseName, orgName).catch(console.error)
    } else if (newStatus === 'enrolled') {
      let courseName = 'your course'
      if (updated.matchedCourseId) {
        const [course] = await db.select().from(courses).where(eq(courses.id, updated.matchedCourseId)).limit(1)
        courseName = course?.name || 'your course'
      }
      sendEnrolmentConfirmation(emailApplicant, courseName, orgName).catch(console.error)
    } else if (newStatus === 'rejected') {
      sendApplicationDeclined(emailApplicant, updated.rejectionReason || '', orgName).catch(console.error)
    }
  }

  return NextResponse.json(updated)
}
