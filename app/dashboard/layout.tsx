import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { orgMembers, organisations } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { DashboardNav } from '@/components/dashboard-nav'
import { DashboardSidebar } from '@/components/dashboard-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) {
    redirect('/auth/sign-in')
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

  if (!member[0]) {
    redirect('/auth/sign-in')
  }

  const org = {
    id: member[0].orgId,
    name: member[0].orgName || 'My College',
    role: member[0].role,
  }

  return (
    <div className="h-screen bg-[#FAFAFA] flex overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardNav user={session} org={org} />
        <main className="flex-1 overflow-y-auto px-7 py-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
