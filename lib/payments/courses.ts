import { priceMembers, ageOn } from '@/lib/payments/pricing'
import type { AgeSegment, PackOffer, PricingResult, RateCatalog } from '@/lib/payments/rates'

/** Closed price of a course (a single payment, for example the June intensive), by age segment and combined offers. */
export type CoursePrices = {
  rates: { segmentId: string; priceCents: number }[]
  offers: PackOffer[]
}

/** AprendePadel Academy 2026-2027 intensive prices. */
export const aprendePadelCoursePrices: CoursePrices = {
  rates: [
    { segmentId: 'child', priceCents: 5000 },
    { segmentId: 'adult', priceCents: 7000 },
    { segmentId: 'senior', priceCents: 6000 },
  ],
  offers: [
    {
      id: 'course-family-2',
      name: 'Familia de 2 miembros',
      classesPerWeek: 1,
      priceCents: 12000,
      active: true,
      composition: [{ count: 2, segmentIds: ['adult', 'senior'] }],
    },
    {
      id: 'course-family-3',
      name: 'Familia de 3 miembros',
      classesPerWeek: 1,
      priceCents: 16000,
      active: true,
      composition: [
        { count: 2, segmentIds: ['adult', 'senior'] },
        { count: 1, segmentIds: ['child'] },
      ],
    },
    {
      id: 'course-family-4',
      name: 'Familia de 4 miembros',
      classesPerWeek: 1,
      priceCents: 18000,
      active: true,
      composition: [
        { count: 2, segmentIds: ['adult', 'senior'] },
        { count: 2, segmentIds: ['child'] },
      ],
    },
  ],
}

/** Course prices expressed as a single-frequency catalog, so they reuse the same best-combination logic. */
export function courseCatalog(segments: readonly AgeSegment[], prices: CoursePrices): RateCatalog {
  return {
    segments: [...segments],
    rates: prices.rates.map((r) => ({
      segmentId: r.segmentId,
      classesPerWeek: 1,
      monthlyCents: r.priceCents,
    })),
    offers: prices.offers.map((o) => ({ ...o, classesPerWeek: 1 })),
  }
}

/** Price of enrolling members in a course. Age is taken on the first day of the course. */
export function priceCourseEnrollment(
  members: readonly { id: string; birthDate: string }[],
  prices: CoursePrices,
  segments: readonly AgeSegment[],
  startsOn: string,
): PricingResult {
  const catalog = courseCatalog(segments, prices)
  return priceMembers(
    members.map((m) => {
      const age = ageOn(m.birthDate, startsOn)
      const segment = segments.find((s) => age >= s.minAge && (s.maxAge === null || age <= s.maxAge))
      return { id: m.id, segmentId: segment?.id ?? null, classesPerWeek: 1 }
    }),
    catalog,
  )
}
