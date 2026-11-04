import type {
  AttendanceStatus,
  CancellationReason,
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

export const cancellationReasonLabels: Record<CancellationReason, string> = {
  rain: 'Lluvia',
  bad_weather: 'Mal tiempo',
  teacher_absent: 'El monitor no asiste',
  teacher_late: 'Retraso del monitor (20 min o más)',
  single_attendee: 'Solo asiste un alumno',
  other: 'Otro motivo',
}

/** Individual, couple or family, depending on how many students share the billing account. */
export const accountKindLabel = (memberCount: number) =>
  memberCount <= 1 ? 'Individual' : memberCount === 2 ? 'Pareja' : 'Familia'
