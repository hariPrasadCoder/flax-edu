import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, organisations } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId
  const [org] = await db.select().from(organisations).where(eq(organisations.id, orgId)).limit(1)
  return NextResponse.json({ org })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  if (member[0].role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const orgId = member[0].orgId

  const { name, slug } = await request.json()

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  await db.update(organisations)
    .set({ name, ...(slug !== undefined ? { slug } : {}) })
    .where(eq(organisations.id, orgId))

  return NextResponse.json({ success: true })
}
