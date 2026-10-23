import { cn } from '@/lib/core/cn'

const tones = {
  error: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  info: 'bg-warning-soft text-warning',
} as const

export function FormMessage({
  children,
  tone = 'error',
}: {
  children: React.ReactNode
  tone?: keyof typeof tones
}) {
  return (
    <p
      className={cn('rounded-xl px-3 py-2 text-sm', tones[tone])}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
  )
}
