import { z } from 'zod'

export const clubColors = ['brand', 'info', 'warning', 'danger'] as const
export type ClubColor = (typeof clubColors)[number]

export const clubSchema = z.object({
  name: z.string().trim().min(1, 'Indica el nombre de la sede'),
  address: z.string().trim().min(1, 'Indica la dirección'),
  city: z.string().trim().min(1, 'Indica la población'),
  postalCode: z
    .string()
    .trim()
    .regex(/^(\d{5})?$/, 'El código postal tiene 5 dígitos'),
  courts: z
    .number()
    .int('Indica un número entero')
    .min(1, 'Debe haber al menos 1 pista')
    .max(50, 'Demasiadas pistas'),
  color: z.enum(clubColors),
  photo: z
    .string()
    .refine((value) => value === '' || value.startsWith('data:image/'), 'La foto no es válida'),
})

export type ClubInput = z.infer<typeof clubSchema>

export const emptyClubInput: ClubInput = {
  name: '',
  address: '',
  city: '',
  postalCode: '',
  courts: 1,
  color: 'brand',
  photo: '',
}
