import { describe, expect, it } from 'vitest'
import { clubDeletionBlockers, groupDeletionBlockers } from '@/lib/classes/deletion'
import { clubSchema, emptyClubInput } from '@/lib/classes/club-schema'
import { emptyGroupInput, groupConflicts, groupSchema } from '@/lib/classes/group-schema'
import { fitWithin, imageFileError } from '@/lib/core/image'
import { validate } from '@/lib/core/validation'

const validClub = {
  ...emptyClubInput,
  name: 'Pioz',
  address: 'Calle Mayor 12',
  city: 'Pioz',
  postalCode: '19162',
}

describe('club schema', () => {
  it('accepts a valid club, with or without photo', () => {
    expect(validate(clubSchema, validClub).ok).toBe(true)
    expect(validate(clubSchema, { ...validClub, photo: 'data:image/webp;base64,AAA' }).ok).toBe(true)
  })
  it('requires name, address, city and at least one court', () => {
    const result = validate(clubSchema, { ...emptyClubInput, courts: 0 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['address', 'city', 'courts', 'name'])
  })
  it('rejects invalid postal codes and non-image photos', () => {
    expect(validate(clubSchema, { ...validClub, postalCode: '123' }).ok).toBe(false)
    expect(validate(clubSchema, { ...validClub, photo: 'https://x.com/a.png' }).ok).toBe(false)
    expect(
      validate(clubSchema, {
        ...validClub,
        photo: 'https://p.supabase.co/storage/v1/object/public/club-photos/org/a.webp',
      }).ok,
    ).toBe(true)
  })
})

describe('image helpers', () => {
  it('validates type and size', () => {
    expect(imageFileError({ type: 'image/png', size: 1000 })).toBeNull()
    expect(imageFileError({ type: 'application/pdf', size: 1000 })).not.toBeNull()
    expect(imageFileError({ type: 'image/jpeg', size: 6 * 1024 * 1024 })).not.toBeNull()
  })
  it('scales down keeping the aspect ratio and never scales up', () => {
    expect(fitWithin(2400, 1200, 1200)).toEqual({ width: 1200, height: 600 })
    expect(fitWithin(800, 600, 1200)).toEqual({ width: 800, height: 600 })
  })
})

const validGroup = {
  ...emptyGroupInput,
  name: 'Adultos medio',
  clubId: 'pioz',
  teacherId: 't1',
  startsOn: '2026-09-14',
  studentIds: ['a'],
}

describe('group schema', () => {
  it('accepts a valid group with an open end date', () =>
    expect(validate(groupSchema, validGroup).ok).toBe(true))
  it('rejects an end date before the start and a full roster', () => {
    expect(validate(groupSchema, { ...validGroup, endsOn: '2026-09-01' }).ok).toBe(false)
    expect(validate(groupSchema, { ...validGroup, studentIds: ['a', 'b', 'c', 'd', 'e'] }).ok).toBe(false)
  })
  it('detects teacher overlaps on the same weekday only against other active groups', () => {
    const other = { id: 'x', teacherId: 't1', weekday: 1, start: '19:30', duration: 60, active: true }
    const base = {
      teacherId: 't1',
      weekday: 1,
      start: '19:00',
      duration: 60,
      category: 'adult' as const,
      students: [],
      others: [other],
    }
    expect(groupConflicts(base)).toHaveProperty('start')
    expect(groupConflicts({ ...base, weekday: 2 })).toEqual({})
    expect(groupConflicts({ ...base, groupId: 'x' })).toEqual({})
    expect(groupConflicts({ ...base, others: [{ ...other, active: false }] })).toEqual({})
  })
})

describe('deletion rules', () => {
  it('lists club and group blockers', () => {
    expect(clubDeletionBlockers({ groups: 0, students: 0, teachers: 0 })).toEqual([])
    expect(clubDeletionBlockers({ groups: 2, students: 1, teachers: 1 })).toHaveLength(3)
    expect(groupDeletionBlockers({ completedSessions: 0 })).toEqual([])
    expect(groupDeletionBlockers({ completedSessions: 3 })).toHaveLength(1)
  })
})

describe('mixed groups', () => {
  it('allows a child and an adult in the same group', () => {
    expect(
      groupConflicts({
        teacherId: 't',
        weekday: 1,
        start: '19:00',
        duration: 60,
        category: 'child',
        students: [{ category: 'child' }, { category: 'adult' }],
        others: [],
      }),
    ).toEqual({})
  })
})
