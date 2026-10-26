import { expandClosedDays, type Closure } from '@/lib/classes/closures'
import type { ClubInput } from '@/lib/classes/club-schema'
import type { GroupInput } from '@/lib/classes/group-schema'
import { planRegeneration } from '@/lib/classes/group-sessions'
import type { StudentInput } from '@/lib/classes/student-schema'
import type { TeacherInput } from '@/lib/classes/teacher-schema'
import { localTodayInTimeZone } from '@/lib/core/dates'
import {
  clubs as seedClubs,
  generateSessions,
  groups as seedGroups,
  initialClosures,
  students as seedStudents,
  teachers as seedTeachers,
  type Club,
  type Group,
  type Session,
  type Student,
  type Teacher,
} from '@/lib/demo/data'

export type DemoState = {
  students: Student[]
  teachers: Teacher[]
  clubs: Club[]
  groups: Group[]
  sessions: Session[]
  closures: Closure[]
}

const STORAGE_KEY = 'aprende-padel-demo-v2'
const seed: DemoState = {
  students: seedStudents,
  teachers: seedTeachers,
  clubs: seedClubs,
  groups: seedGroups,
  sessions: generateSessions(localTodayInTimeZone('Europe/Madrid')),
  closures: initialClosures,
}

let state: DemoState = seed
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) state = { ...seed, ...(JSON.parse(raw) as Partial<DemoState>) }
  } catch {
    state = seed
  }
}

function commit(next: DemoState) {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage may be full or unavailable (private mode); the in-memory state still works.
  }
  listeners.forEach((listener) => listener())
}

export const demoStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot() {
    load()
    return state
  },
  getServerSnapshot() {
    return seed
  },
  /** Applies a change to the current state. Used by entity-specific actions below. */
  update(change: (current: DemoState) => DemoState) {
    commit(change(state))
  },

  createStudent(input: StudentInput) {
    const id = crypto.randomUUID()
    const student: Student = { ...input, id, accountId: `ind-${id}`, active: true }
    commit({ ...state, students: [...state.students, student] })
    return student
  },
  updateStudent(id: string, input: StudentInput) {
    commit({ ...state, students: state.students.map((s) => (s.id === id ? { ...s, ...input } : s)) })
  },
  setStudentActive(id: string, active: boolean) {
    commit({ ...state, students: state.students.map((s) => (s.id === id ? { ...s, active } : s)) })
  },
  deleteStudent(id: string) {
    commit({ ...state, students: state.students.filter((s) => s.id !== id) })
  },

  createTeacher(input: TeacherInput) {
    const teacher: Teacher = { ...input, id: crypto.randomUUID(), active: true }
    commit({ ...state, teachers: [...state.teachers, teacher] })
    return teacher
  },
  updateTeacher(id: string, input: TeacherInput) {
    commit({ ...state, teachers: state.teachers.map((t) => (t.id === id ? { ...t, ...input } : t)) })
  },
  setTeacherActive(id: string, active: boolean) {
    commit({ ...state, teachers: state.teachers.map((t) => (t.id === id ? { ...t, active } : t)) })
  },
  deleteTeacher(id: string) {
    commit({ ...state, teachers: state.teachers.filter((t) => t.id !== id) })
  },

  createClub(input: ClubInput) {
    const club: Club = { ...input, id: crypto.randomUUID(), active: true }
    commit({ ...state, clubs: [...state.clubs, club] })
    return club
  },
  updateClub(id: string, input: ClubInput) {
    commit({ ...state, clubs: state.clubs.map((c) => (c.id === id ? { ...c, ...input } : c)) })
  },
  setClubActive(id: string, active: boolean) {
    commit({ ...state, clubs: state.clubs.map((c) => (c.id === id ? { ...c, active } : c)) })
  },
  deleteClub(id: string) {
    commit({ ...state, clubs: state.clubs.filter((c) => c.id !== id) })
  },

  createGroup(input: GroupInput) {
    const group: Group = { ...input, id: crypto.randomUUID(), active: true }
    commit({
      ...state,
      groups: [...state.groups, group],
      sessions: [...state.sessions, ...buildSessions(state, group, group.id)],
    })
    return group
  },
  updateGroup(id: string, input: GroupInput, options: { regenerate: boolean }) {
    const group: Group = { ...(state.groups.find((g) => g.id === id) as Group), ...input }
    const groups = state.groups.map((g) => (g.id === id ? group : g))
    commit({
      ...state,
      groups,
      sessions: options.regenerate ? replaceFutureSessions(state, group) : state.sessions,
    })
  },
  setGroupActive(id: string, active: boolean) {
    const current = state.groups.find((g) => g.id === id)
    if (!current) return
    const group: Group = { ...current, active, endsOn: active ? '' : today() }
    commit({
      ...state,
      groups: state.groups.map((g) => (g.id === id ? group : g)),
      sessions: replaceFutureSessions(state, group),
    })
  },
  deleteGroup(id: string) {
    commit({
      ...state,
      groups: state.groups.filter((g) => g.id !== id),
      sessions: state.sessions.filter((s) => s.groupId !== id || s.status !== 'pending'),
    })
  },

  addSession(session: Session) {
    commit({ ...state, sessions: [...state.sessions, session] })
  },
  updateSession(id: string, patch: Partial<Session>) {
    commit({ ...state, sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  },
  cancelSessions(ids: readonly string[], reason: string) {
    commit({
      ...state,
      sessions: state.sessions.map((s) =>
        ids.includes(s.id) ? { ...s, status: 'cancelled', cancelReason: reason } : s,
      ),
    })
  },

  addClosure(closure: Closure) {
    commit({ ...state, closures: [...state.closures, closure] })
  },
}

const today = () => localTodayInTimeZone('Europe/Madrid')

function buildSessions(current: DemoState, group: Group, groupId: string): Session[] {
  const plan = planRegeneration([], groupId, group, today(), expandClosedDays(current.closures, group.clubId))
  return plan.add.map((slot) => ({
    id: `${group.id}-${slot.date}`,
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
function replaceFutureSessions(current: DemoState, group: Group): Session[] {
  const plan = planRegeneration(
    current.sessions,
    group.id,
    group,
    today(),
    expandClosedDays(current.closures, group.clubId),
  )
  const kept = current.sessions.filter((s) => !plan.remove.includes(s.id))
  const added = buildSessions(current, group, group.id).filter(
    (next) => !kept.some((s) => s.groupId === group.id && s.date === next.date),
  )
  return [...kept, ...added]
}

/** Demo usage counts; with a real database these come from queries. */
export function studentUsage(groups: readonly Group[], studentId: string) {
  const groupCount = groups.filter((g) => g.studentIds.includes(studentId)).length
  return { groups: groupCount, charges: groupCount > 0 ? 1 : 0 }
}

export function teacherUsage(groups: readonly Group[], teacherId: string) {
  const groupCount = groups.filter((g) => g.teacherId === teacherId).length
  return { groups: groupCount, sessions: groupCount > 0 ? 1 : 0, settlements: groupCount > 0 ? 1 : 0 }
}
