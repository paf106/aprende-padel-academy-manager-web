import { addDays } from '@/lib/core/calendar-nav'

/** Weekly dates from `from` until `to`, inclusive. The first date is always kept; later closed days are skipped. */
export function weeklyDates(from: string, to: string, closedDays: readonly string[] = []) {
  const dates = [from]
  for (let date = addDays(from, 7); date <= to; date = addDays(date, 7)) {
    if (!closedDays.includes(date)) dates.push(date)
  }
  return dates
}
