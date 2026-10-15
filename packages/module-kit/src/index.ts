import type { ModuleId } from '@aprende-padel/core'
export type { ModuleId } from '@aprende-padel/core'

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
    href: '/clases',
    status: 'active',
    routes: [
      { href: '/clases', label: 'Clases', section: 'primary' },
      { href: '/grupos', label: 'Grupos', section: 'primary' },
      { href: '/alumnos', label: 'Alumnos', section: 'secondary' },
      { href: '/profesores', label: 'Profesores', section: 'secondary' },
      { href: '/clubes', label: 'Clubes', section: 'secondary' },
    ],
  },
  {
    id: 'payments',
    name: 'Pagos',
    description: 'Tarifas, cobros y liquidaciones.',
    href: '/pagos',
    status: 'active',
    routes: [{ href: '/pagos', label: 'Pagos', section: 'primary' }],
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
