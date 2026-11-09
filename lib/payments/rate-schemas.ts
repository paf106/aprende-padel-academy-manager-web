import { z } from 'zod'
import type { AgeSegment, IndividualRate, PackOffer, RateCatalog } from '@/lib/payments/rates'
import { packSize } from '@/lib/payments/rates'

const monthPattern = /^\d{4}-\d{2}$/

export const segmentSchema = z
  .object({
    name: z.string().trim().min(1, 'Indica el nombre del tramo'),
    minAge: z
      .number()
      .int('Indica una edad entera')
      .min(0, 'La edad mínima no puede ser negativa')
      .max(120, 'Edad no válida'),
    /** Null means no upper limit. */
    maxAge: z.number().int('Indica una edad entera').max(120, 'Edad no válida').nullable(),
  })
  .superRefine((value, context) => {
    if (value.maxAge !== null && value.maxAge < value.minAge) {
      context.addIssue({
        code: 'custom',
        path: ['maxAge'],
        message: 'La edad máxima no puede ser menor que la mínima',
      })
    }
  })
export type SegmentInput = z.infer<typeof segmentSchema>

/** Segments cannot share ages: every age maps to exactly one segment. */
export function segmentOverlap(segments: readonly AgeSegment[], candidate: SegmentInput, ignoreId?: string) {
  const top = (max: number | null) => max ?? Number.POSITIVE_INFINITY
  return segments.find(
    (s) => s.id !== ignoreId && candidate.minAge <= top(s.maxAge) && s.minAge <= top(candidate.maxAge),
  )
}

export const offerSchema = z
  .object({
    name: z.string().trim().min(1, 'Indica el nombre de la oferta'),
    classesPerWeek: z.number().int().min(1, 'Mínimo 1 clase por semana').max(7, 'Máximo 7 clases por semana'),
    priceCents: z.number().int().min(0, 'El precio no puede ser negativo'),
    composition: z
      .array(
        z.object({
          count: z.number().int().min(1, 'Cada fila necesita al menos 1 persona'),
          segmentIds: z.array(z.string()).min(1, 'Elige al menos un tramo en cada fila'),
        }),
      )
      .min(1, 'Describe quién entra en la oferta'),
    active: z.boolean(),
  })
  .superRefine((value, context) => {
    if (packSize(value) < 2) {
      context.addIssue({
        code: 'custom',
        path: ['composition'],
        message: 'Una oferta combinada necesita al menos 2 personas',
      })
    }
  })
export type OfferInput = z.infer<typeof offerSchema>

export const overrideSchema = z
  .object({
    scope: z.enum(['student', 'account']),
    targetId: z.string().min(1, 'Elige a quién se aplica'),
    amountCents: z.number().int().min(0, 'El precio no puede ser negativo'),
    reason: z.string().trim().min(3, 'Indica el motivo'),
    from: z.string().regex(monthPattern, 'Indica el mes de inicio'),
    to: z.string().regex(/^(\d{4}-\d{2})?$/, 'Mes no válido'),
  })
  .superRefine((value, context) => {
    if (value.to && value.to < value.from) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'El mes final no puede ser anterior al inicial',
      })
    }
  })
export type OverrideInput = z.infer<typeof overrideSchema>

export function rateInUse(rates: readonly IndividualRate[], segmentId: string, classesPerWeek: number) {
  return rates.some((r) => r.segmentId === segmentId && r.classesPerWeek === classesPerWeek)
}

/** Reasons (shown to the user) why a segment cannot be deleted. */
export function segmentDeletionBlockers(catalog: RateCatalog, segmentId: string) {
  const blockers: string[] = []
  const rates = catalog.rates.filter((r) => r.segmentId === segmentId).length
  const offers = catalog.offers.filter((o) =>
    o.composition.some((slot) => slot.segmentIds.includes(segmentId)),
  ).length
  if (rates > 0) blockers.push(`Tiene ${rates} ${rates === 1 ? 'cuota' : 'cuotas'} definidas`)
  if (offers > 0) blockers.push(`Aparece en ${offers} ${offers === 1 ? 'oferta' : 'ofertas'}`)
  return blockers
}

/** What a full pack would cost paying individual rates, or null if a member has no rate. */
export function offerIndividualTotal(
  catalog: RateCatalog,
  offer: Pick<PackOffer, 'classesPerWeek' | 'composition'>,
) {
  let total = 0
  for (const slot of offer.composition) {
    const prices = slot.segmentIds
      .map(
        (id) =>
          catalog.rates.find((r) => r.segmentId === id && r.classesPerWeek === offer.classesPerWeek)
            ?.monthlyCents,
      )
      .filter((value): value is number => value !== undefined)
    if (prices.length === 0) return null
    total += Math.min(...prices) * slot.count
  }
  return total
}

export const emptyOfferInput = (classesPerWeek = 1): OfferInput => ({
  name: '',
  classesPerWeek,
  priceCents: 0,
  composition: [{ count: 2, segmentIds: [] }],
  active: true,
})
