'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check } from 'lucide-react'
import {
  clubCalendarColor,
  formatInClubTime,
  layoutDayEvents,
  localDateInTimeZone,
  localTimeInTimeZone,
  statusLabels,
  timeZoneOffsetLabel,
  type CalendarEventPlacement,
} from '@aprende-padel/core'
import { EventPopover, type CalendarEventInfo } from '../../../components/ui/event-popover'

const OPEN_HOUR = 0
const CLOSE_HOUR = 24
const PIXELS_PER_HOUR = 68
const hours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, index) => index + OPEN_HOUR)
const slots = Array.from({ length: (CLOSE_HOUR - OPEN_HOUR) * 2 }, (_, index) => index * 30)
const CALENDAR_TIME_ZONE = 'Europe/Madrid'
type Event = CalendarEventInfo & { allDay?: boolean }

export function WeekCalendar({
  now,
  startDate,
  sessions,
  clubs,
  view = 'week',
}: {
  now: string
  startDate: string
  sessions: Event[]
  clubs: { id: string; name: string }[]
  view?: 'day' | 'week'
}) {
  const router = useRouter()
  const search = useSearchParams()
  const scroller = useRef<HTMLDivElement>(null)
  const firstClock = useRef(now)
  const selectedDay = useMemo(() => parseISO(startDate), [startDate])
  const weekStart = useMemo(() => startOfWeek(selectedDay, { weekStartsOn: 1 }), [selectedDay])
  const days = useMemo(
    () =>
      view === 'day' ? [selectedDay] : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [view, selectedDay, weekStart],
  )
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  )
  const colors = useMemo(
    () => Object.fromEntries(clubs.map((club) => [club.id, clubCalendarColor(club.id)])),
    [clubs],
  )
  const [clock, setClock] = useState(now)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [focusedCell, setFocusedCell] = useState({ day: 0, slot: 16 })

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date().toISOString()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const currentDate = localDateInTimeZone(firstClock.current, CALENDAR_TIME_ZONE)
    const visibleToday = days.some((day) => format(day, 'yyyy-MM-dd') === currentDate)
    const currentHour = Math.floor(localTimeInTimeZone(firstClock.current, CALENDAR_TIME_ZONE) / 60)
    const firstHour = visibleToday ? Math.max(0, currentHour - 2) : 8
    scroller.current?.scrollTo({ top: firstHour * PIXELS_PER_HOUR, behavior: 'auto' })
  }, [startDate, view, days])

  const today = localDateInTimeZone(clock, CALENDAR_TIME_ZONE)
  const currentMinute = localTimeInTimeZone(clock, CALENDAR_TIME_ZONE)
  const sessionsByDay = useMemo(() => {
    const grouped = new Map<string, Event[]>()
    for (const session of sessions) {
      const key = localDateInTimeZone(session.starts_at, session.club?.timezone ?? CALENDAR_TIME_ZONE)
      grouped.set(key, [...(grouped.get(key) ?? []), session])
    }
    return grouped
  }, [sessions])
  const placementsByDay = useMemo(() => {
    const grouped = new Map<string, { events: Event[]; byId: Map<string, CalendarEventPlacement> }>()
    for (const day of days) {
      const key = format(day, 'yyyy-MM-dd')
      const events = (sessionsByDay.get(key) ?? []).filter((session) => !session.allDay)
      const placements = layoutDayEvents(
        events.map((event) => ({
          id: event.id,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          timeZone: event.club?.timezone ?? CALENDAR_TIME_ZONE,
        })),
        { startHour: OPEN_HOUR, endHour: CLOSE_HOUR, pixelsPerHour: PIXELS_PER_HOUR },
      )
      grouped.set(key, { events, byId: new Map(placements.map((placement) => [placement.id, placement])) })
    }
    return grouped
  }, [days, sessionsByDay])

  function createAt(day: Date, minute: number) {
    const params = new URLSearchParams(search.toString())
    params.set('newDate', format(day, 'yyyy-MM-dd'))
    params.set(
      'newTime',
      `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
    )
    router.push(`/clases?${params.toString()}`, { scroll: false })
  }

  const columnGrid = view === 'day' ? 'grid-cols-1' : 'grid-cols-7 max-sm:min-w-[820px]'
  const allDayEvents = (day: Date) =>
    sessionsByDay.get(format(day, 'yyyy-MM-dd'))?.filter((session) => session.allDay) ?? []

  return (
    <div
      role="region"
      aria-label={view === 'day' ? 'Agenda del día' : 'Calendario semanal'}
      className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      {view === 'day' ? (
        <nav
          className="grid grid-cols-7 border-b border-slate-200 bg-white sm:hidden"
          aria-label="Días de la semana"
        >
          {weekDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const params = new URLSearchParams(search.toString())
            params.set('view', 'day')
            params.set('date', key)
            const active = key === format(selectedDay, 'yyyy-MM-dd')
            return (
              <Link
                key={key}
                aria-current={active ? 'date' : undefined}
                href={`/clases?${params.toString()}`}
                className="grid min-h-14 content-center justify-items-center gap-1 text-[11px] capitalize text-slate-600"
              >
                <span>{format(day, 'EEE', { locale: es }).replace(/\.$/, '')}</span>
                <strong
                  className={`grid size-8 place-items-center rounded-full text-sm ${active ? 'bg-accent text-white' : 'text-slate-900'}`}
                >
                  {format(day, 'd')}
                </strong>
              </Link>
            )
          })}
        </nav>
      ) : null}

      <div
        ref={scroller}
        className="max-h-[min(72vh,850px)] overflow-auto overscroll-contain [scrollbar-gutter:stable]"
      >
        <div className="sticky top-0 z-30 grid grid-cols-[58px_minmax(0,1fr)] border-b border-slate-200 bg-white">
          <div className="border-r border-slate-200" />
          <div className={`grid ${columnGrid}`}>
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const isToday = key === today
              const weekday = new Intl.DateTimeFormat('es-ES', {
                timeZone: CALENDAR_TIME_ZONE,
                weekday: 'short',
              })
                .format(day)
                .replace(/\.$/, '')
                .toLocaleUpperCase('es-ES')
              return (
                <Link
                  key={key}
                  href={`/clases?${new URLSearchParams({ ...Object.fromEntries(search.entries()), view: 'day', date: key })}`}
                  aria-current={isToday ? 'date' : undefined}
                  className="flex min-h-[72px] flex-col items-center justify-center gap-1 border-r border-slate-200 text-slate-600 last:border-r-0 hover:bg-slate-50 focus-visible:z-10"
                >
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[.12em] ${isToday ? 'text-accent' : ''}`}
                  >
                    {weekday}
                  </span>
                  <strong
                    className={`grid size-10 place-items-center rounded-full text-xl font-normal ${isToday ? 'bg-accent text-white' : 'text-slate-900'}`}
                  >
                    {format(day, 'd')}
                  </strong>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="grid min-h-9 grid-cols-[58px_minmax(0,1fr)] border-b border-slate-200 bg-white">
          <span className="flex items-center justify-center text-[10px] font-medium tabular-nums text-slate-600">
            {timeZoneOffsetLabel(CALENDAR_TIME_ZONE, clock)}
          </span>
          <div className={`grid ${columnGrid}`}>
            {days.map((day) => {
              const entries = allDayEvents(day)
              return (
                <div
                  key={format(day, 'yyyy-MM-dd')}
                  className="grid min-h-9 content-start gap-1 border-r border-slate-200 p-1 last:border-r-0"
                >
                  {entries.map((event) => {
                    const color = colors[event.club_id] ?? clubCalendarColor(event.club_id)
                    return (
                      <button
                        key={event.id}
                        data-session-id={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="min-h-7 truncate rounded-lg px-2 py-1 text-left text-xs font-semibold text-slate-900 hover:brightness-95 focus-visible:z-10"
                        style={{ backgroundColor: color.background }}
                      >
                        {event.groupName ?? event.club?.name ?? 'Clase'}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-[58px_minmax(0,1fr)]">
          <div
            className="relative border-r border-slate-200 bg-white"
            style={{ height: (CLOSE_HOUR - OPEN_HOUR) * PIXELS_PER_HOUR }}
          >
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-slate-600"
                style={{ top: (hour - OPEN_HOUR) * PIXELS_PER_HOUR }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          <div data-calendar-grid className={`grid ${columnGrid}`}>
            {days.map((day, dayIndex) => {
              const key = format(day, 'yyyy-MM-dd')
              const { events, byId } = placementsByDay.get(key) ?? { events: [], byId: new Map() }
              const isToday = key === today
              return (
                <div
                  key={key}
                  className="relative border-r border-slate-200 last:border-r-0"
                  style={{
                    height: (CLOSE_HOUR - OPEN_HOUR) * PIXELS_PER_HOUR,
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, transparent 0, transparent 67px, #e2e8f0 67px, #e2e8f0 68px)',
                  }}
                >
                  {slots.map((minute, slotIndex) => (
                    <button
                      key={minute}
                      data-slot-day={dayIndex}
                      data-slot-index={slotIndex}
                      tabIndex={focusedCell.day === dayIndex && focusedCell.slot === slotIndex ? 0 : -1}
                      type="button"
                      aria-label={`Crear clase el ${format(day, 'd MMMM', { locale: es })} a las ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`}
                      className="absolute inset-x-0 z-0 h-[34px] bg-transparent focus-visible:z-10 focus-visible:bg-emerald-50"
                      style={{ top: (minute / 60) * PIXELS_PER_HOUR }}
                      onFocus={() => setFocusedCell({ day: dayIndex, slot: slotIndex })}
                      onKeyDown={(event) => {
                        const movements = {
                          ArrowLeft: [-1, 0],
                          ArrowRight: [1, 0],
                          ArrowUp: [0, -1],
                          ArrowDown: [0, 1],
                        } as const
                        const movement = movements[event.key as keyof typeof movements]
                        if (!movement) return
                        event.preventDefault()
                        const nextDay = Math.max(0, Math.min(days.length - 1, dayIndex + movement[0]))
                        const nextSlot = Math.max(0, Math.min(slots.length - 1, slotIndex + movement[1]))
                        setFocusedCell({ day: nextDay, slot: nextSlot })
                        window.requestAnimationFrame(() =>
                          document
                            .querySelector<HTMLElement>(
                              `[data-calendar-grid] [data-slot-day="${nextDay}"][data-slot-index="${nextSlot}"]`,
                            )
                            ?.focus(),
                        )
                      }}
                      onClick={() => createAt(day, minute)}
                    />
                  ))}
                  {isToday && currentMinute >= OPEN_HOUR * 60 && currentMinute < CLOSE_HOUR * 60 ? (
                    <div
                      role="img"
                      aria-label={`Hora actual ${String(Math.floor(currentMinute / 60)).padStart(2, '0')}:${String(currentMinute % 60).padStart(2, '0')}`}
                      className="pointer-events-none absolute inset-x-0 z-30 h-0.5 bg-rose-600"
                      style={{ top: ((currentMinute - OPEN_HOUR * 60) / 60) * PIXELS_PER_HOUR }}
                    >
                      <span className="absolute -left-1.5 -top-1 size-3 rounded-full bg-rose-600" />
                    </div>
                  ) : null}
                  {events.map((event) => {
                    const placement = byId.get(event.id)
                    if (!placement) return null
                    const color = colors[event.club_id] ?? clubCalendarColor(event.club_id)
                    const zone = event.club?.timezone ?? CALENDAR_TIME_ZONE
                    const start = formatInClubTime(event.starts_at, zone, { timeOnly: true })
                    const end = formatInClubTime(event.ends_at, zone, { timeOnly: true })
                    const title = event.groupName ?? 'Clase suelta'
                    const isPast = new Date(event.ends_at).getTime() < new Date(clock).getTime()
                    const compact = placement.height < 48
                    return (
                      <button
                        key={event.id}
                        data-session-id={event.id}
                        type="button"
                        aria-label={`${title}, ${formatInClubTime(event.starts_at, zone)}, ${start}–${end}, ${statusLabels[event.status]}, ${event.studentCount} de ${event.capacity} alumnos`}
                        onClick={() => setSelectedEvent(event)}
                        className={`calendar-event absolute grid min-w-0 cursor-pointer content-start gap-0.5 overflow-hidden rounded-lg border px-2 py-1 text-left text-xs leading-tight outline-none transition-shadow hover:z-20 hover:shadow-sm focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-accent ${event.status === 'cancelled' ? 'opacity-50 line-through' : event.status === 'completed' || isPast ? 'opacity-65' : ''}`}
                        data-status={event.status}
                        style={{
                          top: placement.top,
                          height: placement.height,
                          left: `calc(${placement.left}% + 2px)`,
                          width: `calc(${placement.width}% - 3px)`,
                          zIndex: 10 + (placement.zIndex ?? 0),
                          backgroundColor: color.background,
                          borderColor: 'rgb(255 255 255 / 88%)',
                          color: color.foreground,
                        }}
                      >
                        {compact ? (
                          <span className="truncate">
                            <strong>{title}</strong>, {start}
                          </span>
                        ) : (
                          <>
                            <span className="flex min-w-0 items-center gap-1">
                              <strong className="min-w-0 flex-1 truncate font-semibold">{title}</strong>
                              {event.status === 'completed' ? (
                                <Check size={13} aria-label="Terminada" />
                              ) : null}
                            </span>
                            <span className="truncate tabular-nums">
                              {start} – {end}
                            </span>
                            {placement.height >= 66 ? (
                              <span className="truncate">
                                {event.club?.name ?? 'Club'} · {event.studentCount}/{event.capacity}
                              </span>
                            ) : null}
                            {placement.height >= 100 && event.teacher ? (
                              <span className="truncate">{event.teacher.full_name}</span>
                            ) : null}
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <span className="sr-only">
        Pulsa un hueco para crear una clase. Usa las flechas para moverte por las horas.
      </span>
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
