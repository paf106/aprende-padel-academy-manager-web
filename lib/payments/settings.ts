import type { CancellationReason, PaymentMethod } from '@/lib/core/types'

/**
 * included: the fee includes N classes per weekly class; extra classes are charged and credits apply later.
 * prorate: the fee is prorated inside the same month by cancelled classes.
 */
export type BillingMode = 'included' | 'prorate'
export type CreditTiming = 'next_month' | 'same_month'

export type BillingSettings = {
  mode: BillingMode
  /** Classes included in the monthly fee for each weekly class (4 in a standard month). */
  includedPerWeeklyClass: number
  chargeExtraClasses: boolean
  creditTiming: CreditTiming
  /** Cancellation reasons that give a credit to the students affected. */
  creditReasons: CancellationReason[]
  /** Days of notice required to leave without paying the full month and losing credits. */
  leaveNoticeDays: number
  allowedPaymentMethods: PaymentMethod[]
}

/** Defaults follow the AprendePadel Academy conditions. */
export const defaultBillingSettings: BillingSettings = {
  mode: 'included',
  includedPerWeeklyClass: 4,
  chargeExtraClasses: true,
  creditTiming: 'next_month',
  creditReasons: ['rain', 'bad_weather', 'teacher_absent', 'teacher_late', 'single_attendee'],
  leaveNoticeDays: 10,
  allowedPaymentMethods: ['cash', 'transfer'],
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)

/** Whether leaving was communicated at least `noticeDays` before the last class. */
export function leaveNoticeMet(requestedOn: string, lastClassOn: string, noticeDays: number) {
  return dayNumber(lastClassOn) - dayNumber(requestedOn) >= noticeDays
}
