import { emptyClubInput } from '@/lib/classes/club-schema'
import { defaultSeasonEnd } from '@/lib/classes/group-sessions'
import { emptyGroupInput } from '@/lib/classes/group-schema'
import { emptyStudentInput, type StudentInput } from '@/lib/classes/student-schema'
import { emptyTeacherInput } from '@/lib/classes/teacher-schema'
import { localTodayInTimeZone } from '@/lib/core/dates'
import { mutations } from '@/lib/data/mutations'
import type { AppData } from '@/lib/data/types'
import { aprendePadelCoursePrices } from '@/lib/payments/courses'
import { aprendePadelExtras } from '@/lib/payments/extras'
import { aprendePadelCatalog } from '@/lib/payments/seed-catalog'
import { defaultBillingSettings } from '@/lib/payments/settings'
import { defaultTeacherRates } from '@/lib/payments/teacher-pay'

export const emptyAppData: AppData = {
  students: [],
  teachers: [],
  clubs: [],
  groups: [],
  sessions: [],
  closures: [],
  accounts: [],
  catalog: aprendePadelCatalog,
  billing: defaultBillingSettings,
  overrides: [],
  teacherRates: defaultTeacherRates,
  payments: [],
  teacherSettlements: [],
  extras: aprendePadelExtras,
  extraCharges: [],
  courses: [],
  coursePrices: aprendePadelCoursePrices,
  seasonEnd: defaultSeasonEnd(localTodayInTimeZone('Europe/Madrid')),
}

const adult = (firstName: string, extra: Partial<StudentInput> = {}): StudentInput => ({
  ...emptyStudentInput,
  firstName,
  lastName: 'Test',
  birthDate: '1985-05-12',
  ...extra,
})
const child = (firstName: string, extra: Partial<StudentInput> = {}): StudentInput =>
  adult(firstName, { birthDate: '2016-03-01', category: 'child', guardianName: 'Tutor', ...extra })

/** A small organization built with the same reducers the app uses: two clubs, a teacher, a family, a group and a course. */
export function makeAppData(): AppData {
  let state = emptyAppData
  state = mutations.createClub(state, { ...emptyClubInput, name: 'Pioz', courtPriceCents: 1200 })
  state = mutations.createClub(state, { ...emptyClubInput, name: 'Ambite', courtPriceCents: 1200 })
  const [pioz] = state.clubs
  state = mutations.createTeacher(state, { ...emptyTeacherInput, firstName: 'Pablo', clubIds: [pioz.id] })
  const [teacher] = state.teachers

  state = mutations.createStudent(state, adult('Madre', { clubId: pioz.id }))
  const accountId = state.students[0].accountId
  state = mutations.createStudent(state, adult('Padre', { clubId: pioz.id, accountId }))
  state = mutations.createStudent(state, child('Hijo', { clubId: pioz.id, accountId }))
  state = mutations.createStudent(state, adult('Ana', { clubId: pioz.id }))
  state = mutations.createStudent(state, adult('Luis', { clubId: pioz.id }))
  state = mutations.createStudent(state, child('Peque1', { clubId: pioz.id }))
  state = mutations.createStudent(state, child('Peque2', { clubId: pioz.id }))
  state = mutations.createStudent(state, child('Peque3', { clubId: pioz.id }))

  const today = localTodayInTimeZone('Europe/Madrid')
  const byName = (name: string) => state.students.find((s) => s.firstName === name)!.id
  state = mutations.createGroup(state, {
    ...emptyGroupInput,
    name: 'Adultos',
    clubId: pioz.id,
    teacherId: teacher.id,
    startsOn: today,
    studentIds: [byName('Madre'), byName('Ana')],
  })
  state = mutations.createCourse(state, {
    name: 'Intensivo de junio',
    clubId: pioz.id,
    teacherId: teacher.id,
    category: 'child',
    level: 'starter',
    startsOn: '2027-05-31',
    endsOn: '2027-06-03',
    weekdays: [1, 2, 3, 4],
    start: '18:00',
    duration: 60,
    studentIds: [byName('Peque1'), byName('Peque2'), byName('Peque3')],
  })
  return state
}
