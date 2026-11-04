import { describe, expect, it } from 'vitest'
import {
  courseConflicts,
  courseDeletionBlockers,
  courseSchema,
  emptyCourseInput,
  generateCourseSlots,
} from '@/lib/classes/course-schema'
import { validate } from '@/lib/core/validation'

const valid = {
  ...emptyCourseInput,
  name: 'Intensivo de junio',
  clubId: 'pioz',
  teacherId: 't1',
  startsOn: '2027-05-31',
  endsOn: '2027-06-03',
  studentIds: ['a'],
}

describe('course schema', () => {
  it('accepts a valid course', () => expect(validate(courseSchema, valid).ok).toBe(true))
  it('needs at least one weekday and an end date after the start', () => {
    expect(validate(courseSchema, { ...valid, weekdays: [] }).ok).toBe(false)
    expect(validate(courseSchema, { ...valid, endsOn: '2027-05-01' }).ok).toBe(false)
  })
  it('respects the capacity of the category', () => {
    expect(validate(courseSchema, { ...valid, studentIds: ['a', 'b', 'c', 'd', 'e'] }).ok).toBe(false)
    expect(
      validate(courseSchema, { ...valid, category: 'child', studentIds: ['a', 'b', 'c', 'd', 'e'] }).ok,
    ).toBe(true)
  })
})

describe('course sessions', () => {
  it('generates Monday to Thursday classes of the June intensive', () => {
    expect(generateCourseSlots(valid).map((s) => s.date)).toEqual([
      '2027-05-31',
      '2027-06-01',
      '2027-06-02',
      '2027-06-03',
    ])
  })
  it('skips closed days and weekdays that were not chosen', () => {
    expect(generateCourseSlots({ ...valid, weekdays: [1, 3] }, ['2027-06-02']).map((s) => s.date)).toEqual([
      '2027-05-31',
    ])
  })
  it('generates nothing for an invalid range', () => {
    expect(generateCourseSlots({ ...valid, endsOn: '2027-05-01' })).toEqual([])
  })
})

describe('course conflicts', () => {
  const slots = generateCourseSlots(valid)
  const base = { teacherId: 't1', category: 'adult' as const, slots, students: [], existing: [] }
  it('is empty without conflicts', () => expect(courseConflicts(base)).toEqual({}))
  it('detects the teacher having another class at that time, ignoring cancelled ones', () => {
    const existing = [
      { date: '2027-06-01', start: '19:30', duration: 60, teacherId: 't1', status: 'pending' },
    ]
    expect(courseConflicts({ ...base, existing })).toHaveProperty('start')
    expect(courseConflicts({ ...base, existing: [{ ...existing[0], status: 'cancelled' }] })).toEqual({})
  })
  it('does not mix categories', () => {
    expect(courseConflicts({ ...base, students: [{ category: 'child' }] })).toHaveProperty('studentIds')
  })
})

describe('course deletion', () => {
  it('is blocked once classes were given', () => {
    expect(courseDeletionBlockers({ completedSessions: 0 })).toEqual([])
    expect(courseDeletionBlockers({ completedSessions: 2 })).toHaveLength(1)
  })
})
