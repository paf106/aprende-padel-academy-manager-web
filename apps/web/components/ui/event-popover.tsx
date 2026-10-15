'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, Clock3, ExternalLink, MapPin, UserRound, X } from 'lucide-react'
import { formatInClubTime } from '@aprende-padel/core'

export type CalendarEventInfo = { id: string; starts_at: string; ends_at: string; status: 'pending' | 'completed' | 'cancelled'; club_id: string; club: { name: string; timezone: string } | null; teacher: { full_name: string } | null; studentCount: number; capacity: number; groupName: string | null }
export function EventPopover({ event, color, onClose, href }: { event: CalendarEventInfo; color: { background: string; border: string; foreground: string }; onClose: () => void; href: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  useEffect(() => {
    const anchor = document.querySelector<HTMLElement>(`[data-session-id="${CSS.escape(event.id)}"]`)
    const rect = anchor?.getBoundingClientRect()
    if (!rect) return
    const width = 320
    const nextPosition = { left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2)), top: rect.bottom + 8 + 260 > window.innerHeight ? Math.max(12, rect.top - 268) : rect.bottom + 8 }
    const timer = window.setTimeout(() => setPosition(nextPosition), 0)
    return () => window.clearTimeout(timer)
  }, [event.id])
  useEffect(() => {
    const pointer = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) onClose() }
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key) }
  }, [onClose])
  const start = formatInClubTime(event.starts_at, event.club?.timezone ?? 'Europe/Madrid', { timeOnly: true })
  const end = formatInClubTime(event.ends_at, event.club?.timezone ?? 'Europe/Madrid', { timeOnly: true })
  const duration = Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000)
  return <div ref={ref} role="dialog" aria-label="Vista rápida de la clase" className="fixed z-50 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl" style={{ top: position.top, left: position.left }}>
    <div className="h-2" style={{ backgroundColor: color.border }}/><div className="p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-semibold">{event.groupName ?? 'Clase suelta'}</h2><p className="mt-1 text-xs text-slate-500">{event.status === 'cancelled' ? 'Cancelada' : event.status === 'completed' ? 'Terminada' : 'Pendiente'}</p></div><button type="button" aria-label="Cerrar vista rápida" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={17}/></button></div>
      <div className="mt-4 grid gap-3 text-sm"><p className="flex items-center gap-2"><Clock3 size={16} className="text-slate-400"/><span>{start}–{end} · {duration} min</span></p><p className="flex items-center gap-2"><MapPin size={16} className="text-slate-400"/><span>{event.club?.name ?? 'Club'} · {event.studentCount}/{event.capacity}</span></p><p className="flex items-center gap-2"><UserRound size={16} className="text-slate-400"/><span>{event.teacher?.full_name ?? 'Profesor sin asignar'}</span></p></div>
      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3"><Link href={`${href}#attendance`} className="inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"><Check size={15}/> Pasar lista</Link><Link href={href} onClick={onClose} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800">Abrir <ExternalLink size={14}/></Link></div>
    </div>
  </div>
}
