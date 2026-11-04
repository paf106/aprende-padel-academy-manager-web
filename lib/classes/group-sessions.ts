import { addDays, isoWeekday } from '@/lib/core/calendar-nav'

export type GroupSchedule = {
  weekday: number
  start: string
  duration: 60 | 90
  startsOn: string
  endsOn: string
  active: boolean
}
export type GeneratedSlot = { date: string; start: string; duration: 60 | 90 }
type ExistingSession = { id: string; groupId: string; date: string; status: string; manual?: boolean }

/** Weekly classes of a group are generated from its start date until the end of the season. */
export const SEASON_MONTH_DAY = '06-30'

/** Last day of the season that contains `today`: 30 June of this year, or of the next one after June. */
export function defaultSeasonEnd(today: string) {
  const [year, month] = today.split('-').map(Number)
  return `${month <= 6 ? year : year + 1}-${SEASON_MONTH_DAY}`
}

/** Weekly class dates of a group inside [from, to], skipping closed days. Inactive groups generate nothing. */
export function generateSlots(
  group: GroupSchedule,
  range: { from: string; to: string },
  closedDays: readonly string[] = [],
): GeneratedSlot[] {
  if (!group.active) return []
  const first = group.startsOn > range.from ? group.startsOn : range.from
  const last = group.endsOn && group.endsOn < range.to ? group.endsOn : range.to
  const slots: GeneratedSlot[] = []
  for (let date = first; date <= last; date = addDays(date, 1)) {
    if (isoWeekday(date) === group.weekday && !closedDays.includes(date)) {
      slots.push({ date, start: group.start, duration: group.duration })
    }
  }
  return slots
}

/**
 * What changes when a group is created or edited, from `range.from` to `range.to`:
 * pending classes on a date that still fits the schedule are kept (and updated in place),
 * pending classes that no longer fit are removed, and missing dates are added.
 * Completed, cancelled, past and manually created classes are never removed.
 */
export function planRegeneration(
  existing: readonly ExistingSession[],
  groupId: string,
  group: GroupSchedule,
  range: { from: string; to: string },
  closedDays: readonly string[] = [],
) {
  const slots = generateSlots(group, range, closedDays)
  const dates = new Set(slots.map((slot) => slot.date))
  const ofGroup = existing.filter((s) => s.groupId === groupId && s.date >= range.from)
  const pending = ofGroup.filter((s) => s.status === 'pending' && !s.manual)
  const taken = new Set(ofGroup.map((s) => s.date))
  return {
    keep: pending.filter((s) => dates.has(s.date)).map((s) => s.id),
    remove: pending.filter((s) => !dates.has(s.date)).map((s) => s.id),
    add: slots.filter((slot) => !taken.has(slot.date)),
  }
}
