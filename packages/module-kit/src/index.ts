import type { ModuleId } from '@aprende-padel/core'
export type { ModuleId } from '@aprende-padel/core'
export type ModuleDefinition = { id: ModuleId; name: string; description: string; href: string }
export const modules: ModuleDefinition[] = [
  { id: 'classes', name: 'Clases', description: 'Grupos, calendario y asistencia.', href: '/clases' },
  { id: 'courts', name: 'Pistas', description: 'Reservas y disponibilidad.', href: '/pistas' },
  { id: 'payments', name: 'Pagos', description: 'Tarifas, cobros y liquidaciones.', href: '/pagos' },
  { id: 'inventory', name: 'Inventario', description: 'Material de los clubes.', href: '/inventario' }
]
