import { z } from 'zod'
import { defaultCapacity } from '@/lib/classes/capacity'
import { slotsOverlap } from '@/lib/classes/sessions'
import { studentCategories, studentLevels, type StudentCategory } from '@/lib/core/types'

export const groupSchema = z
  .object({
    name: z.string().trim().min(1, 'Indica el nombre del grupo'),
    clubId: z.string().min(1, 'Elige la sede'),
    teacherId: z.string().min(1, 'Elige el profesor'),
    category: z.enum(studentCategories),
    level: z.enum(studentLevels),
    weekday: z.number().int().min(1).max(7),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Indica la hora'),
    duration: z.union([z.literal(60), z.literal(90)]),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha de inicio'),
    endsOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Fecha no válida'),
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
        message: `Máximo ${defaultCapacity[value.category]} alumnos en este grupo`,
      })
    }
  })

export type GroupInput = z.infer<typeof groupSchema>

export const emptyGroupInput: GroupInput = {
  name: '',
  clubId: '',
  teacherId: '',
  category: 'adult',
  level: 'starter',
  weekday: 1,
  start: '19:00',
  duration: 60,
  startsOn: '',
  endsOn: '',
  studentIds: [],
}

type OtherGroup = {
  id: string
  teacherId: string
  weekday: number
  start: string
  duration: number
  active: boolean
}

/** Rules needing other data: category mixing and teacher overlaps with other active groups. */
export function groupConflicts(input: {
  groupId?: string
  teacherId: string
  weekday: number
  start: string
  duration: number
  category: StudentCategory
  students: readonly { category: StudentCategory }[]
  others: readonly OtherGroup[]
}) {
  const errors: Record<string, string> = {}
  if (input.students.some((student) => student.category !== input.category)) {
    errors.studentIds = 'No se pueden mezclar adultos y niños en el mismo grupo'
  }
  const slot = { date: `weekday-${input.weekday}`, start: input.start, duration: input.duration }
  const clash = input.others.find(
    (other) =>
      other.active &&
      other.id !== input.groupId &&
      other.teacherId === input.teacherId &&
      slotsOverlap(slot, { date: `weekday-${other.weekday}`, start: other.start, duration: other.duration }),
  )
  if (clash) errors.start = 'El profesor ya imparte otro grupo a esa hora'
  return errors
}
