'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import {
  calendarHeadingLabel,
  calendarMonthGrid,
  localDateInTimeZone,
  localTimeInTimeZone,
  type CalendarView,
} from '@/lib/core/dates'
import { layoutDayEvents } from '@/lib/core/calendar'
import { shiftDate, weekDays } from '@/lib/core/calendar-nav'
import { cn } from '@/lib/core/cn'
import { RowActionsMenu, type RowAction } from '@/components/crud/row-actions-menu'

export type CalendarTone = 'brand' | 'info' | 'danger' | 'warning' | 'neutral'
export type CalendarEvent = {
  id: string
  title: string
  subtitle?: string
  startsAt: string
  endsAt: string
  tone?: CalendarTone
  muted?: boolean
}

const toneClasses: Record<CalendarTone, string> = {
  brand: 'border-success bg-success-soft text-success',
  info: 'border-info bg-info-soft text-info',
  danger: 'border-danger bg-danger-soft text-danger',
  warning: 'border-warning bg-warning-soft text-warning',
  neutral: 'border-muted-foreground bg-muted text-foreground',
}

const VIEW_LABELS: Record<CalendarView, string> = { day: 'Día', week: 'Semana', month: 'Mes', year: 'Año' }
const START_HOUR = 7
const END_HOUR = 23
const PX_PER_HOUR = 56
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function Calendar({
  events,
  date,
  today,
  view,
  timeZone = 'Europe/Madrid',
  onDateChange,
  onViewChange,
  onEventClick,
  onSlotClick,
  dayActions,
  selectedId,
}: {
  events: readonly CalendarEvent[]
  date: string
  today: string
  view: CalendarView
  timeZone?: string
  onDateChange: (date: string) => void
  onViewChange: (view: CalendarView) => void
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: string, time: string | null) => void
  dayActions?: (date: string) => RowAction[]
  selectedId?: string | null
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const day = localDateInTimeZone(event.startsAt, timeZone)
      map.set(day, [...(map.get(day) ?? []), event])
    }
    for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    return map
  }, [events, timeZone])

  useEffect(() => {
    const node = scroller.current
    if (!node || (view !== 'day' && view !== 'week')) return
    const days = view === 'day' ? [date] : weekDays(date)
    let minutes = days.includes(today) ? localTimeInTimeZone(new Date(), timeZone) - 60 : null
    if (minutes === null) {
      const starts = days.flatMap((day) =>
        (byDay.get(day) ?? []).map((e) => localTimeInTimeZone(e.startsAt, timeZone)),
      )
      minutes = starts.length ? Math.min(...starts) - 30 : 8 * 60
    }
    node.scrollTop = Math.max(0, ((minutes - START_HOUR * 60) / 60) * PX_PER_HOUR)
  }, [view, date, today, timeZone, byDay])

  return (
    <section aria-label="Calendario" className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDateChange(today)}
            className="h-9 cursor-pointer rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            Hoy
          </button>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => onDateChange(shiftDate(date, view, -1))}
            className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-muted"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => onDateChange(shiftDate(date, view, 1))}
            className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-muted"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
        <h2 className="text-lg font-semibold capitalize" aria-live="polite">
          {calendarHeadingLabel(date, view)}
        </h2>
        <div
          role="group"
          aria-label="Vista"
          className="ml-auto flex rounded-full border border-border bg-card p-0.5"
        >
          {(Object.keys(VIEW_LABELS) as CalendarView[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => onViewChange(key)}
              className={cn(
                'h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors',
                view === key
                  ? 'bg-brand text-brand-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {VIEW_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-auto rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]"
      >
        {view === 'day' || view === 'week' ? (
          <TimeGrid
            days={view === 'day' ? [date] : weekDays(date)}
            byDay={byDay}
            today={today}
            timeZone={timeZone}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
            dayActions={dayActions}
            selectedId={selectedId}
          />
        ) : null}
        {view === 'month' ? (
          <MonthGrid
            date={date}
            byDay={byDay}
            today={today}
            onEventClick={onEventClick}
            onSlotClick={onSlotClick}
            selectedId={selectedId}
            onDayClick={(day) => {
              onDateChange(day)
              onViewChange('day')
            }}
          />
        ) : null}
        {view === 'year' ? (
          <YearGrid
            date={date}
            byDay={byDay}
            today={today}
            onMonthClick={(month) => {
              onDateChange(`${month}-01`)
              onViewChange('month')
            }}
          />
        ) : null}
      </div>
    </section>
  )
}

function EventBlock({
  event,
  selected,
  onClick,
  className,
  style,
  compact,
  timeZone,
}: {
  event: CalendarEvent
  selected: boolean
  onClick?: (event: CalendarEvent) => void
  className?: string
  style?: React.CSSProperties
  compact?: boolean
  timeZone: string
}) {
  const time = new Intl.DateTimeFormat('es-ES', { timeZone, hour: '2-digit', minute: '2-digit' }).format(
    new Date(event.startsAt),
  )
  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      style={style}
      aria-pressed={selected}
      className={cn(
        'cursor-pointer overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left text-xs leading-tight transition-shadow hover:shadow-md',
        toneClasses[event.tone ?? 'brand'],
        event.muted && 'opacity-60 line-through decoration-1',
        selected && 'ring-2 ring-foreground/70',
        className,
      )}
    >
      <span className="block truncate font-semibold">
        {compact ? <span className="mr-1 tabular-nums opacity-80">{time}</span> : null}
        {event.title}
      </span>
      {!compact && event.subtitle ? (
        <span className="block truncate opacity-80">{event.subtitle}</span>
      ) : null}
    </button>
  )
}

function TimeGrid({
  days,
  byDay,
  today,
  timeZone,
  onEventClick,
  onSlotClick,
  dayActions,
  selectedId,
}: {
  days: string[]
  byDay: Map<string, CalendarEvent[]>
  today: string
  timeZone: string
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: string, time: string | null) => void
  dayActions?: (date: string) => RowAction[]
  selectedId?: string | null
}) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const height = hours.length * PX_PER_HOUR
  return (
    <div>
      <div className="min-w-[640px]">
        <div
          className="sticky top-0 z-10 grid border-b border-border bg-card"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          <span />
          {days.map((day) => {
            const label = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' }).format(
              new Date(`${day}T00:00:00Z`),
            )
            return (
              <div key={day} className="relative py-2 text-center">
                {dayActions ? (
                  <div className="absolute right-1 top-1">
                    <RowActionsMenu label={`Acciones del ${day}`} actions={dayActions(day)} />
                  </div>
                ) : null}
                <p className="text-xs uppercase text-muted-foreground">{label.replace('.', '')}</p>
                <p
                  className={cn(
                    'mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-sm font-semibold',
                    day === today && 'bg-brand text-brand-foreground',
                  )}
                >
                  {Number(day.slice(8))}
                </p>
              </div>
            )
          })}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          <div className="relative" style={{ height }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground"
                style={{ top: (hour - START_HOUR) * PX_PER_HOUR }}
              >
                {hour > START_HOUR ? `${String(hour).padStart(2, '0')}:00` : ''}
              </span>
            ))}
          </div>
          {days.map((day) => {
            const events = byDay.get(day) ?? []
            const placements = layoutDayEvents(
              events.map((e) => ({ id: e.id, startsAt: e.startsAt, endsAt: e.endsAt, timeZone })),
              { startHour: START_HOUR, endHour: END_HOUR, pixelsPerHour: PX_PER_HOUR, timeZone },
            )
            return (
              <div
                key={day}
                className="relative border-l border-border"
                onClick={(event) => {
                  if (!onSlotClick || event.target !== event.currentTarget) return
                  const y = event.clientY - event.currentTarget.getBoundingClientRect().top
                  const minutes = START_HOUR * 60 + Math.floor(((y / PX_PER_HOUR) * 60) / 30) * 30
                  onSlotClick(
                    day,
                    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
                  )
                }}
                style={{
                  height,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_HOUR - 1}px, var(--border) ${PX_PER_HOUR - 1}px, var(--border) ${PX_PER_HOUR}px)`,
                }}
              >
                {placements
                  .filter((p) => !p.hidden)
                  .map((placement) => {
                    const event = events.find((e) => e.id === placement.id)
                    if (!event) return null
                    return (
                      <EventBlock
                        key={event.id}
                        event={event}
                        timeZone={timeZone}
                        selected={selectedId === event.id}
                        onClick={onEventClick}
                        className="absolute"
                        style={{
                          top: placement.top,
                          height: Math.max(placement.height - 2, 22),
                          left: `${placement.left}%`,
                          width: `${placement.width}%`,
                          zIndex: placement.zIndex,
                        }}
                      />
                    )
                  })}
                {day === today ? <NowLine timeZone={timeZone} /> : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NowLine({ timeZone }: { timeZone: string }) {
  const minutes = localTimeInTimeZone(new Date(), timeZone)
  const top = ((minutes - START_HOUR * 60) / 60) * PX_PER_HOUR
  if (top < 0 || top > (END_HOUR - START_HOUR) * PX_PER_HOUR) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-danger"
      style={{ top }}
    />
  )
}

function MonthGrid({
  date,
  byDay,
  today,
  onEventClick,
  onSlotClick,
  selectedId,
  onDayClick,
}: {
  date: string
  byDay: Map<string, CalendarEvent[]>
  today: string
  onEventClick?: (event: CalendarEvent) => void
  onSlotClick?: (date: string, time: string | null) => void
  selectedId?: string | null
  onDayClick: (day: string) => void
}) {
  const month = date.slice(0, 7)
  const cells = calendarMonthGrid(month)
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border text-center text-xs text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-2 font-medium">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const events = byDay.get(day) ?? []
          const inMonth = day.startsWith(month)
          return (
            <div
              key={day}
              onClick={(event) => {
                if (event.target === event.currentTarget) onSlotClick?.(day, null)
              }}
              className={cn(
                'min-h-28 border-b border-r border-border p-1.5 last:border-r-0',
                !inMonth && 'bg-muted/40',
              )}
            >
              <button
                type="button"
                aria-label={`Ver ${day}`}
                onClick={() => onDayClick(day)}
                className={cn(
                  'mb-1 grid size-7 cursor-pointer place-items-center rounded-full text-[13px] hover:bg-muted',
                  day === today && 'bg-brand font-semibold text-brand-foreground hover:bg-brand',
                  !inMonth && day !== today && 'text-muted-foreground',
                )}
              >
                {Number(day.slice(8))}
              </button>
              <div className="grid gap-0.5">
                {events.slice(0, 3).map((event) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    compact
                    timeZone="Europe/Madrid"
                    selected={selectedId === event.id}
                    onClick={onEventClick}
                  />
                ))}
                {events.length > 3 ? (
                  <button
                    type="button"
                    onClick={() => onDayClick(day)}
                    className="cursor-pointer px-1 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{events.length - 3} más
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function YearGrid({
  date,
  byDay,
  today,
  onMonthClick,
}: {
  date: string
  byDay: Map<string, CalendarEvent[]>
  today: string
  onMonthClick: (month: string) => void
}) {
  const year = date.slice(0, 4)
  return (
    <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`).map((month) => {
        const name = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' }).format(
          new Date(`${month}-01T00:00:00Z`),
        )
        return (
          <div key={month}>
            <button
              type="button"
              onClick={() => onMonthClick(month)}
              className="mb-2 cursor-pointer text-sm font-semibold capitalize hover:text-brand"
            >
              {name}
            </button>
            <div className="grid grid-cols-7 gap-y-1 text-center text-[11px]">
              {WEEKDAYS.map((d) => (
                <span key={d} className="text-muted-foreground">
                  {d}
                </span>
              ))}
              {calendarMonthGrid(month).map((day) => {
                const inMonth = day.startsWith(month)
                const count = byDay.get(day)?.length ?? 0
                return (
                  <span
                    key={day}
                    className={cn(
                      'mx-auto grid size-6 place-items-center rounded-full tabular-nums',
                      !inMonth && 'invisible',
                      count > 0 && 'bg-brand-soft font-semibold text-brand',
                      day === today && 'bg-brand text-brand-foreground',
                    )}
                  >
                    {Number(day.slice(8))}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
