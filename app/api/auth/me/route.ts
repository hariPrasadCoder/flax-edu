import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, organisations } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const member = await db.select({
    orgId: orgMembers.orgId,
    role: orgMembers.role,
    orgName: organisations.name,
  })
  .from(orgMembers)
  .leftJoin(organisations, eq(orgMembers.orgId, organisations.id))
  .where(eq(orgMembers.userId, session.id))
  .limit(1)

  return NextResponse.json({
    user: {
      ...session,
      orgId: member[0]?.orgId,
      role: member[0]?.role,
      orgName: member[0]?.orgName,
    }
  })
}
