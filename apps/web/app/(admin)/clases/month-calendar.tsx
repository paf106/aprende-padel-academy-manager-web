'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
import { DialogContent } from '../../../components/ui/dialog-shell'
import { EventPopover, type CalendarEventInfo } from '../../../components/ui/event-popover'

type CalendarSession = CalendarEventInfo
const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const weekdayInitials = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
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
  const grid = useRef<HTMLDivElement>(null)
  const [gridHeight, setGridHeight] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<CalendarSession | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const colors = useMemo(
    () => Object.fromEntries(clubs.map((club) => [club.id, clubCalendarColor(club.id)])),
    [clubs],
  )
  const dayKeys = calendarMonthGrid(month)
  const weekCount = dayKeys.length / 7
  const today = localDateInTimeZone(now, timeZone)
  const rowHeight = gridHeight / weekCount
  const maxEventRows = Math.max(0, Math.floor((rowHeight - 38) / 27))
  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, CalendarSession[]>()
    for (const session of sessions) {
      const key = localDateInTimeZone(session.starts_at, session.club?.timezone ?? timeZone)
      grouped.set(key, [...(grouped.get(key) ?? []), session])
    }
    return grouped
  }, [sessions])

  useEffect(() => {
    const element = grid.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setGridHeight(entry.contentRect.height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const dayHref = (dayKey: string) => {
    const params = new URLSearchParams(search.toString())
    params.set('date', dayKey)
    params.set('view', 'day')
    return `/clases?${params.toString()}`
  }
  const selectedDaySessions = selectedDay ? (sessionsByDay.get(selectedDay) ?? []) : []
  const selectedDayLabel = selectedDay
    ? format(parseISO(selectedDay), 'EEEE d MMMM yyyy', { locale: es })
    : ''

  return (
    <div
      ref={grid}
      role="region"
      aria-label={`Calendario mensual de ${format(parseISO(`${month}-01`), 'MMMM yyyy', { locale: es })}`}
      className="grid h-full min-h-0 w-full grid-cols-7 overflow-hidden rounded-xl border border-slate-200 bg-white"
      style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
    >
      {dayKeys.map((dayKey, index) => {
        const day = parseISO(dayKey)
        const daily = sessionsByDay.get(dayKey) ?? []
        const isToday = dayKey === today
        const inMonth = day.getMonth() === Number(month.slice(5)) - 1
        const firstWeek = index < 7
        const weekday = weekdays[index % 7]
        const visible =
          daily.length > maxEventRows ? Math.max(0, maxEventRows - 1) : Math.min(daily.length, maxEventRows)
        const overflow = daily.length - visible
        const label = format(day, 'EEEE d MMMM yyyy', { locale: es })
        return (
          <section
            key={dayKey}
            role="group"
            aria-label={`${label}, ${daily.length} ${daily.length === 1 ? 'clase' : 'clases'}`}
            className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-r border-slate-200 p-0.5 sm:p-1 ${!inMonth ? 'bg-slate-50' : 'bg-white'} ${index % 7 === 6 ? 'border-r-0' : ''} ${index >= dayKeys.length - 7 ? 'border-b-0' : ''}`}
          >
            <div className="flex min-h-8 shrink-0 items-center justify-between gap-0.5 sm:min-h-9">
              {firstWeek ? (
                <>
                  <span
                    aria-hidden="true"
                    className="pl-0.5 text-[9px] font-semibold uppercase text-slate-500 sm:hidden"
                  >
                    {weekdayInitials[index % 7]}
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden truncate pl-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:block"
                  >
                    {weekday}
                  </span>
                </>
              ) : (
                <span aria-hidden="true" />
              )}
              <Link
                href={dayHref(dayKey)}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`Ver agenda del ${label}`}
                className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium no-underline hover:bg-slate-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent sm:size-8 ${isToday ? 'bg-accent font-semibold text-white hover:bg-blue-700' : inMonth ? 'text-slate-900' : 'text-slate-500'}`}
              >
                <span className="sm:hidden">{format(day, 'd')}</span>
                <span className="hidden sm:inline">
                  {day.getDate() === 1
                    ? `${format(day, 'd')} ${format(day, 'MMM', { locale: es }).replace(/\.$/, '')}`
                    : format(day, 'd')}
                </span>
                {isToday ? <span className="sr-only">, hoy</span> : null}
              </Link>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden">
              {daily.slice(0, visible).map((session) => {
                const color = colors[session.club_id] ?? clubCalendarColor(session.club_id)
                const title = session.groupName ?? 'Clase suelta'
                const clubName = session.club?.name ?? 'Club'
                const fullTitle = `${title}, ${clubName}, ${formatInClubTime(session.starts_at, session.club?.timezone ?? timeZone)}, ${statusLabels[session.status]}`
                return (
                  <button
                    key={session.id}
                    data-session-id={session.id}
                    type="button"
                    onClick={() => setSelectedEvent(session)}
                    aria-label={`${fullTitle}, ${label}`}
                    title={`${title} · ${clubName}`}
                    className={`grid min-h-[27px] min-w-0 content-center overflow-hidden rounded px-1 text-left leading-tight hover:brightness-95 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent ${session.status === 'cancelled' ? 'opacity-55 line-through' : session.status === 'completed' ? 'opacity-65' : ''}`}
                    style={{ backgroundColor: color.background, color: color.foreground }}
                  >
                    <span className="flex min-w-0 items-center gap-1 text-[10px] sm:text-[11px]">
                      <span
                        aria-hidden="true"
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color.border }}
                      />
                      <span className="min-w-0 truncate font-medium">{title}</span>
                    </span>
                    <span className="truncate pl-2.5 text-[9px] opacity-80">{clubName}</span>
                  </button>
                )
              })}
              {overflow > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedDay(dayKey)}
                  aria-label={`Ver ${overflow} clases más del ${label}`}
                  className="min-h-6 shrink-0 truncate rounded px-1 text-left text-[10px] font-semibold text-slate-700 hover:bg-slate-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {overflow} más
                </button>
              ) : null}
            </div>
          </section>
        )
      })}
      <DialogContent
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null)
        }}
        title={selectedDayLabel}
        description={`${selectedDaySessions.length} ${selectedDaySessions.length === 1 ? 'clase' : 'clases'}`}
      >
        <ul className="grid gap-1 p-3 sm:p-4">
          {selectedDaySessions.map((session) => {
            const color = colors[session.club_id] ?? clubCalendarColor(session.club_id)
            const title = session.groupName ?? 'Clase suelta'
            const clubName = session.club?.name ?? 'Club'
            const time = formatInClubTime(session.starts_at, session.club?.timezone ?? timeZone, {
              timeOnly: true,
            })
            const params = search.toString()
            return (
              <li key={session.id}>
                <Link
                  href={`/clases/${session.id}${params ? `?${params}` : ''}`}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-800 no-underline hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color.border }}
                  />
                  <span className="w-12 shrink-0 tabular-nums text-slate-600">{time}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
                  <span className="max-w-[35%] shrink-0 truncate text-xs text-slate-600">{clubName}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </DialogContent>
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
