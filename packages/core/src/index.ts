export const roles = ['admin', 'teacher', 'student'] as const
export type AppRole = (typeof roles)[number]

export const classStatuses = ['pending', 'completed', 'cancelled'] as const
export type ClassStatus = (typeof classStatuses)[number]

export const studentLevels = ['iniciacion', 'principiante', 'medio', 'avanzado', 'competicion'] as const
export type StudentLevel = (typeof studentLevels)[number]
export const studentCategories = ['adult', 'child'] as const
export type StudentCategory = (typeof studentCategories)[number]
export const studentGenders = ['female', 'male', 'other', 'unspecified'] as const
export type StudentGender = (typeof studentGenders)[number]
export const attendanceStatuses = ['present', 'absent', 'justified'] as const
export type AttendanceStatus = (typeof attendanceStatuses)[number]

export const statusLabels: Record<ClassStatus, string> = {
  pending: 'Pendiente',
  completed: 'Terminada',
  cancelled: 'Cancelada',
}
export const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
  justified: 'Justificada',
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()
function getDateTimeFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}:${JSON.stringify(options)}`
  let formatter = dateTimeFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    dateTimeFormatters.set(key, formatter)
  }
  return formatter
}

export function formatInClubTime(value: string, timeZone: string, options?: { timeOnly?: boolean }) {
  return getDateTimeFormatter(
    'es-ES',
    options?.timeOnly
      ? { timeZone, hour: '2-digit', minute: '2-digit' }
      : { timeZone, dateStyle: 'medium', timeStyle: 'short' },
  ).format(new Date(value))
}

export function localDateInTimeZone(value: string | Date, timeZone: string) {
  const parts = getDateTimeFormatter('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

export function localTimeInTimeZone(value: string | Date, timeZone: string) {
  const parts = getDateTimeFormatter('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

export function localTodayInTimeZone(timeZone: string, now = new Date()) {
  return localDateInTimeZone(now, timeZone)
}

export function calendarMonthGrid(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(year, monthNumber - 1, 1, 12)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, monthNumber - 1, 1 - offset, 12)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
}

export { layoutDayEvents, clubCalendarColor } from './calendar'
export type { TimedCalendarEvent, CalendarEventPlacement } from './calendar'

export function money(amountCents: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amountCents / 100)
}

export { paymentBalance } from './billing'
export type { PaymentBalance } from './billing'

export type ModuleId = 'classes' | 'courts' | 'payments' | 'inventory'

export const moduleLabels: Record<ModuleId, string> = {
  classes: 'Clases',
  courts: 'Pistas',
  payments: 'Pagos',
  inventory: 'Inventario',
}
