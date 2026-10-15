'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

export type MenuEntry = { label: string; href?: string; onSelect?: () => void; destructive?: boolean; disabled?: boolean; current?: boolean }
type MenuProps = { label?: string; items: MenuEntry[]; portal?: boolean; side?: 'top' | 'bottom' }

export function Menu({ label = 'Más acciones', items, portal = false, side = 'bottom' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const focusIntent = useRef<'first' | 'last'>('first')
  const id = useId()

  useEffect(() => {
    if (!open) return
    const anchor = trigger.current
    const updatePosition = () => {
      if (!anchor || !portal) return
      const rect = anchor.getBoundingClientRect()
      setPosition({ left: Math.max(8, Math.min(window.innerWidth - 208, rect.right - 192)), top: side === 'top' ? rect.top - 8 : rect.bottom + 8 })
    }
    updatePosition()
    const frame = window.requestAnimationFrame(() => {
      const enabled = menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
      if (!enabled?.length) return
      enabled[focusIntent.current === 'last' ? enabled.length - 1 : 0].focus()
    })
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!root.current?.contains(target) && !menu.current?.contains(target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      if (menu.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    document.addEventListener('keydown', keydown)
    if (portal) {
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
    }
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
      document.removeEventListener('keydown', keydown)
      if (portal) {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [open, portal, side])

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const enabled = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])]
    const current = enabled.indexOf(document.activeElement as HTMLElement)
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') event.preventDefault()
    if (event.key === 'ArrowDown') enabled[(current + 1) % enabled.length]?.focus()
    if (event.key === 'ArrowUp') enabled[(current - 1 + enabled.length) % enabled.length]?.focus()
    if (event.key === 'Home') enabled[0]?.focus()
    if (event.key === 'End') enabled.at(-1)?.focus()
  }

  const content = open ? <div ref={menu} id={id} role="menu" aria-label={label} onKeyDown={handleMenuKeyDown} className={`z-[60] min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl ${portal ? 'fixed' : `absolute right-0 ${side === 'top' ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]'}`}`} style={portal && position ? { left: position.left, top: position.top, transform: side === 'top' ? 'translateY(-100%)' : undefined } : undefined}>
    {items.map((item) => {
      const className = `block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${item.destructive ? 'text-rose-700' : ''} ${item.disabled ? 'pointer-events-none opacity-40' : ''}`
      if (item.href) return <Link key={item.label} role="menuitem" tabIndex={-1} aria-current={item.current ? 'page' : undefined} aria-disabled={item.disabled || undefined} href={item.href} onClick={() => setOpen(false)} className={className}>{item.label}</Link>
      return <button key={item.label} role="menuitem" tabIndex={-1} aria-disabled={item.disabled || undefined} type="button" disabled={item.disabled} onClick={() => { setOpen(false); item.onSelect?.() }} className={className}>{item.label}</button>
    })}
  </div> : null

  return <div ref={root} className="relative inline-flex">
    <button ref={trigger} type="button" aria-label={label} aria-haspopup="menu" aria-controls={id} aria-expanded={open} onClick={() => { focusIntent.current = 'first'; setOpen((value) => !value) }} onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); focusIntent.current = event.key === 'ArrowUp' ? 'last' : 'first'; setOpen(true) } }} className="grid size-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"><MoreHorizontal size={20} aria-hidden="true"/></button>
    {portal ? (position && content ? createPortal(content, document.body) : null) : content}
  </div>
}
