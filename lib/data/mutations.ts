import { expandClosedDays, type Closure } from '@/lib/classes/closures'
import type { ClubInput } from '@/lib/classes/club-schema'
import { generateCourseSlots, type CourseInput } from '@/lib/classes/course-schema'
import type { GroupInput } from '@/lib/classes/group-schema'
import { planRegeneration } from '@/lib/classes/group-sessions'
import type { StudentInput } from '@/lib/classes/student-schema'
import type { TeacherInput } from '@/lib/classes/teacher-schema'
import { localTodayInTimeZone } from '@/lib/core/dates'
import type {
  Account,
  AppData,
  Club,
  Course,
  ExtraCharge,
  Group,
  PaymentRecord,
  Session,
  Student,
  Teacher,
} from '@/lib/data/types'
import { priceCourseEnrollment, type CoursePrices } from '@/lib/payments/courses'
import { dropInPrice, privateClassPrice, MAX_PRIVATE_STUDENTS } from '@/lib/payments/extras'
import type { RateOverride } from '@/lib/payments/monthly-charge'
import type { RateCatalog } from '@/lib/payments/rates'
import type { BillingSettings } from '@/lib/payments/settings'
import type { TeacherRates } from '@/lib/payments/teacher-pay'

const today = () => localTodayInTimeZone('Europe/Madrid')
const newId = () => crypto.randomUUID()

/** Pure reducers: each takes the current data and returns the next. The provider applies and persists them. */
export const mutations = {
  createStudent(state: AppData, input: StudentInput): AppData {
    const accountId = input.accountId || newId()
    const student: Student = { ...input, id: newId(), accountId, active: true, needsReview: false }
    return {
      ...state,
      students: [...state.students, student],
      accounts: withAccount(state.accounts, accountId, input),
    }
  },
  updateStudent(state: AppData, id: string, input: StudentInput): AppData {
    const previous = state.students.find((s) => s.id === id)
    if (!previous) return state
    const accountId = input.accountId || newId()
    const students = state.students.map((s) =>
      s.id === id ? { ...s, ...input, accountId, needsReview: false } : s,
    )
    const next = { ...state, students, accounts: withAccount(state.accounts, accountId, input) }
    return previous.accountId === accountId ? next : dropAccountIfUnused(next, previous.accountId)
  },
  renameAccount(state: AppData, id: string, name: string): AppData {
    const trimmed = name.trim()
    if (!trimmed) return state
    return { ...state, accounts: state.accounts.map((a) => (a.id === id ? { ...a, name: trimmed } : a)) }
  },
  setStudentActive(state: AppData, id: string, active: boolean): AppData {
    return { ...state, students: state.students.map((s) => (s.id === id ? { ...s, active } : s)) }
  },
  deleteStudent(state: AppData, id: string): AppData {
    return { ...state, students: state.students.filter((s) => s.id !== id) }
  },

  createTeacher(state: AppData, input: TeacherInput): AppData {
    const teacher: Teacher = { ...input, id: newId(), active: true }
    return { ...state, teachers: [...state.teachers, teacher] }
  },
  updateTeacher(state: AppData, id: string, input: TeacherInput): AppData {
    return { ...state, teachers: state.teachers.map((t) => (t.id === id ? { ...t, ...input } : t)) }
  },
  setTeacherActive(state: AppData, id: string, active: boolean): AppData {
    return { ...state, teachers: state.teachers.map((t) => (t.id === id ? { ...t, active } : t)) }
  },
  deleteTeacher(state: AppData, id: string): AppData {
    return { ...state, teachers: state.teachers.filter((t) => t.id !== id) }
  },

  createClub(state: AppData, input: ClubInput): AppData {
    const club: Club = { ...input, id: newId(), active: true }
    return { ...state, clubs: [...state.clubs, club] }
  },
  updateClub(state: AppData, id: string, input: ClubInput): AppData {
    return { ...state, clubs: state.clubs.map((c) => (c.id === id ? { ...c, ...input } : c)) }
  },
  setClubActive(state: AppData, id: string, active: boolean): AppData {
    return { ...state, clubs: state.clubs.map((c) => (c.id === id ? { ...c, active } : c)) }
  },
  deleteClub(state: AppData, id: string): AppData {
    return { ...state, clubs: state.clubs.filter((c) => c.id !== id) }
  },

  createGroup(state: AppData, input: GroupInput): AppData {
    const group: Group = { ...input, id: newId(), active: true }
    return {
      ...state,
      groups: [...state.groups, group],
      sessions: [...state.sessions, ...buildSessions(state, group)],
    }
  },
  updateGroup(state: AppData, id: string, input: GroupInput, options: { regenerate: boolean }): AppData {
    const current = state.groups.find((g) => g.id === id)
    if (!current) return state
    const group: Group = { ...current, ...input }
    return {
      ...state,
      groups: state.groups.map((g) => (g.id === id ? group : g)),
      sessions: options.regenerate ? replaceFutureSessions(state, group) : state.sessions,
    }
  },
  setGroupActive(state: AppData, id: string, active: boolean): AppData {
    const current = state.groups.find((g) => g.id === id)
    if (!current) return state
    const group: Group = { ...current, active, endsOn: active ? '' : today() }
    return {
      ...state,
      groups: state.groups.map((g) => (g.id === id ? group : g)),
      sessions: replaceFutureSessions(state, group),
    }
  },
  deleteGroup(state: AppData, id: string): AppData {
    return {
      ...state,
      groups: state.groups.filter((g) => g.id !== id),
      sessions: state.sessions.filter((s) => s.groupId !== id || s.status !== 'pending'),
    }
  },

  addSession(state: AppData, session: Session): AppData {
    return {
      ...state,
      sessions: [...state.sessions, session],
      extraCharges: [...state.extraCharges, ...privateCharges(state, session)],
    }
  },
  /** Adds a student to a class they do not belong to: a free recovery or a paid single class. */
  addGuestToSession(
    state: AppData,
    sessionId: string,
    studentId: string,
    mode: 'recovery' | 'drop_in',
  ): AppData {
    const session = state.sessions.find((s) => s.id === sessionId)
    const student = state.students.find((s) => s.id === studentId)
    if (!session || !student || session.studentIds.includes(studentId)) return state
    const charge: ExtraCharge[] =
      mode === 'drop_in'
        ? [
            {
              id: newId(),
              accountId: student.accountId,
              studentId,
              kind: 'drop_in',
              description: `Clase suelta del ${session.date.split('-').reverse().join('/')}`,
              amountCents: dropInPrice(state.extras, session.duration),
              month: session.date.slice(0, 7),
              sessionId,
            },
          ]
        : []
    return {
      ...state,
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              studentIds: [...s.studentIds, studentId],
              guests: { ...s.guests, [studentId]: mode },
              attendance: { ...s.attendance, [studentId]: 'unmarked' },
            }
          : s,
      ),
      extraCharges: [...state.extraCharges, ...charge],
    }
  },
  updateSession(state: AppData, id: string, patch: Partial<Session>): AppData {
    return { ...state, sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }
  },
  /** Removes a class with its charges. Editing the group afterwards can create it again if it fits the group's schedule. */
  deleteSession(state: AppData, id: string): AppData {
    const session = state.sessions.find((s) => s.id === id)
    if (!session) return state
    return {
      ...state,
      sessions: state.sessions.filter((s) => s.id !== id),
      extraCharges: state.extraCharges.filter((c) => c.sessionId !== id),
    }
  },
  /** Cancelled classes are not charged: extra charges linked to them disappear. */
  cancelSessions(
    state: AppData,
    ids: readonly string[],
    reason: string,
    creditedStudentIds?: string[],
  ): AppData {
    return {
      ...state,
      sessions: state.sessions.map((s) =>
        ids.includes(s.id) ? { ...s, status: 'cancelled', cancelReason: reason, creditedStudentIds } : s,
      ),
      extraCharges: state.extraCharges.filter((c) => !c.sessionId || !ids.includes(c.sessionId)),
    }
  },

  createCourse(state: AppData, input: CourseInput): AppData {
    const course: Course = { ...input, id: newId(), active: true }
    return {
      ...state,
      courses: [...state.courses, course],
      sessions: [...state.sessions, ...courseSessions(state, course)],
      extraCharges: [...state.extraCharges, ...courseCharges(state, course)],
    }
  },
  updateCourse(state: AppData, id: string, input: CourseInput): AppData {
    const current = state.courses.find((c) => c.id === id)
    if (!current) return state
    return rebuildCourse(state, { ...current, ...input })
  },
  setCourseActive(state: AppData, id: string, active: boolean): AppData {
    const current = state.courses.find((c) => c.id === id)
    if (!current) return state
    return rebuildCourse(state, { ...current, active })
  },
  deleteCourse(state: AppData, id: string): AppData {
    return {
      ...state,
      courses: state.courses.filter((c) => c.id !== id),
      sessions: state.sessions.filter((s) => s.courseId !== id || s.status !== 'pending'),
      extraCharges: state.extraCharges.filter((c) => c.courseId !== id),
    }
  },
  setCoursePrices(state: AppData, coursePrices: CoursePrices): AppData {
    return {
      ...state,
      coursePrices,
      extraCharges: [
        ...state.extraCharges.filter((c) => c.kind !== 'course'),
        ...state.courses
          .filter((c) => c.active)
          .flatMap((course) => courseCharges({ ...state, coursePrices }, course)),
      ],
    }
  },
  addPayment(state: AppData, payment: Omit<PaymentRecord, 'id'>): AppData {
    return { ...state, payments: [...state.payments, { ...payment, id: newId() }] }
  },
  setCatalog(state: AppData, catalog: RateCatalog): AppData {
    return { ...state, catalog }
  },
  setBilling(state: AppData, billing: BillingSettings): AppData {
    return { ...state, billing }
  },
  setTeacherRates(state: AppData, teacherRates: TeacherRates): AppData {
    return { ...state, teacherRates }
  },
  addOverride(state: AppData, override: Omit<RateOverride, 'id'>): AppData {
    return { ...state, overrides: [...state.overrides, { ...override, id: newId() }] }
  },
  removeOverride(state: AppData, id: string): AppData {
    return { ...state, overrides: state.overrides.filter((o) => o.id !== id) }
  },
  addClosure(state: AppData, closure: Closure): AppData {
    return { ...state, closures: [...state.closures, closure] }
  },
}

type Mutations = typeof mutations
/** The reducers with the state argument removed: what screens call. */
export type Actions = {
  [K in keyof Mutations]: Mutations[K] extends (state: AppData, ...args: infer A) => AppData
    ? (...args: A) => void
    : never
}

function rebuildCourse(state: AppData, course: Course): AppData {
  return {
    ...state,
    courses: state.courses.map((c) => (c.id === course.id ? course : c)),
    sessions: replaceCourseSessions(state, course),
    extraCharges: [
      ...state.extraCharges.filter((c) => c.courseId !== course.id),
      ...(course.active ? courseCharges(state, course) : []),
    ],
  }
}

function courseSessions(current: AppData, course: Course): Session[] {
  if (!course.active) return []
  const closed = expandClosedDays(current.closures, course.clubId)
  return generateCourseSlots(course, closed).map((slot) => ({
    id: newId(),
    groupId: '',
    courseId: course.id,
    clubId: course.clubId,
    teacherId: course.teacherId,
    date: slot.date,
    start: slot.start,
    duration: slot.duration,
    category: course.category,
    level: course.level,
    status: 'pending' as const,
    studentIds: course.studentIds,
  }))
}

/** Pending classes from today on are rebuilt from the course; finished and past classes stay untouched. */
function replaceCourseSessions(current: AppData, course: Course): Session[] {
  const from = today()
  const kept = current.sessions.filter(
    (s) => s.courseId !== course.id || s.date < from || s.status !== 'pending',
  )
  const added = courseSessions(current, course).filter(
    (next) => next.date >= from && !kept.some((s) => s.courseId === course.id && s.date === next.date),
  )
  return [...kept, ...added]
}

/** A single payment per enrolled student, priced with the course price list and its combined offers. */
function courseCharges(current: AppData, course: Course): ExtraCharge[] {
  const enrolled = course.studentIds
    .map((id) => current.students.find((s) => s.id === id))
    .filter((s): s is Student => Boolean(s))
  const accounts = [...new Set(enrolled.map((s) => s.accountId))]
  return accounts.flatMap((accountId) => {
    const members = enrolled.filter((s) => s.accountId === accountId)
    const pricing = priceCourseEnrollment(
      members.map((s) => ({ id: s.id, birthDate: s.birthDate })),
      current.coursePrices,
      current.catalog.segments,
      course.startsOn,
    )
    return pricing.prices.map((price) => {
      const offer = pricing.offers.find((o) => o.offerId === price.offerId)
      return {
        id: newId(),
        accountId,
        studentId: price.memberId,
        kind: 'course' as const,
        description: `Curso «${course.name}»${offer ? ` · ${offer.name}` : ''}`,
        amountCents: price.amountCents,
        month: course.startsOn.slice(0, 7),
        courseId: course.id,
      }
    })
  })
}

/** Charges of a private class: instructor price per student plus the court, split between the students. */
function privateCharges(current: AppData, session: Session): ExtraCharge[] {
  if (session.kind !== 'private') return []
  const students = session.studentIds
    .slice(0, MAX_PRIVATE_STUDENTS)
    .map((id) => current.students.find((s) => s.id === id))
    .filter((s): s is Student => Boolean(s))
  if (students.length === 0) return []
  const club = current.clubs.find((c) => c.id === session.clubId)
  const price = privateClassPrice({
    extras: current.extras,
    students: students.length,
    durationMinutes: session.duration,
    courtPricePerHourCents: club?.courtPriceCents ?? 0,
  })
  return students.map((student, index) => ({
    id: newId(),
    accountId: student.accountId,
    studentId: student.id,
    kind: 'private' as const,
    description: `Clase particular del ${session.date.split('-').reverse().join('/')}`,
    amountCents: price.perStudentCents[index],
    month: session.date.slice(0, 7),
    sessionId: session.id,
  }))
}

/** An account nobody belongs to anymore is removed, unless it has payments, charges or a manual price. */
function dropAccountIfUnused(state: AppData, accountId: string): AppData {
  const inUse =
    state.students.some((s) => s.accountId === accountId) ||
    state.payments.some((p) => p.accountId === accountId) ||
    state.extraCharges.some((c) => c.accountId === accountId) ||
    state.overrides.some((o) => o.scope === 'account' && o.targetId === accountId)
  return inUse ? state : { ...state, accounts: state.accounts.filter((a) => a.id !== accountId) }
}

/** A student without an existing account gets a new individual billing account. */
function withAccount(
  accounts: Account[],
  accountId: string,
  student: { firstName: string; lastName: string },
): Account[] {
  if (accounts.some((a) => a.id === accountId)) return accounts
  const name = `${student.firstName} ${student.lastName.split(' ')[0]}`.trim()
  return [...accounts, { id: accountId, name }]
}

function buildSessions(current: AppData, group: Group): Session[] {
  const plan = planRegeneration(
    [],
    group.id,
    group,
    today(),
    expandClosedDays(current.closures, group.clubId),
  )
  return plan.add.map((slot) => ({
    id: newId(),
    groupId: group.id,
    clubId: group.clubId,
    teacherId: group.teacherId,
    date: slot.date,
    start: slot.start,
    duration: slot.duration,
    category: group.category,
    level: group.level,
    status: 'pending',
    studentIds: group.studentIds,
  }))
}

/** Pending classes from today on are rebuilt from the group's schedule; everything else stays untouched. */
function replaceFutureSessions(current: AppData, group: Group): Session[] {
  const plan = planRegeneration(
    current.sessions,
    group.id,
    group,
    today(),
    expandClosedDays(current.closures, group.clubId),
  )
  const kept = current.sessions.filter((s) => !plan.remove.includes(s.id))
  const added = buildSessions(current, group).filter(
    (next) => !kept.some((s) => s.groupId === group.id && s.date === next.date),
  )
  return [...kept, ...added]
}

export function studentUsage(groups: readonly Group[], studentId: string) {
  const groupCount = groups.filter((g) => g.studentIds.includes(studentId)).length
  return { groups: groupCount, charges: groupCount > 0 ? 1 : 0 }
}

export function teacherUsage(groups: readonly Group[], teacherId: string) {
  const groupCount = groups.filter((g) => g.teacherId === teacherId).length
  return { groups: groupCount, sessions: groupCount > 0 ? 1 : 0, settlements: groupCount > 0 ? 1 : 0 }
}
