import { z } from 'zod'
import { cancellationReasons, type CancellationReason, type PaymentMethod } from '@/lib/core/types'

export type BillingSettings = {
  /** Classes the monthly fee covers for each weekly class (4 in a standard month). A month with fewer classes is prorated; one with more charges the extra class. */
  includedPerWeeklyClass: number
  /** Cancellation reasons that give a credit to the students affected. */
  creditReasons: CancellationReason[]
  /** Days of notice required to leave without paying the full month and losing credits. */
  leaveNoticeDays: number
  allowedPaymentMethods: PaymentMethod[]
}

/** Defaults follow the AprendePadel Academy conditions. */
export const defaultBillingSettings: BillingSettings = {
  includedPerWeeklyClass: 4,
  creditReasons: ['rain', 'bad_weather', 'teacher_absent', 'teacher_late'],
  leaveNoticeDays: 10,
  allowedPaymentMethods: ['cash', 'transfer', 'bizum'],
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)

/** Whether leaving was communicated at least `noticeDays` before the last class. */
export function leaveNoticeMet(requestedOn: string, lastClassOn: string, noticeDays: number) {
  return dayNumber(lastClassOn) - dayNumber(requestedOn) >= noticeDays
}

export const billingSettingsSchema = z.object({
  includedPerWeeklyClass: z
    .number()
    .int('Indica un número entero')
    .min(1, 'Mínimo 1 clase')
    .max(10, 'Máximo 10 clases'),
  creditReasons: z.array(z.enum(cancellationReasons)),
  leaveNoticeDays: z
    .number()
    .int('Indica un número entero')
    .min(0, 'No puede ser negativo')
    .max(60, 'Máximo 60 días'),
  allowedPaymentMethods: z
    .array(z.enum(['cash', 'transfer', 'bizum']))
    .min(1, 'Permite al menos un método de pago'),
})
