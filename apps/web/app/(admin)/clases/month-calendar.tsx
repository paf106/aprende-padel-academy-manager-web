'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  calendarMonthGrid,
  clubCalendarColor,
  formatInClubTime,
  localDateInTimeZone,
  statusLabels,
} from '@aprende-padel/core'
import { EventPopover, type CalendarEventInfo } from '../../../components/ui/event-popover'

type CalendarSession = CalendarEventInfo
const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const timeZone = 'Europe/Madrid'

export function MonthCalendar({
  month,
  now,
  sessions,
  clubs,
}: {
  month: string
  now: string
  sessions: CalendarSession[]
  clubs: { id: string; name: string }[]
}) {
  const router = useRouter()
  const search = useSearchParams()
  const colors = useMemo(
    () => Object.fromEntries(clubs.map((club) => [club.id, clubCalendarColor(club.id)])),
    [clubs],
  )
  const dayKeys = calendarMonthGrid(month)
  const today = localDateInTimeZone(now, timeZone)
  const [selectedEvent, setSelectedEvent] = useState<CalendarSession | null>(null)
  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarSession[]>()
    for (const session of sessions) {
      const key = localDateInTimeZone(session.starts_at, session.club?.timezone ?? timeZone)
      grouped.set(key, [...(grouped.get(key) ?? []), session])
    }
    return grouped
  }, [sessions])
  const viewDay = (dayKey: string) => {
    const params = new URLSearchParams(search.toString())
    params.set('date', dayKey)
    params.set('view', 'day')
    router.push(`/clases?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      aria-label={`Calendario mensual de ${format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: es })}`}
      className="grid grid-cols-7 overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      {weekdays.map((day) => (
        <div
          aria-hidden="true"
          className="border-b border-slate-200 px-1 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600 sm:px-2"
          key={day}
        >
          {day}
        </div>
      ))}
      {dayKeys.map((dayKey, index) => {
        const day = parseISO(dayKey)
        const daily = sessionsByDay.get(dayKey) ?? []
        const isToday = dayKey === today
        const inMonth = day.getMonth() === Number(month.slice(5)) - 1
        const label = format(day, 'EEEE d MMMM yyyy', { locale: es })
        return (
          <section
            aria-label={`${label}, ${daily.length} ${daily.length === 1 ? 'clase' : 'clases'}`}
            className={`min-h-[82px] min-w-0 border-b border-r border-slate-200 p-1.5 sm:min-h-[116px] sm:p-2 ${!inMonth ? 'bg-slate-50' : 'bg-white'} ${index % 7 === 6 ? 'border-r-0' : ''}`}
            key={dayKey}
          >
            <button
              className={`mb-1 grid size-9 place-items-center rounded-full text-sm font-medium ${isToday ? 'bg-accent text-white' : inMonth ? 'text-slate-900 hover:bg-slate-100' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={() => viewDay(dayKey)}
              type="button"
              aria-current={isToday ? 'date' : undefined}
              aria-label={`Ver agenda del ${label}`}
            >
              {format(day, 'd')}
              {isToday ? <span className="sr-only">, hoy</span> : null}
            </button>
            <div className="grid gap-0.5">
              {daily.map((session) => {
                const color = colors[session.club_id] ?? clubCalendarColor(session.club_id)
                const zone = session.club?.timezone ?? timeZone
                const start = formatInClubTime(session.starts_at, zone, { timeOnly: true })
                const title = session.groupName ?? 'Clase suelta'
                const past = new Date(session.ends_at).getTime() < new Date(now).getTime()
                const fullTitle = `${title}, ${formatInClubTime(session.starts_at, zone)}, ${session.club?.name ?? 'Club'}, ${session.studentCount} de ${session.capacity} alumnos, ${statusLabels[session.status]}`
                return (
                  <button
                    key={session.id}
                    data-session-id={session.id}
                    type="button"
                    onClick={() => setSelectedEvent(session)}
                    aria-label={`${fullTitle}, ${label}`}
                    title={`${start} · ${title} · ${session.club?.name ?? 'Club'} · ${session.studentCount}/${session.capacity}`}
                    className={`flex min-h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-xs hover:bg-slate-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent ${session.status === 'cancelled' ? 'opacity-55 line-through' : session.status === 'completed' || past ? 'opacity-65' : ''}`}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color.border }}
                    />
                    <span className="shrink-0 tabular-nums text-slate-700">{start}</span>
                    <strong className="min-w-0 truncate font-medium text-slate-900">{title}</strong>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
      {selectedEvent ? (
        <EventPopover
          event={selectedEvent}
          color={colors[selectedEvent.club_id] ?? clubCalendarColor(selectedEvent.club_id)}
          onClose={() => setSelectedEvent(null)}
          href={`/clases/${selectedEvent.id}${search.toString() ? `?${search.toString()}` : ''}`}
        />
      ) : null}
    </div>
  )
}
