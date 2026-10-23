import { describe, expect, it } from 'vitest'
import { prorateFee } from './proration'
import { defaultTeacherRates, resolveTeacherRate, teacherSessionPay } from './teacher-pay'
import { freeSpots, hasFreeSpot } from './capacity'
import { accountDebt, accountStatement, allocateToMembers } from './account-billing'

describe('prorrateo', () => {
  it('35 € con 1 de 4 canceladas = 26,25 €', () => expect(prorateFee(3500, 4, 1)).toBe(2625))
  it('35 € con 1 de 5 canceladas = 28 €', () => expect(prorateFee(3500, 5, 1)).toBe(2800))
  it('sin cancelaciones cobra la cuota completa', () => expect(prorateFee(3500, 4, 0)).toBe(3500))
  it('todo cancelado no cobra', () => expect(prorateFee(3500, 4, 4)).toBe(0))
  it('mes sin sesiones no cobra', () => expect(prorateFee(3500, 0, 0)).toBe(0))
  it('rechaza más canceladas que programadas', () => expect(() => prorateFee(3500, 2, 3)).toThrow())
})

describe('pago al profesor', () => {
  const adult = resolveTeacherRate('adult')
  const base = { rate: adult, durationMinutes: 60, status: 'completed' as const }
  it('3 inscritos → 15 €/h', () => expect(teacherSessionPay({ ...base, enrolledStudents: 3 })).toBe(1500))
  it('menos de 3 → 12 €/h', () => expect(teacherSessionPay({ ...base, enrolledStudents: 2 })).toBe(1200))
  it('90 min se paga en proporción', () => {
    expect(teacherSessionPay({ ...base, enrolledStudents: 3, durationMinutes: 90 })).toBe(2250)
    expect(teacherSessionPay({ ...base, enrolledStudents: 1, durationMinutes: 90 })).toBe(1800)
  })
  it('solo cuentan las terminadas', () => {
    expect(teacherSessionPay({ ...base, enrolledStudents: 4, status: 'cancelled' })).toBe(0)
    expect(teacherSessionPay({ ...base, enrolledStudents: 4, status: 'pending' })).toBe(0)
  })
  it('la excepción por profesor prevalece sobre la organización', () => {
    const rate = resolveTeacherRate('child', defaultTeacherRates, {
      child: { threshold: 2, belowCents: 1000 },
    })
    expect(rate).toEqual({ threshold: 2, belowCents: 1000, atOrAboveCents: 1500 })
  })
})

describe('aforo', () => {
  it('adultos 4, niños 6', () => {
    expect(hasFreeSpot('adult', 3)).toBe(true)
    expect(hasFreeSpot('adult', 4)).toBe(false)
    expect(freeSpots('child', 4)).toBe(2)
    expect(freeSpots('child', 9)).toBe(0)
  })
})

describe('cuenta de cobro', () => {
  const members = [
    { memberId: 'madre', amountCents: 3000 },
    { memberId: 'hijo', amountCents: 2000 },
  ]
  it('suma miembros, ajustes y saldo a favor', () => {
    expect(
      accountStatement({ members, adjustmentsCents: 500, creditCents: 1000, paymentsCents: [1000] }),
    ).toEqual({ dueCents: 4500, paidCents: 1000, balanceCents: 3500, surplusCents: 0, status: 'partial' })
  })
  it('detecta el sobrepago como saldo a favor', () => {
    const s = accountStatement({ members, paymentsCents: [6000] })
    expect(s.surplusCents).toBe(1000)
    expect(s.status).toBe('paid')
  })
  it('reparte un pago entre miembros sin perder céntimos', () => {
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
  it('calcula la deuda acumulada y su antigüedad', () => {
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
