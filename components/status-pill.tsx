import { APPLICANT_STATUSES } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface StatusPillProps {
  status: string
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  const statusInfo = APPLICANT_STATUSES.find(s => s.value === status) || APPLICANT_STATUSES[0]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusInfo.color,
      className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dot)} />
      {statusInfo.label}
    </span>
  )
}
