'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { calendarMonthGrid, clubCalendarColor, formatInClubTime, localDateInTimeZone, localTodayInTimeZone, statusLabels } from '@aprende-padel/core'

type CalendarSession = {
  id: string; starts_at: string; status: 'pending' | 'completed' | 'cancelled'; club_id: string
  club: { name: string; timezone: string } | null; studentCount: number; capacity: number; groupName?: string | null
}

const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function MonthCalendar({ month, sessions, clubs }: { month: string; sessions: CalendarSession[]; clubs: { id: string; name: string }[] }) {
  const router = useRouter()
  const search = useSearchParams()
  const colors = Object.fromEntries(clubs.map((club, index) => [club.id, clubCalendarColor(index)]))
  const dayKeys = calendarMonthGrid(month)
  const weeks = Array.from({ length: 6 }, (_, week) => dayKeys.slice(week * 7, week * 7 + 7))
  const today = localTodayInTimeZone('Europe/Madrid')
  const sessionsByDay = new Map<string, CalendarSession[]>()
  for (const session of sessions) {
    const day = localDateInTimeZone(session.starts_at, session.club?.timezone ?? 'Europe/Madrid')
    sessionsByDay.set(day, [...(sessionsByDay.get(day) ?? []), session])
  }
  const viewDay = (dayKey: string) => {
    const params = new URLSearchParams(search.toString())
    params.set('date', dayKey)
    params.set('view', 'day')
    router.push(`/clases?${params.toString()}`, { scroll: false })
  }

  return <div role="grid" aria-label={`Calendario mensual de ${format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: es })}`} className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
    <div role="row" className="grid grid-cols-7">{weekdays.map((day) => <div role="columnheader" className="border-b border-slate-300 px-1 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-700 sm:px-2" key={day}>{day}</div>)}</div>
    {weeks.map((week, weekIndex) => <div role="row" className="grid grid-cols-7" key={`week-${weekIndex}`}>
      {week.map((dayKey, dayIndex) => {
        const day = parseISO(dayKey)
        const daily = sessionsByDay.get(dayKey) ?? []
        const isToday = dayKey === today
        const inMonth = day.getMonth() === Number(month.slice(5)) - 1
        const label = format(day, 'EEEE d MMMM yyyy', { locale: es })
        return <section role="gridcell" aria-label={`${label}, ${daily.length} ${daily.length === 1 ? 'clase' : 'clases'}`} className={`min-h-[96px] min-w-0 border-b border-r border-slate-300 p-1.5 sm:min-h-[128px] sm:p-2 ${!inMonth ? 'bg-slate-50' : 'bg-white'} ${dayIndex === 6 ? 'border-r-0' : ''}`} key={dayKey}>
          <button className={`mb-1 grid size-8 place-items-center rounded-full text-xs font-semibold sm:size-9 ${isToday ? 'bg-blue-800 text-white' : inMonth ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => viewDay(dayKey)} type="button" aria-current={isToday ? 'date' : undefined} aria-label={`Ver agenda del ${label}`}>{format(day, 'd')}{isToday ? <span className="sr-only">, hoy</span> : null}</button>
          <div className="grid gap-1">{daily.slice(0, 2).map((session) => {
            const color = colors[session.club_id] ?? clubCalendarColor(0)
            const time = formatInClubTime(session.starts_at, session.club?.timezone ?? 'Europe/Madrid', { timeOnly: true })
            const clubName = session.club?.name ?? 'Club sin asignar'
            const title = `${statusLabels[session.status]} · ${clubName} · ${time} · ${session.studentCount} de ${session.capacity} alumnos`
            return <Link className="block min-w-0 truncate rounded-md border-l-[3px] px-1.5 py-1 text-[10px] leading-snug no-underline hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 sm:text-[11px]" style={{ borderLeftColor: color.border, backgroundColor: color.background, color: color.foreground }} href={`/clases/${session.id}`} key={session.id} aria-label={`${title}, ${label}`}>
              <span className="block truncate font-semibold">{session.groupName ?? time}</span><span className="block truncate">{clubName}</span><span className="block truncate">{statusLabels[session.status]} · {session.studentCount}/{session.capacity}</span>
            </Link>
          })}{daily.length > 2 ? <button type="button" className="min-h-9 text-left text-[11px] font-semibold text-blue-800 hover:underline" onClick={() => viewDay(dayKey)}>+{daily.length - 2} más</button> : null}</div>
        </section>
      })}
    </div>)}
  </div>
}
