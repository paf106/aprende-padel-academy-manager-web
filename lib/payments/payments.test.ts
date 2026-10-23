import { describe, expect, it } from 'vitest'
import { prorateFee } from '@/lib/payments/proration'
import { defaultTeacherRates, resolveTeacherRate, teacherSessionPay } from '@/lib/payments/teacher-pay'
import { accountDebt, accountStatement, allocateToMembers } from '@/lib/payments/account-billing'

describe('fee proration', () => {
  it('35 € with 1 of 4 cancelled = 26.25 €', () => expect(prorateFee(3500, 4, 1)).toBe(2625))
  it('35 € with 1 of 5 cancelled = 28 €', () => expect(prorateFee(3500, 5, 1)).toBe(2800))
  it('charges the full fee without cancellations', () => expect(prorateFee(3500, 4, 0)).toBe(3500))
  it('charges nothing when everything is cancelled', () => expect(prorateFee(3500, 4, 4)).toBe(0))
  it('charges nothing in a month without sessions', () => expect(prorateFee(3500, 0, 0)).toBe(0))
  it('rejects more cancelled than scheduled', () => expect(() => prorateFee(3500, 2, 3)).toThrow())
})

describe('teacher pay', () => {
  const adult = resolveTeacherRate('adult')
  const base = { rate: adult, durationMinutes: 60, status: 'completed' as const }
  it('3 enrolled → 15 €/h', () => expect(teacherSessionPay({ ...base, enrolledStudents: 3 })).toBe(1500))
  it('fewer than 3 → 12 €/h', () => expect(teacherSessionPay({ ...base, enrolledStudents: 2 })).toBe(1200))
  it('pays 90 minutes proportionally', () => {
    expect(teacherSessionPay({ ...base, enrolledStudents: 3, durationMinutes: 90 })).toBe(2250)
    expect(teacherSessionPay({ ...base, enrolledStudents: 1, durationMinutes: 90 })).toBe(1800)
  })
  it('only completed sessions count', () => {
    expect(teacherSessionPay({ ...base, enrolledStudents: 4, status: 'cancelled' })).toBe(0)
    expect(teacherSessionPay({ ...base, enrolledStudents: 4, status: 'pending' })).toBe(0)
  })
  it('teacher overrides take precedence over organization rates', () => {
    const rate = resolveTeacherRate('child', defaultTeacherRates, {
      child: { threshold: 2, belowCents: 1000 },
    })
    expect(rate).toEqual({ threshold: 2, belowCents: 1000, atOrAboveCents: 1500 })
  })
})
describe('billing account', () => {
  const members = [
    { memberId: 'parent', amountCents: 3000 },
    { memberId: 'child', amountCents: 2000 },
  ]
  it('sums members, adjustments and credit', () => {
    expect(
      accountStatement({ members, adjustmentsCents: 500, creditCents: 1000, paymentsCents: [1000] }),
    ).toEqual({ dueCents: 4500, paidCents: 1000, balanceCents: 3500, surplusCents: 0, status: 'partial' })
  })
  it('detects overpayment as surplus', () => {
    const s = accountStatement({ members, paymentsCents: [6000] })
    expect(s.surplusCents).toBe(1000)
    expect(s.status).toBe('paid')
  })
  it('splits a payment across members without losing cents', () => {
    const parts = allocateToMembers(
      [
        { memberId: 'a', amountCents: 1000 },
        { memberId: 'b', amountCents: 1000 },
        { memberId: 'c', amountCents: 1000 },
      ],
      1000,
    )
    expect(parts.reduce((s, p) => s + p.amountCents, 0)).toBe(1000)
  })
  it('computes accumulated debt and its age', () => {
    expect(
      accountDebt(
        [
          { month: '2026-08', dueCents: 3500, paidCents: 0 },
          { month: '2026-09', dueCents: 3500, paidCents: 1500 },
          { month: '2026-10', dueCents: 3500, paidCents: 0 },
        ],
        '2026-10',
      ),
    ).toEqual({ totalCents: 9000, monthsOverdue: 2, oldestMonth: '2026-08', oldestAgeMonths: 2 })
  })
})
