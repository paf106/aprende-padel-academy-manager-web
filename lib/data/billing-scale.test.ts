import { describe, expect, it } from 'vitest'
import { addDays } from '@/lib/core/calendar-nav'
import { localTodayInTimeZone } from '@/lib/core/dates'
import { buildCharges } from '@/lib/data/billing'
import { emptyAppData, makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { emptyGroupInput } from '@/lib/classes/group-schema'
import { emptyStudentInput } from '@/lib/classes/student-schema'
import { toRows } from '@/lib/db/mapping'

const today = localTodayInTimeZone('Europe/Madrid')

/** A big academy: 300 students in 60 groups with a full season of classes. */
function bigAcademy() {
  const base = makeAppData()
  let state = { ...emptyAppData, clubs: base.clubs, teachers: base.teachers, seasonEnd: addDays(today, 240) }
  const ids: string[] = []
  for (let i = 0; i < 300; i++) {
    state = mutations.createStudent(state, {
      ...emptyStudentInput,
      firstName: `Alumno${i}`,
      birthDate: '1985-05-12',
      clubId: state.clubs[0].id,
    })
    ids.push(state.students.at(-1)!.id)
  }
  for (let g = 0; g < 60; g++) {
    state = mutations.createGroup(state, {
      ...emptyGroupInput,
      name: `Grupo ${g}`,
      clubId: state.clubs[0].id,
      teacherId: state.teachers[0].id,
      weekday: (g % 7) + 1,
      startsOn: today,
      studentIds: ids.slice(g * 5, g * 5 + 4),
    })
  }
  return state
}

describe('billing at the scale of a big academy', () => {
  const state = bigAcademy()

  it('builds every charge of the month quickly', () => {
    const started = performance.now()
    const charges = buildCharges(state, today)
    const elapsed = performance.now() - started
    expect(charges.length).toBeGreaterThan(200)
    expect(elapsed).toBeLessThan(2500)
  })

  it('converts to rows once per data object', () => {
    expect(toRows(state)).toBe(toRows(state))
    const next = mutations.setStudentActive(state, state.students[0].id, false)
    expect(next.sessions).toBe(state.sessions)
    expect(toRows(next)['classes.sessions']).toBe(toRows(state)['classes.sessions'])
    expect(toRows(next)['classes.session_attendees']).toBe(toRows(state)['classes.session_attendees'])
    expect(toRows(next)['core.students']).not.toBe(toRows(state)['core.students'])
  })
})
