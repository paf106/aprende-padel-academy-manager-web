import { describe, expect, it } from 'vitest'
import { getModuleRoutes, isModuleRoute } from './index'

describe('module route registry', () => {
  it('only exposes routes for enabled and active modules', () => {
    expect(getModuleRoutes(['classes'], 'primary').map((route) => route.href)).toEqual(['/clases', '/grupos'])
    expect(getModuleRoutes(['payments'], 'primary').map((route) => route.href)).toEqual(['/pagos'])
    expect(getModuleRoutes(['courts'], 'primary')).toEqual([])
  })

  it('keeps secondary class routes in their own section', () => {
    expect(getModuleRoutes(['classes'], 'secondary').map((route) => route.href)).toEqual([
      '/alumnos',
      '/profesores',
      '/clubes',
    ])
    expect(getModuleRoutes(['payments'], 'secondary')).toEqual([])
  })

  it('recognizes nested routes only for registered modules', () => {
    expect(isModuleRoute('/pagos/tarifas')).toBe(true)
    expect(isModuleRoute('/clases/abc')).toBe(true)
    expect(isModuleRoute('/pistas')).toBe(true)
    expect(isModuleRoute('/inventario')).toBe(true)
    expect(isModuleRoute('/pagos-falso')).toBe(false)
  })
})
