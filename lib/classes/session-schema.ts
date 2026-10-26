import { z } from 'zod'
import { defaultCapacity } from '@/lib/classes/capacity'
import { slotsOverlap, type TimeSlot } from '@/lib/classes/sessions'
import { studentCategories, studentLevels, type StudentCategory } from '@/lib/core/types'

export const sessionSchema = z
  .object({
    groupId: z.string(),
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
    if (value.studentIds.length > defaultCapacity[value.category]) {
      context.addIssue({
        code: 'custom',
        path: ['studentIds'],
        message: `Máximo ${defaultCapacity[value.category]} alumnos en clases de ${value.category === 'adult' ? 'adultos' : 'niños'}`,
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
}) {
  const errors: Record<string, string> = {}
  if (input.students.some((student) => student.category !== input.category)) {
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
