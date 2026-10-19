'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { calendarMonthGrid, localTodayInTimeZone } from '@aprende-padel/core'

const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function YearCalendar({ year }: { year: number }) {
  const search = useSearchParams()
  const today = localTodayInTimeZone('Europe/Madrid')
  const baseParams = new URLSearchParams(search.toString())

  return (
    <div
      role="region"
      aria-label={`Calendario del año ${year}`}
      className="grid h-full min-h-0 w-full grid-cols-2 content-start gap-x-3 gap-y-5 overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-7 sm:p-5 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-8"
    >
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthDate = new Date(year, monthIndex, 1)
        const month = format(monthDate, 'yyyy-MM')
        const dayKeys = calendarMonthGrid(month)
        const params = new URLSearchParams(baseParams)
        params.set('date', `${month}-01`)
        params.set('view', 'month')
        return (
          <section key={month} aria-label={format(monthDate, 'MMMM', { locale: es })} className="min-w-0">
            <Link
              href={`/clases?${params.toString()}`}
              className="mb-1 inline-flex min-h-8 items-center rounded px-1 text-sm font-semibold capitalize text-slate-800 no-underline hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-accent sm:text-base"
            >
              {format(monthDate, 'MMMM', { locale: es })}
            </Link>
            <div className="grid grid-cols-7 justify-items-center" aria-hidden="true">
              {weekdays.map((weekday, index) => (
                <span
                  key={`${weekday}-${index}`}
                  className="grid size-7 place-items-center text-[10px] font-medium text-slate-500 sm:size-8 sm:text-xs"
                >
                  {weekday}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 justify-items-center">
              {dayKeys.map((dayKey) => {
                const date = new Date(`${dayKey}T12:00:00`)
                const active = dayKey === today
                const inMonth = date.getMonth() === monthIndex
                const dayParams = new URLSearchParams(baseParams)
                dayParams.set('date', dayKey)
                dayParams.set('view', 'day')
                return (
                  <Link
                    key={dayKey}
                    href={`/clases?${dayParams.toString()}`}
                    aria-current={active ? 'date' : undefined}
                    aria-label={`${format(date, 'EEEE d MMMM yyyy', { locale: es })}${active ? ', hoy' : ''}`}
                    className={`grid size-7 place-items-center rounded-full text-[11px] leading-none text-center no-underline hover:bg-slate-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-accent sm:size-8 sm:text-xs ${active ? 'bg-accent font-semibold text-white hover:bg-blue-700' : inMonth ? 'text-slate-800' : 'text-slate-400'}`}
                  >
                    {date.getDate()}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
