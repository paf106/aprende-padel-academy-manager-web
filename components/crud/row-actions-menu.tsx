'use client'

import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/core/cn'

export type RowAction = {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
  hidden?: boolean
}

export function RowActionsMenu({ actions, label }: { actions: readonly RowAction[]; label: string }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const visible = actions.filter((a) => !a.hidden)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (visible.length === 0) return null
  return (
    <div
      ref={root}
      className="relative inline-block text-left"
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((v) => !v)
        }}
        className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl"
        >
          {visible.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation()
                setOpen(false)
                action.onSelect()
              }}
              className={cn(
                'flex w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm hover:bg-muted',
                action.tone === 'danger' && 'text-danger',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
