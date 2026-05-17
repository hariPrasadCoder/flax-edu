import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, users } from '@/drizzle/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  const orgId = member[0].orgId

  const members = await db.select({
    id: orgMembers.id,
    userId: orgMembers.userId,
    role: orgMembers.role,
    createdAt: orgMembers.createdAt,
    userName: users.name,
    userEmail: users.email,
  })
    .from(orgMembers)
    .leftJoin(users, sql`${orgMembers.userId}::uuid = ${users.id}`)
    .where(eq(orgMembers.orgId, orgId))

  return NextResponse.json(members)
}
