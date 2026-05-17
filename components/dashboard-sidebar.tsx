'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserPlus,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/applicants', label: 'Applicants', icon: Users },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
  { href: '/dashboard/team', label: 'Team', icon: UserPlus },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] flex-none h-full bg-white border-r border-[#E5E7EB] flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[#E5E7EB]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#473FCF] flex items-center justify-center flex-none">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1L10.5 9H1.5L6 1Z" fill="white" fillOpacity="0.9"/>
            </svg>
          </div>
          <span className="text-[1.0625rem] font-serif font-bold text-gray-900 tracking-tight">Flax</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[0.8125rem] font-medium transition-colors',
                isActive
                  ? 'bg-[#EEEEFF] text-[#473FCF]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )}
            >
              <Icon
                className={cn(
                  'w-[1.0625rem] h-[1.0625rem] flex-none',
                  isActive ? 'text-[#473FCF]' : 'text-gray-400'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom divider hint */}
      <div className="px-4 py-4 border-t border-[#F3F4F6]">
        <p className="text-[0.6875rem] text-gray-300 font-medium uppercase tracking-wider">Flax</p>
      </div>
    </aside>
  )
}
