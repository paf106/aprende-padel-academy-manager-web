import { describe, expect, it } from 'vitest'
import { calculateMonthlyStudentCharge, calculateTeacherSettlement, paymentBalance } from './billing'

describe('pagos mensuales',()=>{
  it('aplica cuota fija y admite céntimos enteros',()=>expect(calculateMonthlyStudentCharge(7050)).toBe(7050))
  it('cobra clases completadas con tres inscritos a la tarifa umbral y prorratea horas',()=>{
    const result=calculateTeacherSettlement([{sessionId:'a',startsAt:'2026-10-02T15:00:00Z',durationMinutes:90,enrolledCount:3,status:'completed',teacherId:'t'},{sessionId:'b',startsAt:'2026-10-03T15:00:00Z',durationMinutes:60,enrolledCount:2,status:'completed',teacherId:'t'},{sessionId:'c',startsAt:'2026-10-04T15:00:00Z',durationMinutes:60,enrolledCount:6,status:'cancelled',teacherId:'t'}],'2026-10',{belowThresholdCents:1200,thresholdRateCents:1500,studentThreshold:3})
    expect(result.map(item=>item.amountCents)).toEqual([2250,1200])
  })
  it('calcula pagos parciales y saldo restante',()=>expect(paymentBalance(7000,[3000,1000])).toEqual({paidCents:4000,balanceCents:3000,status:'partial'}))
})
