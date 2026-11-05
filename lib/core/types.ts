export const roles = ['admin', 'teacher', 'student'] as const
export type AppRole = (typeof roles)[number]

export const classStatuses = ['pending', 'completed', 'cancelled'] as const
export type ClassStatus = (typeof classStatuses)[number]

export const studentLevels = ['starter', 'beginner', 'intermediate', 'advanced', 'competition'] as const
export type StudentLevel = (typeof studentLevels)[number]
export const studentCategories = ['adult', 'child'] as const
export type StudentCategory = (typeof studentCategories)[number]
export const studentGenders = ['female', 'male', 'other', 'unspecified'] as const
export type StudentGender = (typeof studentGenders)[number]
export const attendanceStatuses = ['present', 'absent', 'justified'] as const
export type AttendanceStatus = (typeof attendanceStatuses)[number]

export type ModuleId = 'classes' | 'courts' | 'payments' | 'inventory'
export type PaymentMethod = 'cash' | 'transfer' | 'bizum'

export const cancellationReasons = [
  'rain',
  'bad_weather',
  'teacher_absent',
  'teacher_late',
  'single_attendee',
  'no_show',
  'other',
] as const
export type CancellationReason = (typeof cancellationReasons)[number]
