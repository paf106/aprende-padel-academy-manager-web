import type { Closure } from '@/lib/classes/closures'
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

/** Demo usage counts; with a real database these come from queries. */
export function studentUsage(groups: readonly Group[], studentId: string) {
  const groupCount = groups.filter((g) => g.studentIds.includes(studentId)).length
  return { groups: groupCount, charges: groupCount > 0 ? 1 : 0 }
}

export function teacherUsage(groups: readonly Group[], teacherId: string) {
  const groupCount = groups.filter((g) => g.teacherId === teacherId).length
  return { groups: groupCount, sessions: groupCount > 0 ? 1 : 0, settlements: groupCount > 0 ? 1 : 0 }
}
