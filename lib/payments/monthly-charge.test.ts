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
    carried?: Record<string, number>
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
    carriedCredits: options.carried,
    overrides: options.overrides,
  })

describe('included classes mode (AprendePadel conditions)', () => {
  it('charges the plain fee for a four-class month', () => {
    expect(run([adult()]).totalCents).toBe(3500)
  })
  it('charges the proportional extra class in a five-week month', () => {
    const result = run([adult('a', { occurrences: 5 })])
    expect(result.lines[0]).toMatchObject({ extraClasses: 1, extraCents: 875, totalCents: 4375 })
  })
  it('earns a credit for a rain cancellation and applies it the next month', () => {
    const november = run([adult('a', { occurrences: 5, creditedCancellations: 1 })])
    expect(november.lines[0].earnedCreditCents).toBe(875)
    const december = run([adult()], { carried: { a: november.lines[0].earnedCreditCents }, month: '2026-12' })
    expect(december.totalCents).toBe(3500 - 875)
  })
  it('a holiday is charged as an extra class and credited later, netting zero over two months', () => {
    const january = run([adult('a', { occurrences: 5, holidayClasses: 1 })])
    expect(january.totalCents).toBe(4375)
    expect(january.lines[0].earnedCreditCents).toBe(875)
  })
  it('can apply credits in the same month', () => {
    const result = run([adult('a', { creditedCancellations: 1 })], {
      settings: { creditTiming: 'same_month' },
    })
    expect(result.totalCents).toBe(3500 - 875)
  })
  it('does not apply credits when leaving without notice', () => {
    const result = run([adult('a', { forfeitCredits: true })], { carried: { a: 875 } })
    expect(result.totalCents).toBe(3500)
  })
  it('never charges less than zero', () => {
    expect(run([adult()], { carried: { a: 99999 } }).totalCents).toBe(0)
  })
  it('can disable extra classes', () => {
    expect(
      run([adult('a', { occurrences: 5 })], { settings: { chargeExtraClasses: false } }).totalCents,
    ).toBe(3500)
  })
  it('does not bill members without classes', () => {
    expect(run([adult('a'), adult('b', { classesPerWeek: 0, occurrences: 0 })]).lines).toHaveLength(1)
  })
})

describe('prorate mode', () => {
  const settings = { mode: 'prorate' as const }
  it('prorates inside the same month', () => {
    expect(run([adult('a', { creditedCancellations: 1 })], { settings }).totalCents).toBe(2625)
    expect(run([adult('a', { occurrences: 5, creditedCancellations: 1 })], { settings }).totalCents).toBe(
      2800,
    )
  })
  it('holidays are not scheduled classes', () => {
    expect(run([adult('a', { occurrences: 5, holidayClasses: 1 })], { settings }).totalCents).toBe(3500)
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
  it('a child turning 13 stops counting as a child the month after the birthday', () => {
    const teen = member('teen', '2013-01-20')
    expect(run([...parents, teen], { month: '2026-01' }).totalCents).toBe(8000)
    expect(run([...parents, teen], { month: '2026-02' }).totalCents).toBe(6000 + 3500)
  })
  it('extra classes and credits follow each member share', () => {
    const result = run([...parents, child('c1', { occurrences: 5, creditedCancellations: 1 })])
    const kid = result.lines.find((l) => l.memberId === 'c1')!
    expect(kid.extraCents).toBe(Math.round(kid.shareCents / 4))
    expect(kid.earnedCreditCents).toBe(Math.round(kid.shareCents / 4))
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
