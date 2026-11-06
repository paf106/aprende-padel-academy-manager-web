import { describe, expect, it } from 'vitest'
import type { GroupInput } from '@/lib/classes/group-schema'
import { addDays, addMonths } from '@/lib/core/calendar-nav'
import { localTodayInTimeZone } from '@/lib/core/dates'
import { simulateMonth } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import type { AppData, Group } from '@/lib/data/types'
import { fromRows, toRows } from '@/lib/db/mapping'

const today = localTodayInTimeZone('Europe/Madrid')
const longSeason = () => mutations.setSeasonEnd(makeAppData(), addDays(today, 120))
const inputOf = (g: Group, studentIds: string[]): GroupInput => ({
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
  studentIds,
})
const sessionsOf = (state: AppData, group: Group) =>
  state.sessions.filter((s) => s.groupId === group.id).sort((a, b) => a.date.localeCompare(b.date))

describe('joining a group in the middle of the season', () => {
  const base = longSeason()
  const group = base.groups[0]
  const luis = base.students.find((s) => s.firstName === 'Luis')!
  const second = sessionsOf(base, group)[1]

  it('is only in the classes from the chosen date on', () => {
    const state = mutations.updateGroup(base, group.id, inputOf(group, [...group.studentIds, luis.id]), {
      regenerate: true,
      from: second.date,
    })
    for (const session of sessionsOf(state, group)) {
      expect(session.studentIds.includes(luis.id), session.date).toBe(session.date >= second.date)
    }
    expect(state.groups[0].memberSince).toEqual({ [luis.id]: second.date })
  })

  it('regenerating from an earlier date never puts the student in classes before they joined', () => {
    const joined = mutations.updateGroup(base, group.id, inputOf(group, [...group.studentIds, luis.id]), {
      regenerate: true,
      from: second.date,
    })
    const again = mutations.updateGroup(
      joined,
      group.id,
      { ...inputOf(group, joined.groups[0].studentIds), start: '20:30' },
      {
        regenerate: true,
        from: today,
      },
    )
    const first = sessionsOf(again, group)[0]
    expect(first.studentIds).not.toContain(luis.id)
    expect(sessionsOf(again, group)[1].studentIds).toContain(luis.id)
    expect(again.groups[0].memberSince).toEqual({ [luis.id]: second.date })
  })

  it('is charged only for the classes they have in the month', () => {
    const month = addMonths(today.slice(0, 7), 1)
    const inMonth = sessionsOf(base, group).filter((s) => s.date.startsWith(month))
    const from = inMonth[1].date
    const state = mutations.updateGroup(base, group.id, inputOf(group, [...group.studentIds, luis.id]), {
      regenerate: true,
      from,
    })
    const line = simulateMonth(state, luis.accountId, month, []).lines.find((l) => l.memberId === luis.id)!
    const expected = inMonth.filter((s) => s.date >= from).map((s) => s.date)
    expect(line.classDates).toEqual(expected)
    expect(line.billedClasses).toBe(expected.length)
    expect(line.totalCents).toBe(Math.round((3500 * expected.length) / 4))
  })

  it('leaving the group forgets the join date', () => {
    const joined = mutations.updateGroup(base, group.id, inputOf(group, [...group.studentIds, luis.id]), {
      regenerate: true,
      from: second.date,
    })
    const left = mutations.updateGroup(joined, group.id, inputOf(group, group.studentIds), {
      regenerate: true,
      from: second.date,
    })
    expect(left.groups[0].memberSince).toEqual({})
  })

  it('survives being saved and read back', () => {
    const joined = mutations.updateGroup(base, group.id, inputOf(group, [...group.studentIds, luis.id]), {
      regenerate: true,
      from: second.date,
    })
    const rows = toRows(joined)['classes.group_members']
    expect(rows.find((r) => r.student_id === luis.id)?.joined_on).toBe(second.date)
    expect(rows.find((r) => r.student_id !== luis.id)?.joined_on).toBeNull()
    const readBack = fromRows(toRows(joined))
    expect(readBack.groups[0].memberSince).toEqual({ [luis.id]: second.date })
  })
})
