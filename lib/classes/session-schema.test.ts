import { describe, expect, it } from 'vitest'
import { sessionConflicts, sessionSchema, type SessionInput } from '@/lib/classes/session-schema'
import { validate } from '@/lib/core/validation'

const valid: SessionInput = {
  groupId: '',
  date: '2026-10-27',
  start: '19:00',
  duration: 60,
  clubId: 'pioz',
  teacherId: 't1',
  category: 'adult',
  level: 'intermediate',
  studentIds: ['a', 'b'],
}

describe('session schema', () => {
  it('accepts a valid class', () => expect(validate(sessionSchema, valid).ok).toBe(true))
  it('only allows 60 or 90 minutes', () =>
    expect(validate(sessionSchema, { ...valid, duration: 45 }).ok).toBe(false))
  it('enforces the capacity per category', () => {
    const five = ['a', 'b', 'c', 'd', 'e']
    expect(validate(sessionSchema, { ...valid, studentIds: five }).ok).toBe(false)
    expect(validate(sessionSchema, { ...valid, category: 'child', studentIds: five }).ok).toBe(true)
    expect(validate(sessionSchema, { ...valid, category: 'child', studentIds: [...five, 'f', 'g'] }).ok).toBe(
      false,
    )
  })
  it('requires at least one student', () => {
    expect(validate(sessionSchema, { ...valid, studentIds: [] })).toMatchObject({
      ok: false,
      errors: { studentIds: expect.any(String) },
    })
  })
})

describe('session conflicts', () => {
  const slot = { date: '2026-10-27', start: '19:00', duration: 60 }
  const base = {
    slot,
    teacherId: 't1',
    category: 'adult' as const,
    students: [{ id: 'a', category: 'adult' as const }],
    existing: [],
  }
  it('is empty without conflicts', () => expect(sessionConflicts(base)).toEqual({}))
  it('rejects mixed categories', () => {
    expect(sessionConflicts({ ...base, students: [{ id: 'a', category: 'child' }] })).toHaveProperty(
      'studentIds',
    )
  })
  it('rejects teacher overlaps but ignores cancelled classes', () => {
    const existing = [{ date: slot.date, start: '19:30', duration: 60, teacherId: 't1', status: 'pending' }]
    expect(sessionConflicts({ ...base, existing })).toHaveProperty('start')
    expect(sessionConflicts({ ...base, existing: [{ ...existing[0], status: 'cancelled' }] })).toEqual({})
  })
  it('rejects closed days', () => {
    expect(sessionConflicts({ ...base, closedDays: [slot.date] })).toHaveProperty('date')
  })
})
