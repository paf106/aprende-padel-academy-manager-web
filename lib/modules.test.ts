import { describe, expect, it } from 'vitest'
import { getModuleRoutes, isModuleRoute } from '@/lib/modules'

describe('module route registry', () => {
  it('only exposes routes for enabled and active modules', () => {
    expect(getModuleRoutes(['classes'], 'primary').map((route) => route.href)).toEqual([
      '/classes',
      '/groups',
      '/courses',
      '/students',
    ])
    expect(getModuleRoutes(['payments'], 'primary').map((route) => route.href)).toEqual(['/payments'])
    expect(getModuleRoutes(['courts'], 'primary')).toEqual([])
  })

  it('keeps secondary class routes in their own section', () => {
    expect(getModuleRoutes(['classes'], 'secondary').map((route) => route.href)).toEqual([
      '/teachers',
      '/clubs',
      '/import',
      '/settings',
    ])
    expect(getModuleRoutes(['payments'], 'secondary')).toEqual([])
  })

  it('recognizes nested routes only for registered modules', () => {
    expect(isModuleRoute('/payments/tarifas')).toBe(true)
    expect(isModuleRoute('/classes/abc')).toBe(true)
    expect(isModuleRoute('/pistas')).toBe(true)
    expect(isModuleRoute('/inventario')).toBe(true)
    expect(isModuleRoute('/payments-falso')).toBe(false)
  })
})
