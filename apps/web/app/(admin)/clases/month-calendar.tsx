'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { calendarMonthGrid, clubCalendarColor, localDateInTimeZone, localTodayInTimeZone, formatInClubTime } from '@aprende-padel/core'

type CalendarSession = {
  id: string; starts_at: string; status: 'pending' | 'completed' | 'cancelled'; club_id: string
  club: { name: string; timezone: string } | null; studentCount: number; capacity: number; groupName?: string | null
}

export function MonthCalendar({ month, sessions, clubs }: { month: string; sessions: CalendarSession[]; clubs: { id: string; name: string }[] }) {
  const router = useRouter()
  const search = useSearchParams()
  const colors = Object.fromEntries(clubs.map((club, index) => [club.id, clubCalendarColor(index)]))
  const dayKeys = calendarMonthGrid(month)
  return <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-label="Calendario mensual">
    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => <div className="border-b border-slate-200 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:px-2 sm:py-3 sm:text-xs" key={day}>{day}</div>)}
    {dayKeys.map((dayKey, index) => {
      const day = parseISO(dayKey)
      const daily = sessions.filter((session) => localDateInTimeZone(session.starts_at, session.club?.timezone ?? 'Europe/Madrid') === dayKey)
      const isToday = dayKey === localTodayInTimeZone('Europe/Madrid')
      const viewDay = () => {
        const params = new URLSearchParams(search.toString())
        params.set('date', dayKey)
        params.set('view', 'day')
        router.push(`/clases?${params.toString()}`, { scroll: false })
      }
      return <section className={`min-h-[74px] min-w-0 border-b border-r border-slate-200 p-1 sm:min-h-[112px] sm:p-2 ${day.getMonth() === Number(month.slice(5)) - 1 ? 'bg-white' : 'bg-slate-50'} ${index % 7 === 6 ? 'border-r-0' : ''}`} key={dayKey}>
        <button className={`mb-1 grid size-6 place-items-center rounded-full text-[11px] font-medium sm:size-7 sm:text-xs ${isToday ? 'bg-blue-700 text-white' : day.getMonth() === Number(month.slice(5)) - 1 ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-400'}`} onClick={viewDay} type="button" aria-label={`Ver clases del ${format(day, 'd MMMM', { locale: es })}`}>{format(day, 'd')}</button>
        <div className="grid gap-1">{daily.slice(0, 3).map((session) => {
          const color = colors[session.club_id] ?? clubCalendarColor(0)
          return <Link className={`block truncate rounded-md border-l-[3px] px-1.5 py-1 text-[9px] leading-tight no-underline sm:text-[10px] ${session.status === 'cancelled' ? 'opacity-50 line-through' : session.status === 'completed' ? 'opacity-70' : ''}`} style={{ borderLeftColor: color.border, backgroundColor: color.background, color: color.foreground }} href={`/clases/${session.id}`} key={session.id} title={`${formatInClubTime(session.starts_at, session.club?.timezone ?? 'Europe/Madrid', { timeOnly: true })} · ${session.club?.name ?? 'Club'} · ${session.studentCount}/${session.capacity}`}><span className="font-semibold tabular-nums">{session.groupName ?? formatInClubTime(session.starts_at, session.club?.timezone ?? 'Europe/Madrid', { timeOnly: true })}</span><span className="hidden sm:inline"> · {session.studentCount}/{session.capacity}</span></Link>
        })}{daily.length > 3 ? <button type="button" className="text-left text-[9px] font-semibold text-blue-700 hover:underline sm:text-[10px]" onClick={viewDay}>+{daily.length - 3} más</button> : null}</div>
      </section>
    })}
  </div>
}
