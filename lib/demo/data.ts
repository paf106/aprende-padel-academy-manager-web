import type { ClassStatus, StudentCategory, StudentLevel } from '@/lib/core/types'
import { addDays, weekDays } from '@/lib/core/calendar-nav'

export type Club = { id: string; name: string; city: string; color: string; courts: number }
export type Teacher = { id: string; name: string; phone: string }
export type Student = {
  id: string
  firstName: string
  lastName: string
  category: StudentCategory
  level: StudentLevel
  birthDate: string
  clubId: string
  accountId: string
  active: boolean
  guardian?: string
}
export type Group = {
  id: string
  name: string
  clubId: string
  teacherId: string
  category: StudentCategory
  level: StudentLevel
  weekday: number
  start: string
  duration: 60 | 90
  studentIds: string[]
}
export type Session = {
  id: string
  groupId: string
  clubId: string
  teacherId: string
  date: string
  start: string
  duration: 60 | 90
  category: StudentCategory
  status: ClassStatus
  studentIds: string[]
}
export type FeePlan = {
  id: string
  name: string
  monthlyCents: number
  appliesTo: 'individual' | 'couple' | 'family'
}
export type Account = {
  id: string
  name: string
  kind: 'individual' | 'couple' | 'family'
  feePlanId: string
}

export const clubs: Club[] = [
  { id: 'pioz', name: 'Pioz', city: 'Pioz', color: 'brand', courts: 2 },
  { id: 'loranca', name: 'Loranca de Tajuña', city: 'Loranca de Tajuña', color: 'info', courts: 2 },
  { id: 'corpa', name: 'Corpa', city: 'Corpa', color: 'warning', courts: 1 },
  { id: 'pozuelo', name: 'Pozuelo del Rey', city: 'Pozuelo del Rey', color: 'danger', courts: 2 },
]

export const teachers: Teacher[] = [
  { id: 't1', name: 'Carlos Ruiz', phone: '600 111 222' },
  { id: 't2', name: 'Lucía Martín', phone: '600 333 444' },
  { id: 't3', name: 'Javier Gómez', phone: '600 555 666' },
]

export const feePlans: FeePlan[] = [
  { id: 'normal', name: 'Cuota normal', monthlyCents: 3500, appliesTo: 'individual' },
  { id: 'pareja', name: 'Pareja (por persona)', monthlyCents: 3000, appliesTo: 'couple' },
  { id: 'familia', name: 'Familia (por persona)', monthlyCents: 2800, appliesTo: 'family' },
]

const firstNames = [
  'Ana',
  'Pablo',
  'Marta',
  'Diego',
  'Laura',
  'Sergio',
  'Elena',
  'Hugo',
  'Sara',
  'Álvaro',
  'Nuria',
  'Iván',
  'Paula',
  'Mario',
  'Carla',
  'Adrián',
  'Julia',
  'Raúl',
  'Irene',
  'Daniel',
  'Lola',
  'Rubén',
  'Eva',
  'Marcos',
]
const lastNames = [
  'García',
  'López',
  'Sánchez',
  'Pérez',
  'Fernández',
  'Díaz',
  'Moreno',
  'Álvarez',
  'Romero',
  'Navarro',
  'Torres',
  'Ramos',
]
const levels: StudentLevel[] = ['starter', 'beginner', 'intermediate', 'advanced', 'competition']

export const accounts: Account[] = []
export const students: Student[] = firstNames.map((first, index) => {
  const child = index % 3 === 2
  const clubId = clubs[index % clubs.length].id
  const family = Math.floor(index / 3)
  const accountId = index < 12 ? `fam-${family}` : `ind-${index}`
  return {
    id: `s${index + 1}`,
    firstName: first,
    lastName: `${lastNames[index % lastNames.length]} ${lastNames[(index + 5) % lastNames.length]}`,
    category: child ? 'child' : 'adult',
    level: levels[index % levels.length],
    birthDate: child ? `${2014 - (index % 4)}-0${(index % 9) + 1}-1${index % 9}` : `${1980 + index}-05-12`,
    clubId,
    accountId,
    active: index !== 20,
    guardian: child ? `${lastNames[index % lastNames.length]} (tutor)` : undefined,
  }
})
for (const student of students) {
  if (accounts.some((a) => a.id === student.accountId)) continue
  const members = students.filter((s) => s.accountId === student.accountId)
  const kind = members.length > 2 ? 'family' : members.length === 2 ? 'couple' : 'individual'
  accounts.push({
    id: student.accountId,
    name:
      kind === 'individual'
        ? `${student.firstName} ${student.lastName.split(' ')[0]}`
        : `Familia ${student.lastName.split(' ')[0]}`,
    kind,
    feePlanId: kind === 'family' ? 'familia' : kind === 'couple' ? 'pareja' : 'normal',
  })
}

const groupDefs: Array<[string, string, string, StudentCategory, StudentLevel, number, string, 60 | 90]> = [
  ['Adultos iniciación', 'pioz', 't1', 'adult', 'starter', 1, '19:00', 60],
  ['Adultos medio', 'pioz', 't1', 'adult', 'intermediate', 3, '20:00', 90],
  ['Peques A', 'loranca', 't2', 'child', 'beginner', 2, '17:30', 60],
  ['Adultos avanzado', 'loranca', 't2', 'adult', 'advanced', 4, '20:00', 60],
  ['Peques B', 'corpa', 't3', 'child', 'starter', 3, '17:00', 60],
  ['Adultos principiante', 'corpa', 't3', 'adult', 'beginner', 2, '19:30', 60],
  ['Peques C', 'pozuelo', 't1', 'child', 'intermediate', 5, '17:30', 90],
  ['Adultos competición', 'pozuelo', 't2', 'adult', 'competition', 1, '20:30', 90],
]
export const groups: Group[] = groupDefs.map(
  ([name, clubId, teacherId, category, level, weekday, start, duration], index) => {
    const pool = students.filter((s) => s.active && s.category === category && s.clubId === clubId)
    const fallback = students.filter((s) => s.active && s.category === category)
    const max = category === 'adult' ? 4 : 6
    const picked = [...pool, ...fallback.filter((s) => !pool.includes(s))].slice(
      0,
      Math.max(1, Math.min(max, 2 + (index % 3))),
    )
    return {
      id: `g${index + 1}`,
      name,
      clubId,
      teacherId,
      category,
      level,
      weekday,
      start,
      duration,
      studentIds: picked.map((s) => s.id),
    }
  },
)

export function generateSessions(today: string): Session[] {
  const monday = weekDays(today)[0]
  const sessions: Session[] = []
  for (let week = -5; week <= 5; week++) {
    for (const group of groups) {
      const date = addDays(monday, week * 7 + group.weekday - 1)
      const past = date < today
      const status: ClassStatus = !past
        ? 'pending'
        : (group.weekday + week) % 7 === 0
          ? 'cancelled'
          : 'completed'
      sessions.push({
        id: `${group.id}-${date}`,
        groupId: group.id,
        clubId: group.clubId,
        teacherId: group.teacherId,
        date,
        start: group.start,
        duration: group.duration,
        category: group.category,
        status,
        studentIds: group.studentIds,
      })
    }
  }
  return sessions
}

export const clubById = (id: string) => clubs.find((c) => c.id === id)
export const teacherById = (id: string) => teachers.find((t) => t.id === id)
export const studentById = (id: string) => students.find((s) => s.id === id)
export const groupById = (id: string) => groups.find((g) => g.id === id)
export const accountById = (id: string) => accounts.find((a) => a.id === id)
export const fullName = (s: Student) => `${s.firstName} ${s.lastName}`
