import { addDays, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { Suspense } from 'react'
import { getClassReferenceData, getSessions } from '../../../lib/classes-data'
import { CalendarToolbar } from './calendar-toolbar'
import { NewSessionDialog } from './new-session-dialog'
import { localTodayInTimeZone } from '@aprende-padel/core'
import { WeekCalendar } from './week-calendar'
import { MonthCalendar } from './month-calendar'

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseISO(localTodayInTimeZone('Europe/Madrid'))
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? parseISO(localTodayInTimeZone('Europe/Madrid')) : parsed
}
function validId(value?: string) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string
    week?: string
    view?: string
    club?: string
    teacher?: string
    status?: string
  }>
}) {
  const params = await searchParams
  const view = params.view === 'day' ? 'day' : params.view === 'month' ? 'month' : 'week'
  const date = validDate(params.date ?? params.week)
  const periodStart =
    view === 'day'
      ? date
      : view === 'week'
        ? startOfWeek(date, { weekStartsOn: 1 })
        : startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const periodEnd =
    view === 'day' ? date : view === 'week' ? endOfWeek(date, { weekStartsOn: 1 }) : addDays(periodStart, 41)
  const status = ['pending', 'completed', 'cancelled'].includes(params.status ?? '')
    ? (params.status as 'pending' | 'completed' | 'cancelled')
    : undefined
  const filters = {
    clubId: validId(params.club) ? params.club : undefined,
    teacherId: validId(params.teacher) ? params.teacher : undefined,
    status,
  }
  const now = new Date().toISOString()
  const sessionsPromise = getSessions(
    `${format(addDays(periodStart, -1), 'yyyy-MM-dd')}T00:00:00`,
    `${format(addDays(periodEnd, 2), 'yyyy-MM-dd')}T00:00:00`,
    500,
    filters,
  )
  const reference = await getClassReferenceData()
  return (
    <main className="min-w-0 overflow-hidden pb-10">
      <CalendarToolbar
        date={format(date, 'yyyy-MM-dd')}
        view={view}
        club={filters.clubId}
        teacher={filters.teacherId}
        status={status}
        clubs={reference.clubs}
        teachers={reference.teachers}
        action={<NewSessionDialog refs={reference} />}
      />
      <Suspense fallback={<CalendarLoading />}>
        <CalendarResults
          sessionsPromise={sessionsPromise}
          now={now}
          periodStart={format(periodStart, 'yyyy-MM-dd')}
          month={format(date, 'yyyy-MM')}
          view={view}
          clubs={reference.clubs}
        />
      </Suspense>
    </main>
  )
}

async function CalendarResults({
  sessionsPromise,
  now,
  periodStart,
  month,
  view,
  clubs,
}: {
  sessionsPromise: ReturnType<typeof getSessions>
  now: string
  periodStart: string
  month: string
  view: 'day' | 'week' | 'month'
  clubs: { id: string; name: string }[]
}) {
  const sessions = await sessionsPromise
  return (
    <div className="px-2 py-3 sm:px-4">
      {view === 'week' || view === 'day' ? (
        <WeekCalendar now={now} startDate={periodStart} sessions={sessions} clubs={clubs} view={view} />
      ) : (
        <MonthCalendar month={month} now={now} sessions={sessions} clubs={clubs} />
      )}
    </div>
  )
}

function CalendarLoading() {
  return (
    <div role="status" className="space-y-3 px-2 py-3 sm:px-4">
      <span className="sr-only">Cargando calendario…</span>
      <div aria-hidden="true" className="h-5 w-40 animate-pulse rounded bg-slate-200" />
      <div
        aria-hidden="true"
        className="h-[650px] animate-pulse rounded-2xl border border-slate-200 bg-white"
      />
    </div>
  )
}
