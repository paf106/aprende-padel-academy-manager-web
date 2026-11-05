import type { StudentCategory } from '@/lib/core/types'

export type TeacherRate = { threshold: number; belowCents: number; atOrAboveCents: number }
export type TeacherRates = Record<StudentCategory, TeacherRate>

export const defaultTeacherRates: TeacherRates = {
  adult: { threshold: 3, belowCents: 1200, atOrAboveCents: 1500 },
  child: { threshold: 3, belowCents: 1200, atOrAboveCents: 1500 },
}

export type TeacherRateOverrides = Partial<Record<StudentCategory, Partial<TeacherRate>>>

export function resolveTeacherRate(
  category: StudentCategory,
  organization: TeacherRates = defaultTeacherRates,
  teacher: TeacherRateOverrides = {},
): TeacherRate {
  return { ...organization[category], ...teacher[category] }
}

/** The teacher is paid for finished classes, and for classes cancelled because no student came. */
export function teacherIsPaid(status: 'pending' | 'completed' | 'cancelled', cancelReason?: string) {
  return status === 'completed' || (status === 'cancelled' && cancelReason === 'no_show')
}

export function teacherSessionPay(input: {
  rate: TeacherRate
  enrolledStudents: number
  durationMinutes: number
  status: 'pending' | 'completed' | 'cancelled'
  cancelReason?: string
}) {
  if (!teacherIsPaid(input.status, input.cancelReason)) return 0
  if (!Number.isInteger(input.enrolledStudents) || input.enrolledStudents < 0)
    throw new Error('Enrolled students must be a non-negative integer')
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0)
    throw new Error('Duration must be positive')
  const hourly =
    input.enrolledStudents >= input.rate.threshold ? input.rate.atOrAboveCents : input.rate.belowCents
  return Math.round((hourly * input.durationMinutes) / 60)
}
