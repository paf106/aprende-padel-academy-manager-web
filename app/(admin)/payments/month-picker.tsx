'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ds/button'
import { Dropdown } from '@/components/ds/dropdown'
import { addMonths } from '@/lib/core/calendar-nav'
import { useAppData } from '@/lib/data/provider'

export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  )

/** Months from the first class of the academy to the end of the season, so any month can be charged in advance or settled later. */
export function useMonthOptions(currentMonth: string) {
  const { sessions, groups, seasonEnd } = useAppData()
  return useMemo(() => {
    const starts = [...sessions.map((s) => s.date), ...groups.map((g) => g.startsOn)].map((d) =>
      d.slice(0, 7),
    )
    const first = [currentMonth, ...starts].sort()[0]
    const last = [currentMonth, seasonEnd.slice(0, 7)].sort().at(-1)!
    const months: string[] = []
    for (let month = first; month <= last; month = addMonths(month, 1)) months.push(month)
    return months
  }, [sessions, groups, seasonEnd, currentMonth])
}

export function MonthPicker({
  month,
  currentMonth,
  onChange,
}: {
  month: string
  currentMonth: string
  onChange: (month: string) => void
}) {
  const months = useMonthOptions(currentMonth)
  const index = months.indexOf(month)
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-label="Mes anterior"
        disabled={index <= 0}
        onClick={() => onChange(months[index - 1])}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </Button>
      <Dropdown
        aria-label="Mes"
        className="w-44"
        value={month}
        onChange={onChange}
        options={months.map((value) => ({ value, label: monthLabel(value) }))}
      />
      <Button
        size="sm"
        variant="ghost"
        aria-label="Mes siguiente"
        disabled={index < 0 || index >= months.length - 1}
        onClick={() => onChange(months[index + 1])}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </Button>
    </div>
  )
}
