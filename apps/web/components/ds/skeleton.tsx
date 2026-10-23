import { cn } from '@aprende-padel/ui/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-muted', className)} />
}
