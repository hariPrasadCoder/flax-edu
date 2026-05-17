import { db } from '@/lib/db'
import { invites, orgMembers, organisations } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'

export default async function InvitePage({ params }: { params: { token: string } }) {
  const [invite] = await db.select({
    invite: invites,
    orgName: organisations.name,
  })
    .from(invites)
    .leftJoin(organisations, eq(invites.orgId, organisations.id))
    .where(eq(invites.token, params.token))
    .limit(1)

  if (!invite || invite.invite.accepted) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-2">Invalid invite</h1>
          <p className="text-gray-500">This invite link is invalid or has already been used.</p>
          <Link href="/auth/sign-in" className="text-[#473FCF] hover:underline mt-4 inline-block">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  // Check if user is logged in
  const session = await getSession()

  if (session) {
    // Accept invite for current user
    const existingMember = await db.select().from(orgMembers)
      .where(eq(orgMembers.userId, session.id))
      .limit(1)

    if (!existingMember[0]) {
      await db.insert(orgMembers).values({
        id: uuidv4(),
        orgId: invite.invite.orgId,
        userId: session.id,
        role: invite.invite.role,
      })

      await db.update(invites)
        .set({ accepted: true })
        .where(eq(invites.token, params.token))
    }

    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Flax</h1>
        <p className="text-gray-500 mb-8 text-sm">AI-powered admissions for FE colleges</p>

        <div className="bg-white border border-[#E5E7EB] rounded-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">You&apos;ve been invited</h2>
          <p className="text-gray-600 mb-6">
            You&apos;ve been invited to join <strong>{invite.orgName}</strong> on Flax as a {invite.invite.role}.
          </p>

          <div className="space-y-3">
            <Link
              href={`/auth/sign-up?invite=${params.token}&email=${encodeURIComponent(invite.invite.email)}`}
              className="block w-full bg-[#473FCF] hover:bg-[#3935B8] text-white py-2.5 px-4 rounded-md text-sm font-medium text-center transition-colors"
            >
              Create account
            </Link>
            <Link
              href={`/auth/sign-in?invite=${params.token}`}
              className="block w-full border border-gray-200 text-gray-700 hover:bg-gray-50 py-2.5 px-4 rounded-md text-sm font-medium text-center transition-colors"
            >
              Sign in with existing account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
