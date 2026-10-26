import { describe, expect, it } from 'vitest'
import { generateSlots, planRegeneration, type GroupSchedule } from '@/lib/classes/group-sessions'

const group: GroupSchedule = {
  weekday: 1,
  start: '19:00',
  duration: 60,
  startsOn: '2026-10-01',
  endsOn: '',
  active: true,
}

describe('generateSlots', () => {
  it('generates one class per week on the group weekday', () => {
    const slots = generateSlots(group, { from: '2026-10-26', to: '2026-11-16' })
    expect(slots.map((s) => s.date)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16'])
  })
  it('skips closed days and respects start and end dates', () => {
    const slots = generateSlots(
      { ...group, startsOn: '2026-11-01', endsOn: '2026-11-09' },
      { from: '2026-10-26', to: '2026-12-01' },
      ['2026-11-02'],
    )
    expect(slots.map((s) => s.date)).toEqual(['2026-11-09'])
  })
  it('generates nothing for inactive groups', () => {
    expect(generateSlots({ ...group, active: false }, { from: '2026-10-26', to: '2026-11-30' })).toEqual([])
  })
})

describe('planRegeneration', () => {
  const existing = [
    { id: 'past', groupId: 'g1', date: '2026-10-19', status: 'completed' },
    { id: 'future', groupId: 'g1', date: '2026-10-26', status: 'pending' },
    { id: 'cancelled', groupId: 'g1', date: '2026-11-02', status: 'cancelled' },
    { id: 'other', groupId: 'g2', date: '2026-11-09', status: 'pending' },
  ]
  it('only replaces pending future classes of the same group', () => {
    const plan = planRegeneration(existing, 'g1', group, '2026-10-26')
    expect(plan.remove).toEqual(['future'])
    expect(plan.add[0].date).toBe('2026-10-26')
    expect(plan.add).toHaveLength(9)
  })
})
