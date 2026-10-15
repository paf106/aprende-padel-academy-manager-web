'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

export type MenuEntry = { label: string; onSelect: () => void; destructive?: boolean; disabled?: boolean }
export function Menu({ label = 'Más acciones', items, children }: { label?: string; items?: MenuEntry[]; children?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <div ref={root} className="relative inline-flex">
    <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((value) => !value)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) } }} className="grid size-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700"><MoreHorizontal size={20}/></button>
    {open ? <div role="menu" className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl">
      {items?.map((item) => <button key={item.label} role="menuitem" type="button" disabled={item.disabled} onClick={() => { setOpen(false); item.onSelect() }} className={`block min-h-9 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-100 disabled:opacity-40 ${item.destructive ? 'text-rose-700' : ''}`}>{item.label}</button>)}
      {children}
    </div> : null}
  </div>
}
