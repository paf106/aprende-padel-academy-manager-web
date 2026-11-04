import type { Closure } from '@/lib/classes/closures'
import type { PaymentMethod } from '@/lib/core/types'
import type { Account, Club, Group, Session, Student, Teacher } from '@/lib/demo/data'
import type { RateOverride } from '@/lib/payments/monthly-charge'
import type { ExtraRates } from '@/lib/payments/extras'
import type { RateCatalog } from '@/lib/payments/rates'
import type { BillingSettings } from '@/lib/payments/settings'
import type { TeacherRates } from '@/lib/payments/teacher-pay'

/** Immutable ledger entry: payments are never edited or deleted. */
export type PaymentRecord = {
  id: string
  accountId: string
  month: string
  amountCents: number
  method: PaymentMethod
  paidOn: string
}

/** A charge outside the monthly fee: a single class, a private class or a course. Added to the account's month. */
export type ExtraCharge = {
  id: string
  accountId: string
  studentId: string
  kind: 'drop_in' | 'private' | 'course'
  description: string
  amountCents: number
  month: string
  sessionId?: string
  courseId?: string
}

export type DemoState = {
  students: Student[]
  teachers: Teacher[]
  clubs: Club[]
  groups: Group[]
  sessions: Session[]
  closures: Closure[]
  accounts: Account[]
  catalog: RateCatalog
  billing: BillingSettings
  overrides: RateOverride[]
  teacherRates: TeacherRates
  payments: PaymentRecord[]
  extras: ExtraRates
  extraCharges: ExtraCharge[]
}
