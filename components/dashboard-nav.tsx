'use client'

import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, ChevronDown } from 'lucide-react'

interface DashboardNavProps {
  user: { id: string; email: string; name: string }
  org: { id: string | undefined; name: string; role: string | null }
}

export function DashboardNav({ user, org }: DashboardNavProps) {
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' })
    router.push('/auth/sign-in')
    router.refresh()
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{org.name}</span>
        {org.role === 'admin' && (
          <span className="text-[0.625rem] font-semibold bg-indigo-50 text-[#473FCF] px-1.5 py-0.5 rounded uppercase tracking-wide">
            Admin
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-full bg-[#473FCF] flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-3 py-2.5">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-red-500 cursor-pointer focus:text-red-600 focus:bg-red-50"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
