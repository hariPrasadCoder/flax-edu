import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, invites } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await db.select().from(orgMembers).where(eq(orgMembers.userId, session.id)).limit(1)
  if (!member[0]) return NextResponse.json({ error: 'No org' }, { status: 403 })
  if (member[0].role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const orgId = member[0].orgId

  const { email, role } = await request.json()

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const token = uuidv4()

  const [invite] = await db.insert(invites).values({
    id: uuidv4(),
    orgId,
    email,
    role: role || 'staff',
    token,
  }).returning()

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  return NextResponse.json({ invite, inviteUrl })
}
