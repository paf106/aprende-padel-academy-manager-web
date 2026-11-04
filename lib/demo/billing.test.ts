import { describe, expect, it } from 'vitest'
import { buildCharges, buildSettlements, groupProfitability } from '@/lib/demo/billing'
import { demoStore } from '@/lib/demo/store'

const state = demoStore.getServerSnapshot()
const today = new Date().toISOString().slice(0, 10)

describe('demo billing', () => {
  const charges = buildCharges(state, today)
  it('bills accounts with consistent totals and no unpriced members', () => {
    expect(charges.length).toBeGreaterThan(5)
    for (const charge of charges) {
      expect(charge.dueCents).toBe(charge.members.reduce((sum, line) => sum + line.totalCents, 0))
      expect(charge.members.every((line) => line.totalCents >= 0)).toBe(true)
      expect(charge.warnings).toEqual([])
    }
  })
  it('applies at least one family or couple offer with the seed data', () => {
    expect(charges.some((c) => c.offers.length > 0)).toBe(true)
  })
  it('seeds payments so some accounts are paid and some have debt', () => {
    expect(charges.some((c) => c.status === 'paid')).toBe(true)
    expect(charges.some((c) => c.monthsOverdue > 0)).toBe(true)
  })
  it('computes settlements and profitability from the store', () => {
    expect(buildSettlements(state, today).every((s) => s.totalCents >= 0)).toBe(true)
    expect(groupProfitability(state, today, charges)).toHaveLength(state.groups.length)
  })
})
