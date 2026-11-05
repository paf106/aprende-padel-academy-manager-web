import { describe, expect, it } from 'vitest'
import { buildSettlements, creditApplies, sessionPay, simulateMonth } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { addDays } from '@/lib/core/calendar-nav'
import { localTodayInTimeZone } from '@/lib/core/dates'
import { teacherIsPaid } from '@/lib/payments/teacher-pay'

const today = localTodayInTimeZone('Europe/Madrid')

describe('class cancelled because no student came', () => {
  it('pays the teacher only for finished classes and for no-show cancellations', () => {
    expect(teacherIsPaid('completed')).toBe(true)
    expect(teacherIsPaid('cancelled', 'no_show')).toBe(true)
    expect(teacherIsPaid('cancelled', 'rain')).toBe(false)
    expect(teacherIsPaid('cancelled', 'single_attendee')).toBe(false)
    expect(teacherIsPaid('cancelled')).toBe(false)
    expect(teacherIsPaid('pending')).toBe(false)
  })

  it('pays the session like a finished one, with the rate for the enrolled students', () => {
    const base = makeAppData()
    const session = base.sessions.find((s) => s.groupId)!
    const finished = mutations.updateSession(base, session.id, { status: 'completed' })
    const noShow = mutations.cancelSessions(base, [session.id], 'no_show')
    const rain = mutations.cancelSessions(base, [session.id], 'rain')
    const pay = (state: typeof base) =>
      sessionPay(
        state,
        state.sessions.find((s) => s.id === session.id)!,
      )
    expect(pay(finished)).toBeGreaterThan(0)
    expect(pay(noShow)).toBe(pay(finished))
    expect(pay(rain)).toBe(0)
  })

  it('counts in the monthly settlement of the teacher', () => {
    const base = makeAppData()
    const session = base.sessions.find((s) => s.groupId)!
    const rain = mutations.cancelSessions(base, [session.id], 'rain')
    const noShow = mutations.cancelSessions(base, [session.id], 'no_show')
    const total = (state: typeof base) =>
      buildSettlements(state, session.date).find((t) => t.teacherId === session.teacherId)!
    expect(total(rain).sessions).toBe(0)
    expect(total(noShow).sessions).toBe(1)
    expect(total(noShow).totalCents).toBeGreaterThan(0)
  })

  it('students still pay the class, even if no-show is listed as a discount reason', () => {
    const base = mutations.setSeasonEnd(makeAppData(), addDays(today, 120))
    const madre = base.students.find((s) => s.firstName === 'Madre')!
    const month = addDays(today, 40).slice(0, 7)
    const session = base.sessions.find((s) => s.groupId && s.date.startsWith(month))!
    const billing = { ...base.billing, creditReasons: [...base.billing.creditReasons, 'no_show' as const] }
    const noShow = { ...mutations.cancelSessions(base, [session.id], 'no_show'), billing }
    const rain = mutations.cancelSessions(base, [session.id], 'rain')
    const billed = (state: typeof base) =>
      simulateMonth(state, madre.accountId, month, []).lines.find((l) => l.memberId === madre.id)!
        .billedClasses
    expect(billed(noShow)).toBe(billed(base))
    expect(billed(rain)).toBe(billed(base) - 1)
    expect(
      creditApplies(
        noShow,
        noShow.sessions.find((s) => s.id === session.id)!,
        madre.id,
      ),
    ).toBe(false)
  })

  it('single attendee stays as it was: one student is not charged and the teacher is not paid', () => {
    const base = makeAppData()
    const session = base.sessions.find((s) => s.groupId)!
    const [first, second] = session.studentIds
    const state = mutations.cancelSessions(base, [session.id], 'single_attendee', [first])
    const cancelled = state.sessions.find((s) => s.id === session.id)!
    expect(creditApplies(state, cancelled, first)).toBe(true)
    expect(creditApplies(state, cancelled, second)).toBe(false)
    expect(sessionPay(state, cancelled)).toBe(0)
  })
})

describe('resetting a class to pending', () => {
  it('a cancelled class goes back to pending without reason and gets its charges back', () => {
    const base = makeAppData()
    const session = base.sessions.find((s) => s.groupId)!
    const guest = base.students.find((s) => s.firstName === 'Luis')!
    const withGuest = mutations.addGuestToSession(base, session.id, guest.id)
    expect(withGuest.extraCharges.some((c) => c.studentId === guest.id)).toBe(true)

    const cancelled = mutations.cancelSessions(withGuest, [session.id], 'single_attendee', [guest.id])
    expect(cancelled.extraCharges.some((c) => c.studentId === guest.id)).toBe(false)

    const reset = mutations.resetSession(cancelled, session.id)
    const after = reset.sessions.find((s) => s.id === session.id)!
    expect(after.status).toBe('pending')
    expect(after.cancelReason).toBeUndefined()
    expect(after.creditedStudentIds).toBeUndefined()
    expect(
      reset.extraCharges.filter((c) => c.studentId === guest.id && c.sessionId === session.id),
    ).toHaveLength(1)
  })

  it('a private class gets its price back and is not charged twice', () => {
    const base = makeAppData()
    const adults = base.students.filter((s) => s.category === 'adult').slice(0, 2)
    const id = crypto.randomUUID()
    const withPrivate = mutations.addSession(base, {
      id,
      groupId: '',
      kind: 'private',
      clubId: base.clubs[0].id,
      teacherId: base.teachers[0].id,
      date: addDays(today, 3),
      start: '10:00',
      duration: 60,
      category: 'adult',
      status: 'pending',
      manual: true,
      studentIds: adults.map((s) => s.id),
    })
    const cancelled = mutations.cancelSessions(withPrivate, [id], 'rain')
    expect(cancelled.extraCharges.filter((c) => c.sessionId === id)).toHaveLength(0)
    const reset = mutations.resetSession(cancelled, id)
    expect(reset.extraCharges.filter((c) => c.sessionId === id)).toHaveLength(2)
    expect(mutations.resetSession(reset, id)).toBe(reset)
  })

  it('a finished class stops being paid to the teacher and keeps its attendance', () => {
    const base = makeAppData()
    const session = base.sessions.find((s) => s.groupId)!
    const [first] = session.studentIds
    let state = mutations.updateSession(base, session.id, { attendance: { [first]: 'present' } })
    state = mutations.updateSession(state, session.id, { status: 'completed' })
    const pay = (data: typeof base) =>
      sessionPay(
        data,
        data.sessions.find((s) => s.id === session.id)!,
      )
    expect(pay(state)).toBeGreaterThan(0)
    const reset = mutations.resetSession(state, session.id)
    expect(pay(reset)).toBe(0)
    expect(reset.sessions.find((s) => s.id === session.id)?.attendance?.[first]).toBe('present')
  })
})
