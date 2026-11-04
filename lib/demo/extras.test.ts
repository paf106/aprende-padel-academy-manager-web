import { describe, expect, it } from 'vitest'
import { buildCharges, creditApplies } from '@/lib/demo/billing'
import type { Session } from '@/lib/demo/data'
import { demoStore } from '@/lib/demo/store'

const today = '2026-11-04'
const futureSession = () => {
  const state = demoStore.getSnapshot()
  return state.sessions.find((s) => s.date > today && s.status === 'pending' && s.groupId)!
}
const accountCharge = (accountId: string) =>
  buildCharges(demoStore.getSnapshot(), today).find((c) => c.account.id === accountId)

describe('single classes (drop-in)', () => {
  it('adds the single class price to the account month and removes it when the class is cancelled', () => {
    const session = futureSession()
    const state = demoStore.getSnapshot()
    const guest = state.students.find(
      (s) => s.active && s.category === session.category && !session.studentIds.includes(s.id),
    )!
    const before = accountCharge(guest.accountId)?.dueCents ?? 0

    demoStore.addGuestToSession(session.id, guest.id, 'drop_in')
    const after = accountCharge(guest.accountId)!
    expect(after.extraCharges).toHaveLength(1)
    expect(after.extraCharges[0].amountCents).toBe(session.duration === 90 ? 2250 : 1500)
    expect(after.dueCents - before).toBe(after.extraCharges[0].amountCents)

    demoStore.cancelSessions([session.id], 'rain')
    expect(accountCharge(guest.accountId)?.extraCharges ?? []).toHaveLength(0)
  })

  it('a recovery class costs nothing', () => {
    const session = futureSession()
    const guest = demoStore
      .getSnapshot()
      .students.find(
        (s) => s.active && s.category === session.category && !session.studentIds.includes(s.id),
      )!
    const extrasBefore = demoStore.getSnapshot().extraCharges.length

    demoStore.addGuestToSession(session.id, guest.id, 'recovery')
    expect(demoStore.getSnapshot().extraCharges).toHaveLength(extrasBefore)
    expect(demoStore.getSnapshot().sessions.find((s) => s.id === session.id)?.guests?.[guest.id]).toBe(
      'recovery',
    )
  })
})

describe('private classes', () => {
  it('charges each student the class plus their share of the court', () => {
    const state = demoStore.getSnapshot()
    const club = state.clubs[0]
    const adults = state.students.filter((s) => s.active && s.category === 'adult').slice(0, 2)
    const session: Session = {
      id: 'private-test',
      groupId: '',
      kind: 'private',
      clubId: club.id,
      teacherId: state.teachers[0].id,
      date: '2026-11-20',
      start: '10:00',
      duration: 60,
      category: 'adult',
      status: 'pending',
      studentIds: adults.map((s) => s.id),
    }
    demoStore.addSession(session)
    const charges = demoStore.getSnapshot().extraCharges.filter((c) => c.sessionId === 'private-test')
    expect(charges).toHaveLength(2)
    expect(charges.every((c) => c.amountCents === 2500 + club.courtPriceCents / 2)).toBe(true)
    expect(charges.every((c) => c.month === '2026-11')).toBe(true)
  })
})

describe('cancellation credits', () => {
  const state = demoStore.getSnapshot()
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
