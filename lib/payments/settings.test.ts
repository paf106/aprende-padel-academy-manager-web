import { describe, expect, it } from 'vitest'
import { validate } from '@/lib/core/validation'
import { billingSettingsSchema, defaultBillingSettings } from '@/lib/payments/settings'

describe('billing settings schema', () => {
  it('accepts the AprendePadel defaults', () => {
    expect(validate(billingSettingsSchema, defaultBillingSettings).ok).toBe(true)
  })
  it('requires at least one payment method', () => {
    expect(
      validate(billingSettingsSchema, { ...defaultBillingSettings, allowedPaymentMethods: [] }),
    ).toMatchObject({
      ok: false,
      errors: { allowedPaymentMethods: expect.any(String) },
    })
  })
  it('limits included classes and notice days', () => {
    expect(validate(billingSettingsSchema, { ...defaultBillingSettings, includedPerWeeklyClass: 0 }).ok).toBe(
      false,
    )
    expect(validate(billingSettingsSchema, { ...defaultBillingSettings, leaveNoticeDays: -1 }).ok).toBe(false)
    expect(validate(billingSettingsSchema, { ...defaultBillingSettings, leaveNoticeDays: 0 }).ok).toBe(true)
  })
})
