import type { Closure } from '@/lib/classes/closures'
import type {
  ClassStatus,
  PaymentMethod,
  StudentCategory,
  StudentGender,
  StudentLevel,
} from '@/lib/core/types'
import type { CoursePrices } from '@/lib/payments/courses'
import type { ExtraRates } from '@/lib/payments/extras'
import type { RateOverride } from '@/lib/payments/monthly-charge'
import type { RateCatalog } from '@/lib/payments/rates'
import type { BillingSettings } from '@/lib/payments/settings'
import type { TeacherRates } from '@/lib/payments/teacher-pay'

export type Club = {
  id: string
  name: string
  address: string
  city: string
  postalCode: string
  color: string
  courts: number
  /** Court rental price per hour, used by private classes. */
  courtPriceCents: number
  photo: string
  active: boolean
}
export type Teacher = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  clubIds: string[]
  active: boolean
}
export type Student = {
  id: string
  firstName: string
  lastName: string
  gender: StudentGender
  category: StudentCategory
  level: StudentLevel
  birthDate: string
  clubId: string
  extraClubIds: string[]
  email: string
  phone: string
  accountId: string
  active: boolean
  guardianName: string
  guardianPhone: string
  /** Part of the data was filled with defaults on import; cleared when the admin saves the student. */
  needsReview: boolean
}
export type Group = {
  id: string
  name: string
  clubId: string
  teacherId: string
  category: StudentCategory
  level: StudentLevel
  weekday: number
  start: string
  duration: 60 | 90
  startsOn: string
  endsOn: string
  active: boolean
  studentIds: string[]
}
/** A closed-price course (for example the June intensive): its own dates, weekdays and a single payment. */
export type Course = {
  id: string
  name: string
  clubId: string
  teacherId: string
  category: StudentCategory
  level: StudentLevel
  startsOn: string
  endsOn: string
  weekdays: number[]
  start: string
  duration: 60 | 90
  studentIds: string[]
  active: boolean
}
export type Session = {
  id: string
  groupId: string
  clubId: string
  teacherId: string
  date: string
  start: string
  duration: 60 | 90
  category: StudentCategory
  status: ClassStatus
  studentIds: string[]
  level?: StudentLevel
  attendance?: Record<string, 'unmarked' | 'present' | 'absent'>
  cancelReason?: string
  /** When set, only these students get a credit for the cancellation (e.g. only one student showed up). */
  creditedStudentIds?: string[]
  kind?: 'group' | 'private'
  courseId?: string
  /** Students added to a class they do not belong to, paid as a single class. */
  guests?: Record<string, 'drop_in'>
  /** Created by hand from the calendar: editing the group never removes it. */
  manual?: boolean
  /** Classes repeated every week from the calendar share a series. */
  seriesId?: string
}
export type Account = {
  id: string
  name: string
}

/** Immutable ledger entry: payments are never edited or deleted. */
export type PaymentRecord = {
  id: string
  accountId: string
  month: string
  amountCents: number
  method: PaymentMethod
  paidOn: string
  /** A voiding entry points to the payment it cancels. Neither of the two counts. */
  reversesId?: string
  voidReason?: string
  /** Who entered it: filled in by the database, only read by the app. */
  createdByEmail?: string
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

/** Everything the panel shows for one organization. It is loaded from the database and written back as diffs. */
export type AppData = {
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
  courses: Course[]
  coursePrices: CoursePrices
  /** Last day of the season: groups generate their classes until this date. */
  seasonEnd: string
}

export const fullName = (s: Pick<Student, 'firstName' | 'lastName'>) => `${s.firstName} ${s.lastName}`.trim()
export const teacherName = (t: Pick<Teacher, 'firstName' | 'lastName'>) =>
  `${t.firstName} ${t.lastName}`.trim()
