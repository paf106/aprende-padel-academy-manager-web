import { describe, expect, it } from 'vitest'
import {
  defaultSeasonEnd,
  generateSlots,
  planRegeneration,
  type GroupSchedule,
} from '@/lib/classes/group-sessions'

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
    { id: 'stale', groupId: 'g1', date: '2026-10-28', status: 'pending' },
    { id: 'manual', groupId: 'g1', date: '2026-11-04', status: 'pending', manual: true },
    { id: 'cancelled', groupId: 'g1', date: '2026-11-02', status: 'cancelled' },
    { id: 'other', groupId: 'g2', date: '2026-11-09', status: 'pending' },
  ]
  const range = { from: '2026-10-26', to: '2026-12-31' }
  it('keeps fitting classes, removes the ones that no longer fit and adds the missing dates', () => {
    const plan = planRegeneration(existing, 'g1', group, range)
    expect(plan.keep).toEqual(['future'])
    expect(plan.remove).toEqual(['stale'])
    expect(plan.add.map((s) => s.date)).not.toContain('2026-10-26')
    expect(plan.add.map((s) => s.date)).not.toContain('2026-11-02')
    expect(plan.add[0].date).toBe('2026-11-09')
  })
  it('fills the calendar until the end of the season', () => {
    const plan = planRegeneration([], 'g1', group, { from: '2026-10-01', to: '2027-06-30' })
    expect(plan.add.at(-1)?.date).toBe('2027-06-28')
    expect(plan.add).toHaveLength(39)
  })
  it('knows the end of the season', () => {
    expect(defaultSeasonEnd('2026-11-04')).toBe('2027-06-30')
    expect(defaultSeasonEnd('2027-03-01')).toBe('2027-06-30')
    expect(defaultSeasonEnd('2027-07-15')).toBe('2028-06-30')
  })
})
