import { describe, expect, it } from 'vitest'
import { calendarMonthGrid, localDateInTimeZone, localTodayInTimeZone } from './index'

describe('calendario local', () => {
  it('genera una cuadrícula de seis semanas que empieza en lunes', () => {
    const days = calendarMonthGrid('2026-10')
    expect(days).toHaveLength(42)
    expect(days[0]).toBe('2026-09-28')
    expect(days[41]).toBe('2026-11-08')
  })

  it('devuelve fecha y día actual en la zona horaria del club', () => {
    expect(localDateInTimeZone('2026-10-05T23:30:00Z', 'Europe/Madrid')).toBe('2026-10-06')
    expect(localTodayInTimeZone('Europe/Madrid', new Date('2026-10-05T23:30:00Z'))).toBe('2026-10-06')
  })
})
