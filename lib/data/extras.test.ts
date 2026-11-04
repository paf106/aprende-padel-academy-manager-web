import { describe, expect, it } from 'vitest'
import { buildCharges, creditApplies } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import type { AppData, Session } from '@/lib/data/types'
import { localTodayInTimeZone } from '@/lib/core/dates'

const today = localTodayInTimeZone('Europe/Madrid')
const futureSession = (state: AppData) =>
  state.sessions.find((s) => s.date > today && s.status === 'pending' && s.groupId)!
const guestFor = (state: AppData, session: Session) =>
  state.students.find(
    (s) => s.active && s.category === session.category && !session.studentIds.includes(s.id),
  )!
const accountCharge = (state: AppData, accountId: string) =>
  buildCharges(state, today).find((c) => c.account.id === accountId)

describe('single classes (drop-in)', () => {
  it('adds the single class price to the account month and removes it when the class is cancelled', () => {
    const base = makeAppData()
    const session = futureSession(base)
    const guest = guestFor(base, session)
    const before = accountCharge(base, guest.accountId)?.dueCents ?? 0

    const added = mutations.addGuestToSession(base, session.id, guest.id, 'drop_in')
    const after = accountCharge(added, guest.accountId)!
    expect(after.extraCharges).toHaveLength(1)
    expect(after.extraCharges[0].amountCents).toBe(session.duration === 90 ? 2250 : 1500)
    expect(after.dueCents - before).toBe(after.extraCharges[0].amountCents)

    const cancelled = mutations.cancelSessions(added, [session.id], 'rain')
    expect(accountCharge(cancelled, guest.accountId)?.extraCharges ?? []).toHaveLength(0)
  })

  it('a recovery class costs nothing', () => {
    const base = makeAppData()
    const session = futureSession(base)
    const guest = guestFor(base, session)
    const state = mutations.addGuestToSession(base, session.id, guest.id, 'recovery')
    expect(state.extraCharges).toHaveLength(base.extraCharges.length)
    expect(state.sessions.find((s) => s.id === session.id)?.guests?.[guest.id]).toBe('recovery')
  })
})

describe('private classes', () => {
  it('charges each student the class plus their share of the court', () => {
    const base = makeAppData()
    const club = base.clubs[0]
    const adults = base.students.filter((s) => s.active && s.category === 'adult').slice(0, 2)
    const session: Session = {
      id: 'private-test',
      groupId: '',
      kind: 'private',
      clubId: club.id,
      teacherId: base.teachers[0].id,
      date: '2026-11-20',
      start: '10:00',
      duration: 60,
      category: 'adult',
      status: 'pending',
      studentIds: adults.map((s) => s.id),
    }
    const state = mutations.addSession(base, session)
    const charges = state.extraCharges.filter((c) => c.sessionId === 'private-test')
    expect(charges).toHaveLength(2)
    expect(charges.every((c) => c.amountCents === 2500 + club.courtPriceCents / 2)).toBe(true)
    expect(charges.every((c) => c.month === '2026-11')).toBe(true)
  })
})

describe('cancellation credits', () => {
  const state = makeAppData()
  const base: Session = {
    id: 'x',
    groupId: 'g1',
    clubId: 'pioz',
    teacherId: 't1',
    date: '2026-10-05',
    start: '19:00',
    duration: 60,
    category: 'adult',
    status: 'cancelled',
    studentIds: ['a', 'b'],
  }
  it('gives a credit for the configured reasons only', () => {
    expect(creditApplies(state, { ...base, cancelReason: 'rain' }, 'a')).toBe(true)
    expect(creditApplies(state, { ...base, cancelReason: 'teacher_late' }, 'a')).toBe(true)
    expect(creditApplies(state, { ...base, cancelReason: 'other' }, 'a')).toBe(false)
  })
  it('when only one student showed up, only that student gets the credit', () => {
    const single = { ...base, cancelReason: 'single_attendee', creditedStudentIds: ['a'] }
    expect(creditApplies(state, single, 'a')).toBe(true)
    expect(creditApplies(state, single, 'b')).toBe(false)
  })
})

describe('deleting a class', () => {
  it('removes a private class with its charges', () => {
    const base = makeAppData()
    const adults = base.students.filter((s) => s.category === 'adult').slice(0, 2)
    const session: Session = {
      id: crypto.randomUUID(),
      groupId: '',
      kind: 'private',
      clubId: base.clubs[0].id,
      teacherId: base.teachers[0].id,
      date: '2026-11-20',
      start: '10:00',
      duration: 60,
      category: 'adult',
      status: 'pending',
      studentIds: adults.map((s) => s.id),
    }
    const added = mutations.addSession(base, session)
    expect(added.extraCharges.length).toBeGreaterThan(base.extraCharges.length)
    const removed = mutations.deleteSession(added, session.id)
    expect(removed.sessions.some((s) => s.id === session.id)).toBe(false)
    expect(removed.extraCharges).toEqual(base.extraCharges)
  })

  it('does not delete classes that come from a group or a course', () => {
    const base = makeAppData()
    const fromGroup = base.sessions.find((s) => s.groupId)!
    expect(mutations.deleteSession(base, fromGroup.id)).toBe(base)
    const fromCourse = base.sessions.find((s) => s.courseId)!
    expect(mutations.deleteSession(base, fromCourse.id)).toBe(base)
  })
})
