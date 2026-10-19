'use client'

import { useCallback, useEffect, useMemo, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { addDays, addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  calendarHeadingLabel,
  clubCalendarColor,
  localTodayInTimeZone,
  type CalendarView,
} from '@aprende-padel/core'

type Props = {
  date: string
  view: CalendarView
  club?: string
  teacher?: string
  status?: string
  clubs: { id: string; name: string }[]
  teachers: { id: string; full_name: string; club_ids: string[] }[]
  action?: React.ReactNode
}

export function CalendarToolbar({
  date,
  view,
  club = '',
  teacher = '',
  status = '',
  clubs,
  teachers,
  action,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const [pending, startTransition] = useTransition()
  const searchString = search.toString()
  const visibleTeachers = useMemo(
    () => teachers.filter((item) => !club || item.club_ids.includes(club)),
    [teachers, club],
  )
  const activeFilters = Number(Boolean(club)) + Number(Boolean(teacher)) + Number(Boolean(status))
  const parsed = useMemo(() => parseISO(date), [date])
  const label = calendarHeadingLabel(date, view)

  const update = useCallback(
    (values: Record<string, string>, push = false) => {
      const params = new URLSearchParams(searchString)
      params.delete('week')
      for (const [key, value] of Object.entries(values)) value ? params.set(key, value) : params.delete(key)
      const query = params.toString()
      startTransition(() =>
        router[push ? 'push' : 'replace'](query ? `${pathname}?${query}` : pathname, { scroll: false }),
      )
    },
    [searchString, pathname, router, startTransition],
  )
  const move = useCallback(
    (amount: number) => {
      const next =
        view === 'day'
          ? addDays(parsed, amount)
          : view === 'week'
            ? addDays(parsed, 7 * amount)
            : view === 'month'
              ? addMonths(startOfMonth(parsed), amount)
              : new Date(parsed.getFullYear() + amount, parsed.getMonth(), 1)
      update({ date: format(next, 'yyyy-MM-dd') }, true)
    },
    [view, parsed, update],
  )
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (document.querySelector('dialog[open]')) return
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input,textarea,select'))
      )
        return
      if (event.ctrlKey || event.metaKey || event.shiftKey) return
      const letterShortcut = ['t', 'd', 'w', 'm', 'y', 'n'].includes(event.key.toLowerCase())
      if (letterShortcut !== event.altKey) return
      if (!letterShortcut && event.altKey) return
      if (letterShortcut) event.preventDefault()
      if (
        !letterShortcut &&
        target instanceof HTMLElement &&
        target.closest('button,a,[role="button"],[role="menuitem"]')
      )
        return
      if (event.key.toLowerCase() === 't') {
        event.preventDefault()
        update({ date: localTodayInTimeZone('Europe/Madrid') }, true)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        move(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        move(1)
      } else if (event.key.toLowerCase() === 'd') update({ view: 'day' })
      else if (event.key.toLowerCase() === 'w') update({ view: 'week' })
      else if (event.key.toLowerCase() === 'm') update({ view: 'month' })
      else if (event.key.toLowerCase() === 'y') update({ view: 'year' })
      else if (event.key.toLowerCase() === 'n')
        update(
          {
            newDate: localTodayInTimeZone('Europe/Madrid'),
            newTime: new Intl.DateTimeFormat('en-GB', {
              timeZone: 'Europe/Madrid',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            }).format(new Date()),
          },
          true,
        )
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [date, view, searchString, update, move])

  return (
    <div aria-busy={pending} className={`w-full bg-white ${pending ? 'opacity-70' : ''}`}>
      <div className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 px-2 py-1.5 sm:gap-3 sm:px-4">
        <button
          type="button"
          title="Atajo: Alt+T"
          onClick={() => update({ date: localTodayInTimeZone('Europe/Madrid') }, true)}
          className="min-h-11 rounded-full border border-slate-400 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Hoy
        </button>
        <div className="flex items-center">
          <button
            type="button"
            title="Atajo: flecha izquierda"
            aria-label="Periodo anterior"
            onClick={() => move(-1)}
            className="grid size-11 place-items-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Atajo: flecha derecha"
            aria-label="Periodo siguiente"
            onClick={() => move(1)}
            className="grid size-11 place-items-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
        <h1
          aria-live="polite"
          className="min-w-0 flex-1 truncate text-xl font-normal tracking-tight text-slate-800 sm:text-2xl"
        >
          {label}
        </h1>
        <label className="relative flex min-h-11 min-w-[112px] items-center gap-3 rounded-xl border border-slate-400 bg-white pl-4 pr-9 text-sm font-medium text-slate-700 focus-within:ring-2 focus-within:ring-blue-700">
          <select
            aria-label="Cambiar vista"
            value={view}
            onChange={(event) => update({ view: event.target.value })}
            className="absolute inset-0 z-10 cursor-pointer appearance-none opacity-0 focus-visible:outline-none"
          >
            {(
              [
                ['day', 'Día'],
                ['week', 'Semana'],
                ['month', 'Mes'],
                ['year', 'Año'],
              ] as const
            ).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <span aria-hidden="true">{{ day: 'Día', week: 'Semana', month: 'Mes', year: 'Año' }[view]}</span>
          <ChevronDown aria-hidden="true" className="absolute right-3 text-slate-600" size={16} />
        </label>
        <div>{action}</div>
      </div>
      <div
        className={`${view === 'year' ? 'hidden' : 'flex'} shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 px-2 py-1.5 sm:gap-2 sm:px-4`}
      >
        <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-400 bg-white px-2.5 text-xs text-slate-700 sm:min-h-10">
          <span>Club</span>
          <select
            aria-label="Filtrar por club"
            value={club}
            onChange={(event) => update({ club: event.target.value, teacher: '' })}
            className="max-w-40 cursor-pointer bg-transparent font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <option value="">Todos los clubes</option>
            {clubs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-400 bg-white px-2.5 text-xs text-slate-700 sm:min-h-10">
          <span>Profesor</span>
          <select
            aria-label="Filtrar por profesor"
            value={teacher}
            onChange={(event) => update({ teacher: event.target.value })}
            className="max-w-40 cursor-pointer bg-transparent font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <option value="">Todos</option>
            {visibleTeachers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-400 bg-white px-2.5 text-xs text-slate-700 sm:min-h-10">
          <span>Estado</span>
          <select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => update({ status: event.target.value })}
            className="cursor-pointer bg-transparent font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Terminada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </label>
        {activeFilters ? (
          <button
            type="button"
            onClick={() => update({ club: '', teacher: '', status: '' })}
            className="min-h-9 rounded-full px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
          >
            Limpiar filtros <span className="tabular-nums">({activeFilters})</span>
          </button>
        ) : null}
      </div>
      <details
        className={`${view === 'year' ? 'hidden' : 'block'} group max-h-24 shrink-0 overflow-auto border-b border-slate-100 px-2 py-1 sm:px-4`}
      >
        <summary className="min-h-8 w-fit cursor-pointer list-none rounded-full px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Colores de clubes
        </summary>
        <ul aria-label="Leyenda de colores por club" className="mt-2 flex flex-wrap gap-x-4 gap-y-2 pb-1">
          {clubs.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-xs text-slate-700">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ backgroundColor: clubCalendarColor(item.id).border }}
              />
              {item.name}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
