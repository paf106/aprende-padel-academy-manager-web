import { localTodayInTimeZone } from '@/lib/core/dates'
import { describe, expect, it } from 'vitest'
import { validate } from '@/lib/core/validation'
import { teacherDeletionBlockers, studentDeletionBlockers } from '@/lib/classes/deletion'
import { emptyStudentInput, studentSchema } from '@/lib/classes/student-schema'
import { teacherSchema } from '@/lib/classes/teacher-schema'

const validStudent = {
  ...emptyStudentInput,
  firstName: 'Ana',
  lastName: 'García',
  birthDate: '1990-05-12',
  clubId: 'pioz',
}

describe('student schema', () => {
  it('accepts a valid adult', () => {
    expect(validate(studentSchema, validStudent).ok).toBe(true)
  })
  it('requires a guardian for children', () => {
    const result = validate(studentSchema, { ...validStudent, category: 'child' })
    expect(result).toMatchObject({ ok: false, errors: { guardianName: expect.any(String) } })
    expect(validate(studentSchema, { ...validStudent, category: 'child', guardianName: 'María' }).ok).toBe(
      true,
    )
  })
  it('reports one message per field', () => {
    const result = validate(studentSchema, emptyStudentInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['birthDate', 'clubId', 'firstName'])
  })
  it('rejects future birth dates and invalid emails', () => {
    expect(validate(studentSchema, { ...validStudent, birthDate: '2999-01-01' }).ok).toBe(false)
    expect(validate(studentSchema, { ...validStudent, email: 'nope' }).ok).toBe(false)
  })
})

describe('teacher schema', () => {
  const valid = {
    firstName: 'Carlos',
    lastName: 'Ruiz',
    email: 'carlos@club.es',
    phone: '600111222',
    clubIds: ['pioz'],
  }
  it('accepts a valid teacher', () => expect(validate(teacherSchema, valid).ok).toBe(true))
  it('only needs a first name and a club', () => {
    expect(
      validate(teacherSchema, { firstName: 'Nacho', lastName: '', email: '', phone: '', clubIds: ['pioz'] })
        .ok,
    ).toBe(true)
  })
  it('requires at least one club', () => {
    expect(validate(teacherSchema, { ...valid, clubIds: [] })).toMatchObject({
      ok: false,
      errors: { clubIds: expect.any(String) },
    })
  })
})

describe('deletion rules', () => {
  it('allows deleting entities without history', () => {
    expect(studentDeletionBlockers({ groups: 0, charges: 0 })).toEqual([])
    expect(teacherDeletionBlockers({ groups: 0, sessions: 0, settlements: 0 })).toEqual([])
  })
  it('lists every blocker', () => {
    expect(studentDeletionBlockers({ groups: 2, charges: 1 })).toHaveLength(2)
    expect(teacherDeletionBlockers({ groups: 1, sessions: 3, settlements: 1 })).toHaveLength(3)
  })
})

describe('student birth date', () => {
  it('rejects a birth date in the future and accepts today', () => {
    const today = localTodayInTimeZone('Europe/Madrid')
    expect(validate(studentSchema, { ...validStudent, birthDate: today }).ok).toBe(true)
    expect(validate(studentSchema, { ...validStudent, birthDate: '2999-01-01' }).ok).toBe(false)
  })
})
