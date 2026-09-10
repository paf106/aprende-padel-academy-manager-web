export const roles = ['admin', 'teacher', 'student'] as const
export type AppRole = (typeof roles)[number]

export const classStatuses = ['pending', 'completed', 'cancelled'] as const
export type ClassStatus = (typeof classStatuses)[number]

export const studentLevels = ['iniciacion', 'principiante', 'medio', 'avanzado', 'competicion'] as const
export type StudentLevel = (typeof studentLevels)[number]

export type ModuleId = 'classes' | 'courts' | 'payments' | 'inventory'

export const moduleLabels: Record<ModuleId, string> = {
  classes: 'Clases', courts: 'Pistas', payments: 'Pagos', inventory: 'Inventario'
}
