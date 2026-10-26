import { describe, expect, it } from 'vitest'
import { expandClosedDays, type Closure } from '@/lib/classes/closures'

const closures: Closure[] = [
  { id: 1, clubId: '', from: '2026-12-24', to: '2026-12-26', reason: 'Navidad' },
  { id: 2, clubId: 'pioz', from: '2026-12-08', to: '2026-12-08', reason: 'Festivo local' },
]

describe('expandClosedDays', () => {
  it('expands ranges and includes organization-wide closures', () => {
    expect(expandClosedDays(closures, 'pioz')).toEqual([
      '2026-12-24',
      '2026-12-25',
      '2026-12-26',
      '2026-12-08',
    ])
  })
  it('ignores closures of other clubs', () => {
    expect(expandClosedDays(closures, 'corpa')).toEqual(['2026-12-24', '2026-12-25', '2026-12-26'])
  })
})
