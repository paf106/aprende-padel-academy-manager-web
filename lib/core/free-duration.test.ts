import { describe, expect, it } from 'vitest'
import { freeDurationAt } from '@/lib/core/calendar'

describe('freeDurationAt', () => {
  const busy = [{ start: 17 * 60, end: 18 * 60 }]
  it('allows up to 90 minutes in free space', () => expect(freeDurationAt([], 10 * 60)).toBe(90))
  it('is blocked inside an event', () => {
    expect(freeDurationAt(busy, 17 * 60)).toBe(0)
    expect(freeDurationAt(busy, 17 * 60 + 30)).toBe(0)
  })
  it('is free right after an event ends', () => expect(freeDurationAt(busy, 18 * 60)).toBe(90))
  it('limits the duration before the next event', () => {
    expect(freeDurationAt(busy, 15 * 60 + 30)).toBe(90)
    expect(freeDurationAt(busy, 16 * 60)).toBe(60)
    expect(freeDurationAt(busy, 16 * 60 + 30)).toBe(0)
  })
})
