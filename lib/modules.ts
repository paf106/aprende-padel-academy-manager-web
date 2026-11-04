import type { ModuleId } from '@/lib/core/types'
export type { ModuleId } from '@/lib/core/types'

export type ModuleStatus = 'active' | 'planned'
export type ModuleRoute = { href: string; label: string; section: 'primary' | 'secondary' }
export type ModuleDefinition = {
  id: ModuleId
  name: string
  description: string
  href: string
  status: ModuleStatus
  routes: readonly ModuleRoute[]
}

export const modules: readonly ModuleDefinition[] = [
  {
    id: 'classes',
    name: 'Clases',
    description: 'Grupos, calendario, alumnos, profesores y asistencia.',
    href: '/classes',
    status: 'active',
    routes: [
      { href: '/classes', label: 'Clases', section: 'primary' },
      { href: '/groups', label: 'Grupos', section: 'primary' },
      { href: '/courses', label: 'Cursos', section: 'primary' },
      { href: '/students', label: 'Alumnos', section: 'primary' },
      { href: '/teachers', label: 'Profesores', section: 'secondary' },
      { href: '/clubs', label: 'Sedes', section: 'secondary' },
      { href: '/import', label: 'Importar', section: 'secondary' },
      { href: '/setup', label: 'Configuración', section: 'secondary' },
      { href: '/settings', label: 'Ajustes', section: 'secondary' },
    ],
  },
  {
    id: 'payments',
    name: 'Pagos',
    description: 'Tarifas, cobros y liquidaciones.',
    href: '/payments',
    status: 'active',
    routes: [{ href: '/payments', label: 'Pagos', section: 'primary' }],
  },
  {
    id: 'courts',
    name: 'Pistas',
    description: 'Reservas y disponibilidad.',
    href: '/pistas',
    status: 'planned',
    routes: [{ href: '/pistas', label: 'Pistas', section: 'primary' }],
  },
  {
    id: 'inventory',
    name: 'Inventario',
    description: 'Material de los clubes.',
    href: '/inventario',
    status: 'planned',
    routes: [{ href: '/inventario', label: 'Inventario', section: 'primary' }],
  },
]

export function getModuleRoutes(enabled: readonly ModuleId[], section?: ModuleRoute['section']) {
  return modules.flatMap((module) =>
    module.status === 'active' && enabled.includes(module.id)
      ? module.routes.filter((route) => !section || route.section === section)
      : [],
  )
}

export function isModuleRoute(pathname: string) {
  return modules.some((module) =>
    module.routes.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`)),
  )
}
