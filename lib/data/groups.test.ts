import { describe, expect, it } from 'vitest'
import { localTodayInTimeZone } from '@/lib/core/dates'
import { addDays } from '@/lib/core/calendar-nav'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import type { AppData, Group, Session } from '@/lib/data/types'
import type { GroupInput } from '@/lib/classes/group-schema'

const today = localTodayInTimeZone('Europe/Madrid')
const inputOf = (g: Group, changes: Partial<GroupInput> = {}): GroupInput => ({
  name: g.name,
  clubId: g.clubId,
  teacherId: g.teacherId,
  category: g.category,
  level: g.level,
  weekday: g.weekday,
  start: g.start,
  duration: g.duration,
  startsOn: g.startsOn,
  endsOn: g.endsOn,
  studentIds: g.studentIds,
  ...changes,
})
const sessionsOf = (state: AppData, group: Group) => state.sessions.filter((s) => s.groupId === group.id)

describe('group calendar', () => {
  it('fills the calendar from the start date until the end of the season', () => {
    const state = makeAppData()
    const group = state.groups[0]
    const sessions = sessionsOf(state, group)
    expect(sessions[0].date >= group.startsOn).toBe(true)
    expect(sessions.every((s) => s.date <= state.seasonEnd)).toBe(true)
    expect(addDays(sessions.at(-1)!.date, 7) > state.seasonEnd).toBe(true)
    expect(sessions.every((s) => s.status === 'pending')).toBe(true)
  })

  it('editing the time updates the classes in place and keeps attendance, guests and substitutes', () => {
    const base = makeAppData()
    const group = base.groups[0]
    const target = sessionsOf(base, group)[1]
    const guest = base.students.find((s) => !group.studentIds.includes(s.id) && s.category === 'adult')!
    let state = mutations.addGuestToSession(base, target.id, guest.id)
    state = mutations.updateSession(state, target.id, {
      attendance: { [group.studentIds[0]]: 'present' },
      teacherId: 'sub',
    })
    state = mutations.updateGroup(state, group.id, inputOf(group, { start: '20:30' }), { regenerate: true })

    const after = sessionsOf(state, group)
    expect(after).toHaveLength(sessionsOf(base, group).length)
    expect(after.every((s) => s.start === '20:30')).toBe(true)
    const same = after.find((s) => s.id === target.id)!
    expect(same.attendance?.[group.studentIds[0]]).toBe('present')
    expect(same.guests?.[guest.id]).toBe('drop_in')
    expect(same.studentIds).toContain(guest.id)
    expect(same.teacherId).toBe('sub')
    expect(after.find((s) => s.id !== target.id)?.teacherId).toBe(group.teacherId)
  })

  it('removing a student takes them out of the classes from the chosen date on', () => {
    const base = makeAppData()
    const group = base.groups[0]
    const sessions = sessionsOf(base, group)
    const leaving = group.studentIds[1]
    const from = sessions[3].date
    const state = mutations.updateGroup(
      base,
      group.id,
      inputOf(group, { studentIds: group.studentIds.filter((id) => id !== leaving) }),
      { regenerate: true, from },
    )
    for (const session of sessionsOf(state, group)) {
      expect(session.studentIds.includes(leaving), session.date).toBe(session.date < from)
    }
  })

  it('changing the weekday moves the pending classes and never touches finished ones', () => {
    const base = makeAppData()
    const group = base.groups[0]
    const [first, second] = sessionsOf(base, group)
    let state = mutations.updateSession(base, first.id, { status: 'completed' })
    state = mutations.updateGroup(state, group.id, inputOf(group, { weekday: (group.weekday % 7) + 1 }), {
      regenerate: true,
      from: first.date,
    })
    const after = sessionsOf(state, group)
    expect(after.find((s) => s.id === first.id)?.status).toBe('completed')
    expect(after.some((s) => s.id === second.id)).toBe(false)
    expect(after.filter((s) => s.status === 'pending').every((s) => s.date >= first.date)).toBe(true)
  })

  it('classes created by hand survive editing the group', () => {
    const base = makeAppData()
    const group = base.groups[0]
    const manual: Session = {
      ...sessionsOf(base, group)[0],
      id: crypto.randomUUID(),
      date: addDays(today, 2),
      manual: true,
    }
    let state = mutations.addSession(base, manual)
    state = mutations.updateGroup(state, group.id, inputOf(group, { weekday: (group.weekday % 7) + 1 }), {
      regenerate: true,
      from: today,
    })
    expect(state.sessions.some((s) => s.id === manual.id)).toBe(true)
  })

  it('a deleted class comes back when the group is edited and the date still fits', () => {
    const base = makeAppData()
    const group = base.groups[0]
    const target = sessionsOf(base, group)[2]
    let state = mutations.deleteSession(base, target.id)
    expect(sessionsOf(state, group)).toHaveLength(sessionsOf(base, group).length - 1)
    state = mutations.updateGroup(state, group.id, inputOf(group), { regenerate: true, from: today })
    expect(sessionsOf(state, group).some((s) => s.date === target.date)).toBe(true)
  })

  it('moving the end of the season extends or trims the calendars', () => {
    const base = makeAppData()
    const group = base.groups[0]
    const longer = mutations.setSeasonEnd(base, addDays(base.seasonEnd, 28))
    expect(sessionsOf(longer, group)).toHaveLength(sessionsOf(base, group).length + 4)
    const shorter = mutations.setSeasonEnd(base, addDays(base.seasonEnd, -28))
    expect(sessionsOf(shorter, group)).toHaveLength(sessionsOf(base, group).length - 4)
  })
})
