import { z } from 'zod'
import { studentCategories, studentGenders, studentLevels } from '@/lib/core/types'

const optionalEmail = z.union([z.literal(''), z.email('Introduce un email válido')])
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Indica la fecha de nacimiento')
  .refine(
    (value) => !Number.isNaN(Date.parse(value)) && value <= new Date().toISOString().slice(0, 10),
    'Fecha no válida',
  )

export const studentSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Indica el nombre'),
    lastName: z.string().trim().min(1, 'Indica los apellidos'),
    birthDate: isoDate,
    gender: z.enum(studentGenders),
    category: z.enum(studentCategories),
    level: z.enum(studentLevels),
    clubId: z.string().min(1, 'Elige la sede habitual'),
    extraClubIds: z.array(z.string()),
    email: optionalEmail,
    phone: z.string().trim(),
    guardianName: z.string().trim(),
    guardianPhone: z.string().trim(),
    /** Empty means a new individual billing account. */
    accountId: z.string(),
  })
  .superRefine((value, context) => {
    if (value.category === 'child' && !value.guardianName) {
      context.addIssue({
        code: 'custom',
        path: ['guardianName'],
        message: 'El tutor legal es obligatorio para niños',
      })
    }
  })

export type StudentInput = z.infer<typeof studentSchema>

export const emptyStudentInput: StudentInput = {
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: 'unspecified',
  category: 'adult',
  level: 'starter',
  clubId: '',
  extraClubIds: [],
  email: '',
  phone: '',
  guardianName: '',
  guardianPhone: '',
  accountId: '',
}
