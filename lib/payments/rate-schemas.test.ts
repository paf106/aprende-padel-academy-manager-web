import { describe, expect, it } from 'vitest'
import { validate } from '@/lib/core/validation'
import {
  emptyOfferInput,
  offerIndividualTotal,
  offerSchema,
  overrideSchema,
  segmentDeletionBlockers,
  segmentOverlap,
  segmentSchema,
} from '@/lib/payments/rate-schemas'
import { aprendePadelCatalog as catalog } from '@/lib/payments/seed-catalog'

describe('segment schema', () => {
  it('accepts open ended segments', () => {
    expect(validate(segmentSchema, { name: 'Mayores', minAge: 66, maxAge: null }).ok).toBe(true)
  })
  it('rejects empty names and inverted ranges', () => {
    expect(validate(segmentSchema, { name: '', minAge: 5, maxAge: 10 }).ok).toBe(false)
    expect(validate(segmentSchema, { name: 'X', minAge: 20, maxAge: 10 }).ok).toBe(false)
  })
  it('detects overlapping ages with other segments', () => {
    expect(segmentOverlap(catalog.segments, { name: 'Jóvenes', minAge: 10, maxAge: 14 })?.id).toBe('child')
    expect(segmentOverlap(catalog.segments, { name: 'Bebés', minAge: 0, maxAge: 6 })).toBeUndefined()
    expect(segmentOverlap(catalog.segments, { name: 'Mayores', minAge: 70, maxAge: null })?.id).toBe('senior')
    expect(
      segmentOverlap(catalog.segments, { name: 'Niños', minAge: 7, maxAge: 11 }, 'child'),
    ).toBeUndefined()
  })
})

describe('offer schema', () => {
  const valid = {
    ...emptyOfferInput(),
    name: 'Pareja',
    priceCents: 6000,
    composition: [{ count: 2, segmentIds: ['adult'] }],
  }
  it('accepts a valid offer', () => expect(validate(offerSchema, valid).ok).toBe(true))
  it('needs at least two people and a segment in every row', () => {
    expect(validate(offerSchema, { ...valid, composition: [{ count: 1, segmentIds: ['adult'] }] }).ok).toBe(
      false,
    )
    expect(validate(offerSchema, { ...valid, composition: [{ count: 2, segmentIds: [] }] }).ok).toBe(false)
    expect(validate(offerSchema, { ...valid, composition: [] }).ok).toBe(false)
  })
  it('compares the offer with the sum of individual rates', () => {
    const family4 = catalog.offers.find((o) => o.id === 'family-4-w1')!
    expect(offerIndividualTotal(catalog, family4)).toBe(2 * 3000 + 2 * 2500)
    expect(offerIndividualTotal(catalog, { ...family4, classesPerWeek: 3 })).toBeNull()
  })
})

describe('override schema', () => {
  const valid = {
    scope: 'student' as const,
    targetId: 's1',
    amountCents: 2000,
    reason: 'Beca',
    from: '2026-11',
    to: '',
  }
  it('requires a reason and a start month', () => {
    expect(validate(overrideSchema, valid).ok).toBe(true)
    expect(validate(overrideSchema, { ...valid, reason: '' }).ok).toBe(false)
    expect(validate(overrideSchema, { ...valid, from: '' }).ok).toBe(false)
  })
  it('rejects an end month before the start', () => {
    expect(validate(overrideSchema, { ...valid, to: '2026-10' }).ok).toBe(false)
  })
})

describe('segment deletion', () => {
  it('is blocked while rates or offers use the segment', () => {
    expect(segmentDeletionBlockers(catalog, 'child')).toHaveLength(2)
    expect(segmentDeletionBlockers({ ...catalog, rates: [], offers: [] }, 'child')).toEqual([])
  })
})
