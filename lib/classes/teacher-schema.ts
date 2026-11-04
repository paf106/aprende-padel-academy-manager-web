import { z } from 'zod'

export const teacherSchema = z.object({
  firstName: z.string().trim().min(1, 'Indica el nombre'),
  lastName: z.string().trim(),
  email: z.union([z.literal(''), z.email('Introduce un email válido')]),
  phone: z.string().trim(),
  clubIds: z.array(z.string()).min(1, 'Elige al menos una sede'),
})

export type TeacherInput = z.infer<typeof teacherSchema>

export const emptyTeacherInput: TeacherInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  clubIds: [],
}
