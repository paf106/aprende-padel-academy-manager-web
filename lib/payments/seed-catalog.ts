import type { RateCatalog } from '@/lib/payments/rates'

/** AprendePadel Academy 2026-2027 rates, used as demo data and in tests. */
export const aprendePadelCatalog: RateCatalog = {
  segments: [
    { id: 'child', name: 'Niños (7 a 11 años)', minAge: 7, maxAge: 11 },
    { id: 'adult', name: 'Adultos (12 a 65 años)', minAge: 12, maxAge: 65 },
    { id: 'senior', name: 'Mayores de 65 años', minAge: 66, maxAge: null },
  ],
  rates: [
    { segmentId: 'child', classesPerWeek: 1, monthlyCents: 2500 },
    { segmentId: 'adult', classesPerWeek: 1, monthlyCents: 3500 },
    { segmentId: 'senior', classesPerWeek: 1, monthlyCents: 3000 },
    { segmentId: 'child', classesPerWeek: 2, monthlyCents: 4000 },
    { segmentId: 'adult', classesPerWeek: 2, monthlyCents: 6000 },
    { segmentId: 'senior', classesPerWeek: 2, monthlyCents: 5000 },
  ],
  offers: [
    {
      id: 'family-2-w1',
      name: 'Familia de 2 miembros',
      classesPerWeek: 1,
      priceCents: 6000,
      active: true,
      composition: [{ count: 2, segmentIds: ['adult', 'senior'] }],
    },
    {
      id: 'family-3-w1',
      name: 'Familia de 3 miembros',
      classesPerWeek: 1,
      priceCents: 8000,
      active: true,
      composition: [
        { count: 2, segmentIds: ['adult', 'senior'] },
        { count: 1, segmentIds: ['child'] },
      ],
    },
    {
      id: 'family-4-w1',
      name: 'Familia de 4 miembros',
      classesPerWeek: 1,
      priceCents: 10000,
      active: true,
      composition: [
        { count: 2, segmentIds: ['adult', 'senior'] },
        { count: 2, segmentIds: ['child'] },
      ],
    },
    {
      id: 'family-2-w2',
      name: 'Familia de 2 miembros',
      classesPerWeek: 2,
      priceCents: 11000,
      active: true,
      composition: [{ count: 2, segmentIds: ['adult', 'senior'] }],
    },
    {
      id: 'family-3-w2',
      name: 'Familia de 3 miembros',
      classesPerWeek: 2,
      priceCents: 15000,
      active: true,
      composition: [
        { count: 2, segmentIds: ['adult', 'senior'] },
        { count: 1, segmentIds: ['child'] },
      ],
    },
    {
      id: 'family-4-w2',
      name: 'Familia de 4 miembros',
      classesPerWeek: 2,
      priceCents: 17000,
      active: true,
      composition: [
        { count: 2, segmentIds: ['adult', 'senior'] },
        { count: 2, segmentIds: ['child'] },
      ],
    },
  ],
}
