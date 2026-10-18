import { describe, expect, it } from 'vitest'
import { paymentBalance } from './billing'

describe('saldo de pagos', () => {
  it('calcula el saldo tras pagos parciales', () => {
    expect(paymentBalance(7000, [3000, 1000])).toEqual({
      paidCents: 4000,
      balanceCents: 3000,
      status: 'partial',
    })
  })

  it('marca como pagado un cargo con total cero', () => {
    expect(paymentBalance(0, [])).toEqual({ paidCents: 0, balanceCents: 0, status: 'none' })
  })

  it('no devuelve un saldo negativo si hay un sobrepago histórico', () => {
    expect(paymentBalance(1000, [1200])).toEqual({ paidCents: 1200, balanceCents: 0, status: 'paid' })
  })

  it('rechaza importes que no estén en céntimos enteros', () => {
    expect(() => paymentBalance(100.5, [])).toThrow()
  })
})
