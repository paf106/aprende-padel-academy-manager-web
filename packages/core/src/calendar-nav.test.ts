import { describe, expect, it } from 'vitest'
import { addDays, shiftDate, visibleRange, weekDays } from './calendar-nav'

describe('navegación del calendario', () => {
  it('suma días cruzando mes y año', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('la semana empieza en lunes', () => {
    const days = weekDays('2026-10-23')
    expect(days[0]).toBe('2026-10-19')
    expect(days[6]).toBe('2026-10-25')
  })
  it('desplaza por vista', () => {
    expect(shiftDate('2026-10-23', 'day', 1)).toBe('2026-10-24')
    expect(shiftDate('2026-10-23', 'week', -1)).toBe('2026-10-16')
    expect(shiftDate('2026-01-31', 'month', 1)).toBe('2026-02-28')
    expect(shiftDate('2026-10-23', 'year', 1)).toBe('2027-10-23')
  })
  it('calcula el rango visible', () => {
    expect(visibleRange('2026-02-10', 'month')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(visibleRange('2026-02-10', 'year')).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })
})
