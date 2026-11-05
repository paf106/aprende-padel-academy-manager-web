import { describe, expect, it } from 'vitest'
import { addDays, addMonths } from '@/lib/core/calendar-nav'
import { localTodayInTimeZone } from '@/lib/core/dates'
import { simulateMonth } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { followingScope, mutations } from '@/lib/data/mutations'
import type { AppData, Session } from '@/lib/data/types'

const today = localTodayInTimeZone('Europe/Madrid')
const longSeason = () => mutations.setSeasonEnd(makeAppData(), addDays(today, 120))
const byName = (state: AppData, name: string) => state.students.find((s) => s.firstName === name)!
const groupSessions = (state: AppData) => state.sessions.filter((s) => s.groupId && !s.manual)

describe('removing a student from a class', () => {
  it('takes a group member out of one class only and charges one class less', () => {
    const base = longSeason()
    const madre = byName(base, 'Madre')
    const month = addMonths(today.slice(0, 7), 1)
    const inMonth = groupSessions(base).filter((s) => s.date.startsWith(month))
    const before = simulateMonth(base, madre.accountId, month, []).lines.find((l) => l.memberId === madre.id)!

    const state = mutations.removeStudentFromSession(base, inMonth[0].id, madre.id, 'one')
    const session = state.sessions.find((s) => s.id === inMonth[0].id)!
    expect(session.studentIds).not.toContain(madre.id)
    expect(session.attendance?.[madre.id]).toBeUndefined()
    expect(state.groups[0].studentIds).toContain(madre.id)
    const after = simulateMonth(state, madre.accountId, month, []).lines.find((l) => l.memberId === madre.id)!
    expect(after.billedClasses).toBe(before.billedClasses - 1)
  })

  it('this and the following leaves the group from that class on', () => {
    const base = longSeason()
    const madre = byName(base, 'Madre')
    const sessions = groupSessions(base)
    const from = sessions[3]
    const state = mutations.removeStudentFromSession(base, from.id, madre.id, 'following')
    expect(state.groups[0].studentIds).not.toContain(madre.id)
    for (const session of groupSessions(state)) {
      expect(session.studentIds.includes(madre.id), session.date).toBe(session.date < from.date)
    }
    expect(followingScope(base.groups, from, madre.id)).toBe('group')
  })

  it('removes a single-class guest with their charge', () => {
    const base = longSeason()
    const session = groupSessions(base)[0]
    const guest = byName(base, 'Luis')
    const withGuest = mutations.addGuestToSession(base, session.id, guest.id)
    expect(withGuest.extraCharges.some((c) => c.studentId === guest.id)).toBe(true)
    const state = mutations.removeStudentFromSession(withGuest, session.id, guest.id, 'one')
    expect(state.extraCharges.some((c) => c.studentId === guest.id)).toBe(false)
    expect(state.sessions.find((s) => s.id === session.id)?.guests).toBeUndefined()
    expect(
      followingScope(
        withGuest.groups,
        withGuest.sessions.find((s) => s.id === session.id)!,
        guest.id,
      ),
    ).toBeNull()
  })

  it('prices a private class again for the person who stays, and keeps the last student', () => {
    const base = longSeason()
    const [one, two] = base.students.filter((s) => s.category === 'adult')
    const session: Session = {
      id: crypto.randomUUID(),
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
      studentIds: [one.id, two.id],
    }
    const pair = mutations.addSession(base, session)
    const pairCents = pair.extraCharges.find((c) => c.sessionId === session.id)!.amountCents
    const alone = mutations.removeStudentFromSession(pair, session.id, two.id, 'one')
    const charges = alone.extraCharges.filter((c) => c.sessionId === session.id)
    expect(charges).toHaveLength(1)
    expect(charges[0].studentId).toBe(one.id)
    expect(charges[0].amountCents).toBeGreaterThan(pairCents)
    expect(mutations.removeStudentFromSession(alone, session.id, one.id, 'one')).toBe(alone)
  })

  it('in a weekly series it only affects that series', () => {
    const base = longSeason()
    const ana = byName(base, 'Ana')
    const first: Session = {
      id: crypto.randomUUID(),
      groupId: '',
      clubId: base.clubs[0].id,
      teacherId: base.teachers[0].id,
      date: addDays(today, 2),
      start: '12:00',
      duration: 60,
      category: 'adult',
      status: 'pending',
      manual: true,
      studentIds: [ana.id],
    }
    const withSeries = mutations.addSessionSeries(base, first, true)
    const series = withSeries.sessions.filter((s) => s.seriesId)
    expect(followingScope(withSeries.groups, series[2], ana.id)).toBe('series')
    const state = mutations.removeStudentFromSession(withSeries, series[2].id, ana.id, 'following')
    const after = state.sessions.filter((s) => s.seriesId)
    expect(after.filter((s) => s.studentIds.includes(ana.id)).map((s) => s.date)).toEqual(
      series.slice(0, 2).map((s) => s.date),
    )
    expect(
      groupSessions(state).every(
        (s) => s.studentIds.length === groupSessions(withSeries)[0].studentIds.length,
      ),
    ).toBe(true)
  })

  it('ignores a student who is not in the class', () => {
    const base = longSeason()
    const luis = byName(base, 'Luis')
    expect(mutations.removeStudentFromSession(base, groupSessions(base)[0].id, luis.id, 'one')).toBe(base)
  })
})
