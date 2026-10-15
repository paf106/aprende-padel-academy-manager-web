import { addDays, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { getClassReferenceData, getSessions } from '../../../lib/classes-data'
import { CalendarToolbar } from './calendar-toolbar'
import { NewSessionDialog } from './new-session-dialog'
import { clubCalendarColor, localTodayInTimeZone } from '@aprende-padel/core'
import { WeekCalendar } from './week-calendar'
import { MonthCalendar } from './month-calendar'

function validDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseISO(localTodayInTimeZone('Europe/Madrid'))
  const parsed = parseISO(value)
  return Number.isNaN(parsed.getTime()) ? parseISO(localTodayInTimeZone('Europe/Madrid')) : parsed
}
function validId(value?: string) { return !!value && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value) }

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ date?: string; week?: string; view?: string; club?: string; teacher?: string; status?: string }> }) {
  const params = await searchParams
  const view = params.view === 'day' ? 'day' : params.view === 'month' ? 'month' : 'week'
  const date = validDate(params.date ?? params.week)
  const periodStart = view === 'day' ? date : view === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const periodEnd = view === 'day' ? date : view === 'week' ? endOfWeek(date, { weekStartsOn: 1 }) : addDays(periodStart, 41)
  const status = ['pending', 'completed', 'cancelled'].includes(params.status ?? '') ? params.status as 'pending' | 'completed' | 'cancelled' : undefined
  const filters = { clubId: validId(params.club) ? params.club : undefined, teacherId: validId(params.teacher) ? params.teacher : undefined, status }
  const [reference, sessions] = await Promise.all([
    getClassReferenceData(),
    getSessions(`${format(addDays(periodStart, -1), 'yyyy-MM-dd')}T00:00:00`, `${format(addDays(periodEnd, 2), 'yyyy-MM-dd')}T00:00:00`, 500, filters),
  ])
  return <main className="min-w-0 overflow-hidden pb-10">
    <CalendarToolbar date={format(date, 'yyyy-MM-dd')} view={view} club={filters.clubId} teacher={filters.teacherId} status={status} clubs={reference.clubs} teachers={reference.teachers} action={<NewSessionDialog refs={reference}/>}/>
    <div className="px-3 pb-3 pt-2 text-xs text-slate-500 sm:px-5">{sessions.length} sesiones {view === 'day' ? 'en este día' : view === 'week' ? 'esta semana' : 'este mes'}</div>
    <div className="px-2 sm:px-4">{view === 'week' || view === 'day' ? <WeekCalendar startDate={format(periodStart, 'yyyy-MM-dd')} sessions={sessions} clubs={reference.clubs} view={view}/> : <MonthCalendar month={format(date, 'yyyy-MM')} sessions={sessions} clubs={reference.clubs}/>}</div>
  </main>
}
