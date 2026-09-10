import type { ModuleId } from '../../core/src/index'
export type ModuleDefinition = { id: ModuleId; name: string; description: string; available: boolean }
export const modules: ModuleDefinition[] = [
  { id: 'classes', name: 'Gestión de clases', description: 'Calendario, grupos y asistencia.', available: true },
  { id: 'courts', name: 'Pistas', description: 'Reserva y disponibilidad de pistas.', available: false },
  { id: 'payments', name: 'Pagos', description: 'Cuotas, cobros y liquidaciones.', available: false },
  { id: 'inventory', name: 'Inventario', description: 'Material de cada club.', available: false }
]
