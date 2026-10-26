import type { ReactNode } from 'react'
import { cn } from '@/lib/core/cn'

export function PageContainer({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 py-5 md:px-8 md:py-6',
        fill && 'h-[calc(100dvh-4rem-4.5rem)] min-h-0 md:h-[calc(100dvh-4rem)]',
      )}
    >
      {children}
    </main>
  )
}

/** Row with filters on the left and page actions on the right. The h1 is only for assistive technology. */
export function PageToolbar({
  title,
  children,
  actions,
}: {
  title: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h1 className="sr-only">{title}</h1>
      {children}
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

/** Visible heading for detail pages, where the entity name is not in the side navigation. */
export function EntityHeader({
  title,
  subtitle,
  badge,
  actions,
  back,
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  back?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

/** @deprecated Replaced by PageToolbar; removed once every page is migrated. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
