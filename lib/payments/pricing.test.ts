import { describe, expect, it } from 'vitest'
import {
  ageOn,
  matchesComposition,
  priceMembers,
  segmentForAge,
  segmentForMonth,
} from '@/lib/payments/pricing'
import { aprendePadelCatalog as catalog } from '@/lib/payments/seed-catalog'
import type { PricingMember } from '@/lib/payments/rates'

const m = (id: string, segmentId: string | null, classesPerWeek = 1): PricingMember => ({
  id,
  segmentId,
  classesPerWeek,
})
const total = (members: PricingMember[]) =>
  priceMembers(members, catalog).prices.reduce((sum, p) => sum + p.amountCents, 0)

describe('age segments', () => {
  it('computes whole years', () => {
    expect(ageOn('2013-01-20', '2026-01-19')).toBe(12)
    expect(ageOn('2013-01-20', '2026-01-20')).toBe(13)
  })
  it('maps ages to segments with open upper limit', () => {
    expect(segmentForAge(catalog.segments, 7)?.id).toBe('child')
    expect(segmentForAge(catalog.segments, 12)?.id).toBe('child')
    expect(segmentForAge(catalog.segments, 13)?.id).toBe('adult')
    expect(segmentForAge(catalog.segments, 65)?.id).toBe('adult')
    expect(segmentForAge(catalog.segments, 66)?.id).toBe('senior')
    expect(segmentForAge(catalog.segments, 90)?.id).toBe('senior')
    expect(segmentForAge(catalog.segments, 5)).toBeNull()
  })
  it('changes the segment the month after the birthday', () => {
    expect(segmentForMonth(catalog.segments, '2013-01-20', '2026-01')?.id).toBe('child')
    expect(segmentForMonth(catalog.segments, '2013-01-20', '2026-02')?.id).toBe('adult')
  })
})

describe('composition matching', () => {
  const family3 = catalog.offers.find((o) => o.id === 'family-3-w1')!.composition
  it('requires exactly the described members', () => {
    expect(matchesComposition(family3, ['adult', 'senior', 'child'])).toBe(true)
    expect(matchesComposition(family3, ['adult', 'child', 'child'])).toBe(false)
    expect(matchesComposition(family3, ['adult', 'adult'])).toBe(false)
    expect(matchesComposition(family3, ['adult', 'adult', null])).toBe(false)
  })
})

describe('best combination (AprendePadel 2026-2027)', () => {
  const parents = [m('dad', 'adult'), m('mom', 'adult')]
  it('prices individuals with their own rate', () => {
    expect(total([m('a', 'adult')])).toBe(3500)
    expect(total([m('c', 'child')])).toBe(2500)
    expect(total([m('s', 'senior')])).toBe(3000)
  })
  it('a couple pays the 2-member offer instead of two adult rates', () => {
    expect(total(parents)).toBe(6000)
  })
  it('parents and two children pay the 4-member offer', () => {
    const result = priceMembers([...parents, m('c1', 'child'), m('c2', 'child')], catalog)
    expect(result.offers.map((o) => o.offerId)).toEqual(['family-4-w1'])
    expect(result.prices.reduce((sum, p) => sum + p.amountCents, 0)).toBe(10000)
  })
  it('when a child leaves the family drops to the 3-member offer', () => {
    const result = priceMembers([...parents, m('c1', 'child')], catalog)
    expect(result.offers.map((o) => o.offerId)).toEqual(['family-3-w1'])
    expect(result.prices.reduce((sum, p) => sum + p.amountCents, 0)).toBe(8000)
  })
  it('without a second adult there is no family offer', () => {
    expect(total([m('mom', 'adult'), m('c1', 'child'), m('c2', 'child')])).toBe(3500 + 2500 + 2500)
  })
  it('keeps pack prices lower than the sum of individual rates', () => {
    const result = priceMembers([...parents, m('c1', 'child'), m('c2', 'child')], catalog)
    expect(result.prices.every((p) => p.individualCents !== null)).toBe(true)
    expect(result.prices.reduce((sum, p) => sum + (p.individualCents ?? 0), 0)).toBeGreaterThan(10000)
  })
  it('uses the 2-classes-a-week offers when everyone attends twice', () => {
    expect(
      total([...parents, m('c1', 'child', 2), m('c2', 'child', 2)].map((x) => ({ ...x, classesPerWeek: 2 }))),
    ).toBe(17000)
  })
  it('offers only combine members with the same frequency', () => {
    const result = priceMembers(
      [m('dad', 'adult', 2), m('mom', 'adult'), m('c1', 'child'), m('c2', 'child')],
      catalog,
    )
    expect(result.offers).toHaveLength(0)
    expect(result.prices.find((p) => p.memberId === 'dad')?.amountCents).toBe(6000)
    expect(result.prices.reduce((sum, p) => sum + p.amountCents, 0)).toBe(6000 + 3500 + 2500 + 2500)
  })
  it('a senior can fill an adult slot of a family offer', () => {
    expect(total([m('grandpa', 'senior'), m('mom', 'adult'), m('c1', 'child')])).toBe(8000)
  })
  it('splits the pack price across members without losing cents', () => {
    const { prices } = priceMembers([...parents, m('c1', 'child'), m('c2', 'child')], catalog)
    expect(prices.reduce((sum, p) => sum + p.amountCents, 0)).toBe(10000)
    expect(prices.find((p) => p.memberId === 'c1')!.amountCents).toBeLessThan(
      prices.find((p) => p.memberId === 'dad')!.amountCents,
    )
  })
  it('ignores inactive offers', () => {
    const noOffers = { ...catalog, offers: catalog.offers.map((o) => ({ ...o, active: false })) }
    expect(priceMembers(parents, noOffers).prices.reduce((sum, p) => sum + p.amountCents, 0)).toBe(7000)
  })
  it('warns about frequencies without a rate and ages without a segment', () => {
    const result = priceMembers([m('a', 'adult', 3), m('x', null)], catalog)
    expect(result.warnings).toHaveLength(2)
    expect(result.prices.every((p) => p.source === 'unpriced' && p.amountCents === 0)).toBe(true)
  })
})
