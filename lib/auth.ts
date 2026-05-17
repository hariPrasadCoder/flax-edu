import { db } from '@/lib/db'
import { orgMembers, organisations } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'flax-secret-key-change-in-production'
)

export interface SessionUser {
  id: string
  email: string
  name: string
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)

  cookies().set('flax-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get('flax-session')?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export async function deleteSession() {
  cookies().delete('flax-session')
}

export async function getUserOrg(userId: string) {
  const member = await db
    .select({
      orgId: orgMembers.orgId,
      role: orgMembers.role,
      orgName: organisations.name,
    })
    .from(orgMembers)
    .leftJoin(organisations, eq(orgMembers.orgId, organisations.id))
    .where(eq(orgMembers.userId, userId))
    .limit(1)

  return member[0] || null
}
