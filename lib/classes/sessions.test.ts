import { describe, expect, it } from 'vitest'
import { slotsOverlap } from '@/lib/classes/sessions'

describe('slotsOverlap', () => {
  const base = { date: '2026-10-26', start: '19:00', duration: 60 }
  it('detects overlapping slots', () => {
    expect(slotsOverlap(base, { ...base, start: '19:30' })).toBe(true)
    expect(slotsOverlap(base, { ...base, start: '18:30', duration: 90 })).toBe(true)
  })
  it('allows back-to-back classes and different days', () => {
    expect(slotsOverlap(base, { ...base, start: '20:00' })).toBe(false)
    expect(slotsOverlap(base, { ...base, date: '2026-10-27' })).toBe(false)
  })
})
