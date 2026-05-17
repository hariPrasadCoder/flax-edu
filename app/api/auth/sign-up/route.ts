import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, organisations, orgMembers } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createSession } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

function generateSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + '-' + Math.random().toString(36).slice(2, 6)
}

export async function POST(request: Request) {
  try {
    const { name, collegeName, email, password } = await request.json()

    if (!name || !collegeName || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const userId = uuidv4()
    const orgId = uuidv4()

    // Create user
    await db.insert(users).values({
      id: userId,
      email,
      name,
      passwordHash,
    })

    // Create org
    await db.insert(organisations).values({
      id: orgId,
      name: collegeName,
      slug: generateSlug(collegeName),
    })

    // Link user to org as admin
    await db.insert(orgMembers).values({
      id: uuidv4(),
      orgId,
      userId,
      role: 'admin',
    })

    await createSession({ id: userId, email, name })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Sign-up error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
