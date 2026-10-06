export const roles = ['admin', 'teacher', 'student'] as const
export type AppRole = (typeof roles)[number]

export const classStatuses = ['pending', 'completed', 'cancelled'] as const
export type ClassStatus = (typeof classStatuses)[number]

export const studentLevels = ['iniciacion', 'principiante', 'medio', 'avanzado', 'competicion'] as const
export type StudentLevel = (typeof studentLevels)[number]
export const studentCategories = ['adult','child'] as const
export type StudentCategory = (typeof studentCategories)[number]
export const studentGenders = ['female','male','other','unspecified'] as const
export type StudentGender = (typeof studentGenders)[number]
export const attendanceStatuses = ['present','absent','justified'] as const
export type AttendanceStatus = (typeof attendanceStatuses)[number]

export const statusLabels: Record<ClassStatus,string> = { pending: 'Pendiente', completed: 'Terminada', cancelled: 'Cancelada' }
export const attendanceLabels: Record<AttendanceStatus,string> = { present: 'Presente', absent: 'Ausente', justified: 'Justificada' }

export function formatInClubTime(value: string, timeZone: string, options?: { timeOnly?: boolean }) {
  return new Intl.DateTimeFormat('es-ES', options?.timeOnly
    ? { timeZone, hour: '2-digit', minute: '2-digit' }
    : { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function money(amountCents: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amountCents / 100)
}

export type ModuleId = 'classes' | 'courts' | 'payments' | 'inventory'

export const moduleLabels: Record<ModuleId, string> = {
  classes: 'Clases', courts: 'Pistas', payments: 'Pagos', inventory: 'Inventario'
}
