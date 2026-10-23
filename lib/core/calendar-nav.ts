import type { CalendarView } from '@/lib/core/dates'

function parse(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function format(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
}

export function addDays(date: string, days: number) {
  const value = parse(date)
  value.setUTCDate(value.getUTCDate() + days)
  return format(value)
}

export function weekDays(date: string) {
  const value = parse(date)
  const monday = addDays(date, -((value.getUTCDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function shiftDate(date: string, view: CalendarView, delta: number) {
  if (view === 'day') return addDays(date, delta)
  if (view === 'week') return addDays(date, delta * 7)
  const value = parse(date)
  const day = value.getUTCDate()
  const months = view === 'month' ? delta : delta * 12
  value.setUTCDate(1)
  value.setUTCMonth(value.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate()
  value.setUTCDate(Math.min(day, lastDay))
  return format(value)
}

export function visibleRange(date: string, view: CalendarView) {
  if (view === 'day') return { from: date, to: date }
  if (view === 'week') {
    const days = weekDays(date)
    return { from: days[0], to: days[6] }
  }
  const value = parse(date)
  if (view === 'month') {
    const first = format(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)))
    const last = format(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)))
    return { from: first, to: last }
  }
  return { from: `${value.getUTCFullYear()}-01-01`, to: `${value.getUTCFullYear()}-12-31` }
}
