import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@aprende-padel/ui/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  )
}

export function BentoGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12', className)} {...props} />
}

const spans = {
  sm: 'md:col-span-3 lg:col-span-3',
  md: 'md:col-span-3 lg:col-span-4',
  lg: 'md:col-span-6 lg:col-span-6',
  xl: 'md:col-span-6 lg:col-span-8',
  full: 'md:col-span-6 lg:col-span-12',
} as const

export function BentoCard({
  span = 'md',
  title,
  action,
  className,
  children,
}: {
  span?: keyof typeof spans
  title?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('flex flex-col gap-3 p-5', spans[span], className)}>
      {title || action ? (
        <header className="flex items-center justify-between gap-3">
          {title ? <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </Card>
  )
}

export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}
