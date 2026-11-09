'use client'

import { MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/core/cn'

export type RowAction = {
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
  hidden?: boolean
}

const MENU_WIDTH = 192
const ITEM_HEIGHT = 36

/** Row actions menu rendered in a portal, so table or card overflow can never clip it. */
export function RowActionsMenu({ actions, label }: { actions: readonly RowAction[]; label: string }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const visible = actions.filter((a) => !a.hidden)
  const open = position !== null

  const close = (restoreFocus = false) => {
    setPosition(null)
    if (restoreFocus) trigger.current?.focus()
  }

  const openMenu = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    const height = visible.length * ITEM_HEIGHT + 12
    const fitsBelow = rect.bottom + 4 + height <= window.innerHeight
    setPosition({
      top: fitsBelow ? rect.bottom + 4 : Math.max(8, rect.top - 4 - height),
      left: Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8),
    })
  }

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) setPosition(null)
    }
    const dismiss = () => setPosition(null)
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
    }
  }, [open])

  if (visible.length === 0) return null

  const moveFocus = (delta: number) => {
    const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const index = items.indexOf(document.activeElement as HTMLElement)
    items[(index + delta + items.length) % items.length]?.focus()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          if (open) close()
          else openMenu()
        }}
        className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <div
              ref={menu}
              role="menu"
              aria-label={label}
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') close(true)
                else if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  moveFocus(1)
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  moveFocus(-1)
                }
              }}
              className="fixed z-[60] rounded-xl border border-border bg-card p-1.5 shadow-xl"
            >
              {visible.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation()
                    close(true)
                    action.onSelect()
                  }}
                  className={cn(
                    'flex h-9 w-full cursor-pointer items-center rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                    action.tone === 'danger' && 'text-danger',
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
