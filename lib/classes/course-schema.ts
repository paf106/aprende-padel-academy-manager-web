import { z } from 'zod'
import { defaultCapacity } from '@/lib/classes/capacity'
import { slotsOverlap } from '@/lib/classes/sessions'
import { addDays, isoWeekday } from '@/lib/core/calendar-nav'
import { studentCategories, studentLevels, type StudentCategory } from '@/lib/core/types'

export const courseSchema = z
  .object({
    name: z.string().trim().min(1, 'Indica el nombre del curso'),
    clubId: z.string().min(1, 'Elige la sede'),
    teacherId: z.string().min(1, 'Elige el profesor'),
    category: z.enum(studentCategories),
    level: z.enum(studentLevels),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha de inicio'),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha de fin'),
    weekdays: z.array(z.number().int().min(1).max(7)).min(1, 'Elige al menos un día de la semana'),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Indica la hora'),
    duration: z.union([z.literal(60), z.literal(90)]),
    studentIds: z.array(z.string()),
  })
  .superRefine((value, context) => {
    if (value.endsOn && value.endsOn < value.startsOn) {
      context.addIssue({
        code: 'custom',
        path: ['endsOn'],
        message: 'La fecha de fin no puede ser anterior al inicio',
      })
    }
    if (value.studentIds.length > defaultCapacity[value.category]) {
      context.addIssue({
        code: 'custom',
        path: ['studentIds'],
        message: `Máximo ${defaultCapacity[value.category]} alumnos en este curso`,
      })
    }
  })

export type CourseInput = z.infer<typeof courseSchema>

export const emptyCourseInput: CourseInput = {
  name: '',
  clubId: '',
  teacherId: '',
  category: 'adult',
  level: 'starter',
  startsOn: '',
  endsOn: '',
  weekdays: [1, 2, 3, 4],
  start: '19:00',
  duration: 60,
  studentIds: [],
}

type CourseSchedule = Pick<CourseInput, 'startsOn' | 'endsOn' | 'weekdays' | 'start' | 'duration'>
export type CourseSlot = { date: string; start: string; duration: 60 | 90 }

const MAX_COURSE_DAYS = 120

/** Every class of a course: the chosen weekdays between its dates, skipping closed days. */
export function generateCourseSlots(
  course: CourseSchedule,
  closedDays: readonly string[] = [],
): CourseSlot[] {
  if (!course.startsOn || !course.endsOn || course.endsOn < course.startsOn) return []
  const slots: CourseSlot[] = []
  let date = course.startsOn
  for (let i = 0; i < MAX_COURSE_DAYS && date <= course.endsOn; i++, date = addDays(date, 1)) {
    if (course.weekdays.includes(isoWeekday(date)) && !closedDays.includes(date)) {
      slots.push({ date, start: course.start, duration: course.duration })
    }
  }
  return slots
}

type ExistingSession = { date: string; start: string; duration: number; teacherId: string; status: string }

/** Rules that need other data: category mixing and teacher overlaps on any class of the course. */
export function courseConflicts(input: {
  teacherId: string
  category: StudentCategory
  slots: readonly CourseSlot[]
  students: readonly { category: StudentCategory }[]
  existing: readonly ExistingSession[]
}) {
  const errors: Record<string, string> = {}
  if (input.students.some((student) => student.category !== input.category)) {
    errors.studentIds = 'No se pueden mezclar adultos y niños en el mismo curso'
  }
  for (const slot of input.slots) {
    const clash = input.existing.find(
      (s) => s.teacherId === input.teacherId && s.status !== 'cancelled' && slotsOverlap(slot, s),
    )
    if (clash) {
      errors.start = `El profesor ya tiene una clase el ${slot.date.split('-').reverse().join('/')} a esa hora`
      break
    }
  }
  return errors
}

export function courseDeletionBlockers(usage: { completedSessions: number }) {
  return usage.completedSessions > 0
    ? [
        `Tiene ${usage.completedSessions} ${usage.completedSessions === 1 ? 'clase terminada' : 'clases terminadas'}`,
      ]
    : []
}
