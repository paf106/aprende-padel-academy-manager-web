import { describe, expect, it } from 'vitest'
import { leaveNoticeMet, defaultBillingSettings, type BillingSettings } from '@/lib/payments/settings'
import { monthlyCharge, type MemberMonth, type RateOverride } from '@/lib/payments/monthly-charge'
import { aprendePadelCatalog as catalog } from '@/lib/payments/seed-catalog'

const member = (id: string, birthDate: string, extra: Partial<MemberMonth> = {}): MemberMonth => ({
  memberId: id,
  name: id,
  birthDate,
  classesPerWeek: 1,
  occurrences: 4,
  holidayClasses: 0,
  creditedCancellations: 0,
  ...extra,
})
const adult = (id = 'a', extra: Partial<MemberMonth> = {}) => member(id, '1990-05-12', extra)
const child = (id: string, extra: Partial<MemberMonth> = {}) => member(id, '2017-03-02', extra)

const run = (
  members: MemberMonth[],
  options: {
    settings?: Partial<BillingSettings>
    overrides?: RateOverride[]
    month?: string
  } = {},
) =>
  monthlyCharge({
    accountId: 'acc',
    month: options.month ?? '2026-11',
    members,
    catalog,
    settings: { ...defaultBillingSettings, ...options.settings },
    overrides: options.overrides,
  })

describe('fee by classes of the month (AprendePadel conditions)', () => {
  it('charges the plain fee for a four-class month', () => {
    expect(run([adult()]).totalCents).toBe(3500)
  })
  it('prorates a month with fewer classes', () => {
    const result = run([adult('a', { occurrences: 3 })])
    expect(result.lines[0]).toMatchObject({ billedClasses: 3, discountCents: 875, totalCents: 2625 })
  })
  it('charges the extra class of a five-class month', () => {
    const result = run([adult('a', { occurrences: 5 })])
    expect(result.lines[0]).toMatchObject({ extraClasses: 1, extraCents: 875, totalCents: 4375 })
  })
  it('a cancellation with discount is taken off in the same month', () => {
    expect(run([adult('a', { creditedCancellations: 1 })]).totalCents).toBe(2625)
    expect(run([adult('a', { occurrences: 5, creditedCancellations: 1 })]).totalCents).toBe(3500)
  })
  it('holidays are not charged', () => {
    expect(run([adult('a', { occurrences: 5, holidayClasses: 1 })]).totalCents).toBe(3500)
    expect(run([adult('a', { occurrences: 4, holidayClasses: 1 })]).totalCents).toBe(2625)
  })
  it('charges the full month when leaving without notice', () => {
    expect(run([adult('a', { creditedCancellations: 1, forfeitCredits: true })]).totalCents).toBe(3500)
  })
  it('scales with the days per week', () => {
    const result = run([adult('a', { classesPerWeek: 2, occurrences: 7 })])
    expect(result.lines[0]).toMatchObject({ includedClasses: 8, billedClasses: 7, totalCents: 6000 - 750 })
  })
  it('never charges less than zero', () => {
    expect(run([adult('a', { occurrences: 1, creditedCancellations: 1 })]).totalCents).toBe(0)
  })
  it('does not bill members without classes', () => {
    expect(run([adult('a'), adult('b', { classesPerWeek: 0, occurrences: 0 })]).lines).toHaveLength(1)
  })
})

describe('families', () => {
  const parents = [adult('dad'), member('mom', '1991-08-20')]
  it('charges the family offer and splits it per member', () => {
    const result = run([...parents, child('c1'), child('c2')])
    expect(result.offers.map((o) => o.offerId)).toEqual(['family-4-w1'])
    expect(result.totalCents).toBe(10000)
    expect(result.lines.reduce((sum, line) => sum + line.shareCents, 0)).toBe(10000)
  })
  it('loses the 4-member offer when a child skips the month', () => {
    const result = run([...parents, child('c1')])
    expect(result.offers.map((o) => o.offerId)).toEqual(['family-3-w1'])
    expect(result.totalCents).toBe(8000)
  })
  it('a child turning 12 stops counting as a child the month after the birthday', () => {
    const teen = member('teen', '2014-01-20')
    expect(run([...parents, teen], { month: '2026-01' }).totalCents).toBe(8000)
    expect(run([...parents, teen], { month: '2026-02' }).totalCents).toBe(6000 + 3500)
  })
  it('a child who turns 12 on the 1st still pays as a child that month', () => {
    const teen = member('teen', '2014-03-01')
    expect(run([...parents, teen], { month: '2026-03' }).totalCents).toBe(8000)
    expect(run([...parents, teen], { month: '2026-04' }).totalCents).toBe(6000 + 3500)
  })
  it('extra classes and discounts follow each member share', () => {
    const result = run([...parents, child('c1', { occurrences: 5 }), child('c2', { occurrences: 3 })])
    const long = result.lines.find((l) => l.memberId === 'c1')!
    const short = result.lines.find((l) => l.memberId === 'c2')!
    expect(long.extraCents).toBe(Math.round(long.shareCents / 4))
    expect(short.discountCents).toBe(Math.round(short.shareCents / 4))
  })
})

describe('manual overrides', () => {
  const base: RateOverride = {
    id: 'o',
    scope: 'student',
    targetId: 'a',
    amountCents: 2000,
    reason: 'Beca',
    from: '2026-10',
    to: '',
  }
  it('fixes the price of one student and prices the rest normally', () => {
    const result = run([adult('a'), adult('b')], { overrides: [base] })
    expect(result.lines.find((l) => l.memberId === 'a')).toMatchObject({
      shareCents: 2000,
      source: 'override',
    })
    expect(result.totalCents).toBe(2000 + 3500)
  })
  it('fixes the price of the whole account and splits it across members', () => {
    const result = run([adult('a'), adult('b')], {
      overrides: [{ ...base, scope: 'account', targetId: 'acc', amountCents: 5000 }],
    })
    expect(result.totalCents).toBe(5000)
    expect(result.offers).toEqual([])
  })
  it('only applies inside its month range', () => {
    expect(run([adult('a')], { overrides: [{ ...base, to: '2026-10' }] }).totalCents).toBe(3500)
    expect(run([adult('a')], { overrides: [{ ...base, from: '2026-12' }] }).totalCents).toBe(3500)
  })
})

describe('leave notice', () => {
  it('requires the configured days between the request and the last class', () => {
    expect(leaveNoticeMet('2026-11-01', '2026-11-11', 10)).toBe(true)
    expect(leaveNoticeMet('2026-11-05', '2026-11-11', 10)).toBe(false)
  })
})
