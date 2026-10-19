import { describe, expect, it } from 'vitest'
import { calendarHeadingLabel, calendarMonthGrid, localDateInTimeZone, localTodayInTimeZone } from './index'

describe('calendario local', () => {
  it('genera una cuadrícula de cinco semanas que empieza en lunes cuando basta', () => {
    const days = calendarMonthGrid('2026-10')
    expect(days).toHaveLength(35)
    expect(days[0]).toBe('2026-09-28')
    expect(days[34]).toBe('2026-11-01')
  })

  it('ajusta el calendario mensual a cuatro, cinco o seis semanas', () => {
    expect(calendarMonthGrid('2021-02')).toHaveLength(28)
    expect(calendarMonthGrid('2026-02')).toHaveLength(35)
    expect(calendarMonthGrid('2021-05')).toHaveLength(42)
  })

  it('presenta el encabezado por periodo como Google Calendar', () => {
    expect(calendarHeadingLabel('2026-10-19', 'week')).toBe('octubre de 2026')
    expect(calendarHeadingLabel('2026-09-30', 'week')).toBe('sept – oct de 2026')
    expect(calendarHeadingLabel('2027-01-01', 'week')).toBe('dic 2026 – ene 2027')
    expect(calendarHeadingLabel('2026-10-19', 'month')).toBe('octubre de 2026')
    expect(calendarHeadingLabel('2026-10-19', 'year')).toBe('2026')
  })

  it('devuelve fecha y día actual en la zona horaria del club', () => {
    expect(localDateInTimeZone('2026-10-05T23:30:00Z', 'Europe/Madrid')).toBe('2026-10-06')
    expect(localTodayInTimeZone('Europe/Madrid', new Date('2026-10-05T23:30:00Z'))).toBe('2026-10-06')
  })
})
