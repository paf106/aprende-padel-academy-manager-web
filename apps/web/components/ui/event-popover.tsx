'use client'

import { useEffect, useLayoutEffect, useRef, useState, useId } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Clock3, MapPin, UserRound, X } from 'lucide-react'
import { formatInClubTime, statusLabels } from '@aprende-padel/core'

export type CalendarEventInfo = {
  id: string
  starts_at: string
  ends_at: string
  status: 'pending' | 'completed' | 'cancelled'
  club_id: string
  club: { name: string; timezone: string } | null
  teacher: { full_name: string } | null
  studentCount: number
  capacity: number
  groupName: string | null
}
export function EventPopover({
  event,
  color,
  onClose,
  href,
}: {
  event: CalendarEventInfo
  color: { background: string; border: string; foreground: string }
  onClose: () => void
  href: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const focusedRef = useRef(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const id = useId()
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useLayoutEffect(() => {
    focusedRef.current = false
    const anchor = document.querySelector<HTMLElement>(`[data-session-id="${CSS.escape(event.id)}"]`)
    anchorRef.current = anchor
    if (!anchor) return
    const update = () => {
      const rect = anchor.getBoundingClientRect()
      const width = Math.min(320, window.innerWidth - 24)
      const height = ref.current?.offsetHeight ?? 260
      let top = rect.bottom + 8
      if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8)
      setPosition({
        left: Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2)),
        top,
      })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [event.id])

  useEffect(() => {
    if (!position) return
    if (!focusedRef.current) {
      ref.current?.querySelector<HTMLElement>('a,button')?.focus()
      focusedRef.current = true
    }
    const outside = (pointer: PointerEvent) => {
      if (!ref.current?.contains(pointer.target as Node)) onCloseRef.current()
    }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        requestAnimationFrame(() => anchorRef.current?.focus())
        return
      }
      if (event.key !== 'Tab') return
      const focusables = [
        ...(ref.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') ?? []),
      ]
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyboard)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyboard)
    }
  }, [position])

  const timeZone = event.club?.timezone ?? 'Europe/Madrid'
  const start = formatInClubTime(event.starts_at, timeZone, { timeOnly: true })
  const end = formatInClubTime(event.ends_at, timeZone, { timeOnly: true })
  const duration = Math.round(
    (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
  )
  const date = new Intl.DateTimeFormat('es-ES', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(event.starts_at))
  const occupancy = `Ocupación: ${event.studentCount} de ${event.capacity} alumnos`
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      className="fixed z-50 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-xl"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? 'visible' : 'hidden',
      }}
    >
      <div aria-hidden="true" className="h-2" style={{ backgroundColor: color.border }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="truncate text-base font-semibold">
              {event.groupName ?? 'Clase suelta'}
            </h2>
            <p className="mt-1 truncate text-xs capitalize text-slate-600">
              {date} · {statusLabels[event.status]}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar vista rápida"
            onClick={() => {
              onCloseRef.current()
              requestAnimationFrame(() => anchorRef.current?.focus())
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          <p className="flex items-center gap-2">
            <Clock3 size={16} aria-hidden="true" className="text-slate-500" />
            <span>
              {start} – {end} · {duration} min
            </span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={16} aria-hidden="true" className="text-slate-500" />
            <span>
              {event.club?.name ?? 'Club'} · <span className="sr-only">{occupancy}</span>
              <span aria-hidden="true">
                {event.studentCount}/{event.capacity}
              </span>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <UserRound size={16} aria-hidden="true" className="text-slate-500" />
            <span>{event.teacher?.full_name ?? 'Profesor sin asignar'}</span>
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Link
            href={`${href}#attendance`}
            onClick={() => onCloseRef.current()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <Check size={15} aria-hidden="true" /> Pasar lista
          </Link>
          <Link
            href={href}
            onClick={() => onCloseRef.current()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            Abrir clase <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
