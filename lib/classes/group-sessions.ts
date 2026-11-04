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
type ExistingSession = { id: string; groupId: string; date: string; status: string }

export const SESSION_HORIZON_WEEKS = 8

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
 * When a group changes, pending classes from `today` on are replaced by the new schedule.
 * Completed, cancelled and past classes are never touched.
 */
export function planRegeneration(
  existing: readonly ExistingSession[],
  groupId: string,
  group: GroupSchedule,
  today: string,
  closedDays: readonly string[] = [],
) {
  const remove = existing
    .filter((s) => s.groupId === groupId && s.date >= today && s.status === 'pending')
    .map((s) => s.id)
  const to = addDays(today, SESSION_HORIZON_WEEKS * 7)
  return { remove, add: generateSlots(group, { from: today, to }, closedDays) }
}
