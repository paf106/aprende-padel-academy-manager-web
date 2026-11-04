import { z } from 'zod'
import { defaultCapacity } from '@/lib/classes/capacity'
import { slotsOverlap, type TimeSlot } from '@/lib/classes/sessions'
import { studentCategories, studentLevels, type StudentCategory } from '@/lib/core/types'
import { MAX_PRIVATE_STUDENTS, privateClassIssues, type ExtraRates } from '@/lib/payments/extras'

export const sessionSchema = z
  .object({
    groupId: z.string(),
    kind: z.enum(['group', 'private']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica el día'),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Indica la hora'),
    duration: z.union([z.literal(60), z.literal(90)]),
    clubId: z.string().min(1, 'Elige la sede'),
    teacherId: z.string().min(1, 'Elige el profesor'),
    category: z.enum(studentCategories),
    level: z.enum(studentLevels),
    studentIds: z.array(z.string()).min(1, 'Añade al menos un alumno'),
  })
  .superRefine((value, context) => {
    const capacity = value.kind === 'private' ? MAX_PRIVATE_STUDENTS : defaultCapacity[value.category]
    if (value.studentIds.length > capacity) {
      context.addIssue({
        code: 'custom',
        path: ['studentIds'],
        message:
          value.kind === 'private'
            ? 'Las clases particulares son para 1 o 2 alumnos'
            : `Máximo ${capacity} alumnos en clases de ${value.category === 'adult' ? 'adultos' : 'niños'}`,
      })
    }
  })

export type SessionInput = z.infer<typeof sessionSchema>

type ExistingSession = TimeSlot & { teacherId: string; status: string }

/** Rules that need other data: category mixing, teacher overlaps and closed days. Returns messages per field. */
export function sessionConflicts(input: {
  slot: TimeSlot
  teacherId: string
  category: StudentCategory
  students: readonly { id: string; category: StudentCategory }[]
  existing: readonly ExistingSession[]
  closedDays?: readonly string[]
  kind?: 'group' | 'private'
  /** Ages of the students on the class date; needed to validate private classes. */
  studentAges?: readonly number[]
  extras?: ExtraRates
}) {
  const errors: Record<string, string> = {}
  const isPrivate = input.kind === 'private'
  if (isPrivate && input.extras) {
    const [issue] = privateClassIssues(input.extras, input.studentAges ?? [])
    if (issue) errors.studentIds = issue
  }
  if (!isPrivate && input.students.some((student) => student.category !== input.category)) {
    errors.studentIds = 'No se pueden mezclar adultos y niños en la misma clase'
  }
  const clash = input.existing.find(
    (session) =>
      session.teacherId === input.teacherId &&
      session.status !== 'cancelled' &&
      slotsOverlap(input.slot, session),
  )
  if (clash) errors.start = 'El profesor ya tiene una clase a esa hora'
  if (input.closedDays?.includes(input.slot.date)) errors.date = 'La sede está cerrada ese día'
  return errors
}
