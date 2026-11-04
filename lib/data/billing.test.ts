import { describe, expect, it } from 'vitest'
import { buildCharges, buildSettlements, groupProfitability } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { localTodayInTimeZone } from '@/lib/core/dates'

const state = makeAppData()
const today = localTodayInTimeZone('Europe/Madrid')

describe('billing', () => {
  const charges = buildCharges(state, today)
  it('bills accounts with consistent totals and no unpriced members', () => {
    expect(charges.length).toBeGreaterThan(0)
    for (const charge of charges) {
      expect(charge.dueCents).toBe(charge.members.reduce((sum, line) => sum + line.totalCents, 0))
      expect(charge.members.every((line) => line.totalCents >= 0)).toBe(true)
      expect(charge.warnings).toEqual([])
    }
  })
  it('a payment settles the account', () => {
    const charge = charges.find((c) => c.dueCents > 0)!
    const paid = mutations.addPayment(state, {
      accountId: charge.account.id,
      month: today.slice(0, 7),
      amountCents: charge.dueCents,
      method: 'bizum',
      paidOn: today,
    })
    const after = buildCharges(paid, today).find((c) => c.account.id === charge.account.id)!
    expect(after.status).toBe('paid')
  })
  it('computes settlements and profitability from the data', () => {
    expect(buildSettlements(state, today).every((s) => s.totalCents >= 0)).toBe(true)
    expect(groupProfitability(state, today, charges)).toHaveLength(state.groups.length)
  })
})
