import type {
  AttendanceStatus,
  ClassStatus,
  ModuleId,
  PaymentMethod,
  StudentCategory,
  StudentGender,
  StudentLevel,
} from '@/lib/core/types'

export const classStatusLabels: Record<ClassStatus, string> = {
  pending: 'Pendiente',
  completed: 'Terminada',
  cancelled: 'Cancelada',
}
export const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
  justified: 'Justificada',
}
export const levelLabels: Record<StudentLevel, string> = {
  starter: 'Iniciación',
  beginner: 'Principiante',
  intermediate: 'Medio',
  advanced: 'Avanzado',
  competition: 'Competición',
}
export const categoryLabels: Record<StudentCategory, string> = { adult: 'Adultos', child: 'Niños' }
export const moduleLabels: Record<ModuleId, string> = {
  classes: 'Clases',
  courts: 'Pistas',
  payments: 'Pagos',
  inventory: 'Inventario',
}
export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  bizum: 'Bizum',
}

export const genderLabels: Record<StudentGender, string> = {
  female: 'Femenino',
  male: 'Masculino',
  other: 'Otro',
  unspecified: 'Sin especificar',
}
