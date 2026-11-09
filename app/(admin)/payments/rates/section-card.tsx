'use client'

import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ds/button'
import { Card } from '@/components/ds/card'

/** Titled card used by each section of the rates page. */
export function SectionCard({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  children: ReactNode
}) {
  return (
    <Card>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actionLabel && onAction ? (
          <Button size="sm" onClick={onAction}>
            <Plus size={14} aria-hidden="true" />
            {actionLabel}
          </Button>
        ) : null}
      </header>
      {children}
    </Card>
  )
}
