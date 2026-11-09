import { describe, expect, it } from 'vitest'
import { clubCalendarColor, layoutDayEvents } from '@/lib/core/calendar'
import { timeZoneOffsetLabel } from '@/lib/core/dates'

describe('calendar event layout', () => {
  it('cascades overlaps and keeps heights proportional to duration', () => {
    const layout = layoutDayEvents([
      { id: 'one', startsAt: '2026-10-06T09:00:00', endsAt: '2026-10-06T10:30:00' },
      { id: 'two', startsAt: '2026-10-06T09:30:00', endsAt: '2026-10-06T10:00:00' },
    ])
    expect(layout[0].left).toBe(0)
    expect(layout[0].width).toBe(55)
    expect(layout[0].height).toBe(100)
    expect(layout[1].left).toBe(50)
    expect(layout[1].zIndex).toBeGreaterThan(layout[0].zIndex ?? 0)
  })

  it('never hides events even with more than three simultaneous classes', () => {
    const events = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      startsAt: `2026-10-06T09:0${index}:00`,
      endsAt: '2026-10-06T10:00:00',
    }))
    const result = layoutDayEvents(events)
    expect(result).toHaveLength(5)
    expect(result.every((event) => !event.hidden)).toBe(true)
    expect(result.at(-1)?.left).toBeGreaterThan(result[0].left)
  })

  it('uses the full day by default and clips sessions to the visible hours', () => {
    const result = layoutDayEvents([
      { id: 'before-midnight', startsAt: '2026-10-06T00:30:00', endsAt: '2026-10-06T01:00:00' },
      { id: 'late', startsAt: '2026-10-06T23:30:00', endsAt: '2026-10-07T00:30:00' },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].top).toBeGreaterThan(0)
    expect(result[1].top).toBeGreaterThan(result[0].top)
    expect(result[1].height).toBe(32)
  })

  it('keeps colors stable for the same club id', () => {
    expect(clubCalendarColor('club-a')).toEqual(clubCalendarColor('club-a'))
  })

  it('also accepts numeric palette indexes', () => {
    expect(clubCalendarColor(0)).toEqual(clubCalendarColor(7))
  })

  it('shows the local time offset for a given date', () => {
    expect(timeZoneOffsetLabel('Europe/Madrid', '2026-01-15T12:00:00Z')).toBe('GMT+01')
    expect(timeZoneOffsetLabel('Europe/Madrid', '2026-07-15T12:00:00Z')).toBe('GMT+02')
  })
})
