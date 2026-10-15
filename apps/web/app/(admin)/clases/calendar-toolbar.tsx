'use client'

import { useCallback, useEffect, useMemo, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { addDays, addMonths, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { localTodayInTimeZone } from '@aprende-padel/core'

type Props = { date: string; view: 'day' | 'week' | 'month'; club?: string; teacher?: string; status?: string; clubs: { id: string; name: string }[]; teachers: { id: string; full_name: string; club_ids: string[] }[]; action?: React.ReactNode }

export function CalendarToolbar({ date, view, club = '', teacher = '', status = '', clubs, teachers, action }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const [pending, startTransition] = useTransition()
  const searchString = search.toString()
  const visibleTeachers = useMemo(() => teachers.filter((item) => !club || item.club_ids.includes(club)), [teachers, club])
  const activeFilters = Number(Boolean(club)) + Number(Boolean(teacher)) + Number(Boolean(status))
  const parsed = parseISO(date)
  const label = view === 'day' ? format(parsed, 'EEEE d MMMM yyyy', { locale: es }) : view === 'week' ? format(parsed, 'MMMM yyyy', { locale: es }) : format(parsed, 'MMMM yyyy', { locale: es })

  const update = useCallback((values: Record<string, string>, push = false) => {
    const params = new URLSearchParams(searchString)
    params.delete('week')
    for (const [key, value] of Object.entries(values)) value ? params.set(key, value) : params.delete(key)
    const query = params.toString()
    startTransition(() => router[push ? 'push' : 'replace'](query ? `${pathname}?${query}` : pathname, { scroll: false }))
  }, [searchString, pathname, router, startTransition])
  const move = useCallback((amount: number) => {
    const next = view === 'day' ? addDays(parsed, amount) : view === 'week' ? addDays(parsed, 7 * amount) : addMonths(startOfMonth(parsed), amount)
    update({ date: format(next, 'yyyy-MM-dd') }, true)
  }, [view, parsed, update])
  useEffect(() => {
    if (new URLSearchParams(searchString).has('view') || !window.matchMedia('(max-width: 700px)').matches) return
    const params = new URLSearchParams(searchString)
    params.set('view', 'day')
    const timer = window.setTimeout(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }), 0)
    return () => window.clearTimeout(timer)
  }, [pathname, router, searchString])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key.toLowerCase() === 't') { event.preventDefault(); update({ date: localTodayInTimeZone('Europe/Madrid') }, true) }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
      else if (event.key.toLowerCase() === 'd') update({ view: 'day' })
      else if (event.key.toLowerCase() === 'w') update({ view: 'week' })
      else if (event.key.toLowerCase() === 'm') update({ view: 'month' })
      else if (event.key.toLowerCase() === 'n') update({ newDate: localTodayInTimeZone('Europe/Madrid'), newTime: new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()) }, true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [date, view, searchString, update, move])

  return <div className={`w-full bg-white ${pending ? 'opacity-70' : ''}`}>
    <div className="flex min-h-[68px] flex-wrap items-center gap-2 border-b border-slate-200 px-2 py-2 sm:gap-4 sm:px-5">
      <button type="button" onClick={() => update({ date: localTodayInTimeZone('Europe/Madrid') }, true)} className="h-10 rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50">Hoy</button>
      <div className="flex items-center"><button type="button" aria-label="Periodo anterior" onClick={() => move(-1)} className="grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ChevronLeft size={22}/></button><button type="button" aria-label="Periodo siguiente" onClick={() => move(1)} className="grid size-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"><ChevronRight size={22}/></button></div>
      <h1 aria-live="polite" className="min-w-0 flex-1 truncate text-xl font-normal capitalize tracking-tight text-slate-800 sm:text-2xl">{label}</h1>
      <label className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 md:flex"><CalendarDays size={16} className="text-slate-500"/><span className="sr-only">Ir a fecha</span><input aria-label="Ir a fecha" type="date" value={date} onChange={(event) => update({ date: event.target.value }, true)} className="w-32 bg-transparent outline-none"/></label>
      <label className="relative flex h-10 min-w-[112px] items-center gap-3 rounded-xl border border-slate-300 bg-white pl-4 pr-9 text-sm font-medium text-slate-700"><select aria-label="Cambiar vista" value={view} onChange={(event) => update({ view: event.target.value })} className="absolute inset-0 z-10 cursor-pointer appearance-none opacity-0">{(['day', 'week', 'month'] as const).map((item) => <option value={item} key={item}>{item}</option>)}</select><span>{view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}</span><ChevronDown className="absolute right-3 text-slate-500" size={16}/></label>
      <div>{action}</div>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-3 sm:px-5">
      <label className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-500"><span>Club</span><select aria-label="Filtrar por club" value={club} onChange={(event) => update({ club: event.target.value, teacher: '' })} className="max-w-40 cursor-pointer bg-transparent font-medium text-slate-800 outline-none"><option value="">Todos los clubes</option>{clubs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-500"><span>Profesor</span><select aria-label="Filtrar por profesor" value={teacher} onChange={(event) => update({ teacher: event.target.value })} className="max-w-40 cursor-pointer bg-transparent font-medium text-slate-800 outline-none"><option value="">Todos</option>{visibleTeachers.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>
      <label className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-500"><span>Estado</span><select aria-label="Filtrar por estado" value={status} onChange={(event) => update({ status: event.target.value })} className="cursor-pointer bg-transparent font-medium text-slate-800 outline-none"><option value="">Todos</option><option value="pending">Pendiente</option><option value="completed">Terminada</option><option value="cancelled">Cancelada</option></select></label>
      {activeFilters ? <button type="button" onClick={() => update({ club: '', teacher: '', status: '' })} className="rounded-full px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">Limpiar filtros · {activeFilters}</button> : null}
    </div>
  </div>
}
