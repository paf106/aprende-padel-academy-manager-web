import { describe, expect, it } from 'vitest'
import { weeklyDates } from '@/lib/classes/series'

describe('weeklyDates', () => {
  it('repeats every week until the end date, inclusive', () => {
    expect(weeklyDates('2026-11-02', '2026-11-23')).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
      '2026-11-23',
    ])
  })
  it('is a single date when the season already ended', () => {
    expect(weeklyDates('2026-11-02', '2026-10-01')).toEqual(['2026-11-02'])
  })
  it('skips closed days but keeps the first date', () => {
    expect(weeklyDates('2026-11-02', '2026-11-23', ['2026-11-02', '2026-11-16'])).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-23',
    ])
  })
})
