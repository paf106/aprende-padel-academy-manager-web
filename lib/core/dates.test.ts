import { describe, expect, it } from 'vitest'
import { localTimeInTimeZone, zonedInstant } from '@/lib/core/dates'

const madrid = (date: string, time: string) => zonedInstant(date, time, 'Europe/Madrid')

describe('zonedInstant (Europe/Madrid)', () => {
  it('uses +01:00 in winter and +02:00 in summer', () => {
    expect(madrid('2026-12-14', '19:00').toISOString()).toBe('2026-12-14T18:00:00.000Z')
    expect(madrid('2026-07-13', '19:00').toISOString()).toBe('2026-07-13T17:00:00.000Z')
  })
  it('follows the days the clocks change', () => {
    expect(madrid('2026-10-24', '19:00').toISOString()).toBe('2026-10-24T17:00:00.000Z')
    expect(madrid('2026-10-25', '19:00').toISOString()).toBe('2026-10-25T18:00:00.000Z')
    expect(madrid('2027-03-27', '19:00').toISOString()).toBe('2027-03-27T18:00:00.000Z')
    expect(madrid('2027-03-28', '19:00').toISOString()).toBe('2027-03-28T17:00:00.000Z')
  })
  it('shows the same wall-clock time in the calendar all year', () => {
    for (const date of ['2026-01-12', '2026-07-13', '2026-10-25', '2027-03-28']) {
      expect(localTimeInTimeZone(madrid(date, '19:30'), 'Europe/Madrid')).toBe(19 * 60 + 30)
    }
  })
  it('handles midnight and early classes', () => {
    expect(madrid('2026-12-14', '00:30').toISOString()).toBe('2026-12-13T23:30:00.000Z')
    expect(madrid('2026-07-13', '08:00').toISOString()).toBe('2026-07-13T06:00:00.000Z')
  })
})
