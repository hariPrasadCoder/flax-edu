import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, applicants, courses, applicantEvents } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenced) return fenced[1]
  const obj = text.match(/\{[\s\S]*\}/)
  if (obj) return obj[0]
  return text
}

function findCourse(orgCourses: { id: string; name: string }[], targetName: string) {
  const t = targetName.toLowerCase().trim()
  return (
    orgCourses.find(c => c.name.toLowerCase() === t) ||
    orgCourses.find(c => c.name.toLowerCase().includes(t)) ||
    orgCourses.find(c => t.includes(c.name.toLowerCase()))
  )
}

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const orgCourses = await db.select().from(courses).where(eq(courses.orgId, orgId))
  if (orgCourses.length === 0) return NextResponse.json({ error: 'No courses' }, { status: 400 })

  const allApplicants = await db.select().from(applicants).where(eq(applicants.orgId, orgId))
  const pending = allApplicants.filter(
    r => r.aiSuitabilityScore === null && !['rejected', 'deferred', 'enrolled'].includes(r.status)
  )

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0, total: 0, message: 'All applicants already analysed' })
  }

  const courseList = orgCourses.map(c => `- ${c.name} (${c.level}): ${c.requirements}`).join('\n')
  let processed = 0
  const errors: string[] = []

  for (const applicant of pending) {
    try {
      let pdfBase64: string | null = null
      if (applicant.cvUrl) {
        try {
          const buf = await readFile(join(process.cwd(), 'public', applicant.cvUrl))
          pdfBase64 = buf.toString('base64')
        } catch { /* no pdf on disk */ }
      }

      const promptText = `You are an admissions assistant for a UK Further Education college.
${pdfBase64 ? "The applicant's CV is attached as a PDF. Read it carefully." : applicant.cvText ? `Applicant CV:\n${applicant.cvText}` : 'No CV provided.'}

Assessment Scores:
- English: ${applicant.assessmentEnglishScore !== null ? `${applicant.assessmentEnglishScore}/10` : 'Not yet taken'}
- Maths: ${applicant.assessmentMathScore !== null ? `${applicant.assessmentMathScore}/10` : 'Not yet taken'}

Notes: ${applicant.notes || 'None'}

Available Courses:
${courseList}

Respond ONLY with valid JSON - no prose, no code fences:
{"overall_score":<0-100>,"summary":"2-3 sentences on strengths and concerns","course_matches":[{"course_name":"exact name from list","score":<0-100>,"reason":"one sentence"}]}
Sort course_matches by score descending. Use exact course names.`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userContent: any[] = pdfBase64
        ? [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
            { type: 'text', text: promptText },
          ]
        : [{ type: 'text', text: promptText }]

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: userContent }],
      })

      const block = msg.content[0]
      if (block.type !== 'text') { errors.push(`${applicant.name}: unexpected response type`); continue }

      let parsed: {
        overall_score: number
        summary: string
        course_matches: Array<{ course_name: string; score: number; reason: string }>
      }
      try {
        parsed = JSON.parse(extractJSON(block.text))
      } catch {
        errors.push(`${applicant.name}: JSON parse failed`)
        continue
      }

      const topMatch = parsed.course_matches?.[0]
      let matchedCourseId = applicant.matchedCourseId
      if (topMatch) {
        const found = findCourse(orgCourses, topMatch.course_name)
        if (found) matchedCourseId = found.id
      }

      await db.update(applicants).set({
        aiSuitabilityScore: parsed.overall_score,
        aiSuitabilitySummary: parsed.summary,
        aiMatchedCourses: parsed.course_matches,
        matchedCourseId,
        updatedAt: new Date(),
      }).where(eq(applicants.id, applicant.id))

      await db.insert(applicantEvents).values({
        id: uuidv4(),
        applicantId: applicant.id,
        actorId: session.id,
        actorName: session.name,
        eventType: 'ai_analysis',
        toValue: `Score: ${parsed.overall_score}`,
      })

      processed++
    } catch (err) {
      errors.push(`${applicant.name}: ${String(err)}`)
    }
  }

  return NextResponse.json({ processed, total: pending.length, errors })
}
