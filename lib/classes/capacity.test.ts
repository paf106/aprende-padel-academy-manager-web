import { describe, expect, it } from 'vitest'
import { freeSpots, hasFreeSpot } from '@/lib/classes/capacity'

describe('capacity', () => {
  it('allows 4 adults and 6 children by default', () => {
    expect(hasFreeSpot('adult', 3)).toBe(true)
    expect(hasFreeSpot('adult', 4)).toBe(false)
    expect(freeSpots('child', 4)).toBe(2)
    expect(freeSpots('child', 9)).toBe(0)
  })
})
