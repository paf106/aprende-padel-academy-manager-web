import { describe, expect, it } from 'vitest'
import { clubCalendarColor, layoutDayEvents } from './calendar'
import { timeZoneOffsetLabel } from './index'

describe('distribución de eventos del calendario', () => {
  it('apila los solapes en cascada y mantiene alturas por duración', () => {
    const layout = layoutDayEvents([
      { id: 'one', startsAt: '2026-10-06T09:00:00', endsAt: '2026-10-06T10:30:00' },
      { id: 'two', startsAt: '2026-10-06T09:30:00', endsAt: '2026-10-06T10:00:00' },
    ])
    expect(layout[0].left).toBe(0)
    expect(layout[0].width).toBe(55)
    expect(layout[0].height).toBe(100)
    expect(layout[1].left).toBe(50)
    expect(layout[1].zIndex).toBeGreaterThan(layout[0].zIndex ?? 0)
  })

  it('no oculta eventos aunque haya más de tres clases simultáneas', () => {
    const events = Array.from({ length: 5 }, (_, index) => ({
      id: String(index),
      startsAt: `2026-10-06T09:0${index}:00`,
      endsAt: '2026-10-06T10:00:00',
    }))
    const result = layoutDayEvents(events)
    expect(result).toHaveLength(5)
    expect(result.every((event) => !event.hidden)).toBe(true)
    expect(result.at(-1)?.left).toBeGreaterThan(result[0].left)
  })

  it('usa el día completo de forma predeterminada y recorta sesiones al horario visible', () => {
    const result = layoutDayEvents([
      { id: 'before-midnight', startsAt: '2026-10-06T00:30:00', endsAt: '2026-10-06T01:00:00' },
      { id: 'late', startsAt: '2026-10-06T23:30:00', endsAt: '2026-10-07T00:30:00' },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].top).toBeGreaterThan(0)
    expect(result[1].top).toBeGreaterThan(result[0].top)
    expect(result[1].height).toBe(32)
  })

  it('mantiene los colores asociados al mismo identificador de club', () => {
    expect(clubCalendarColor('club-ambite')).toEqual(clubCalendarColor('club-ambite'))
  })

  it('acepta también índices de paleta heredados', () => {
    expect(clubCalendarColor(0)).toEqual(clubCalendarColor(7))
  })

  it('muestra la diferencia horaria local del calendario según la fecha', () => {
    expect(timeZoneOffsetLabel('Europe/Madrid', '2026-01-15T12:00:00Z')).toBe('GMT+01')
    expect(timeZoneOffsetLabel('Europe/Madrid', '2026-07-15T12:00:00Z')).toBe('GMT+02')
  })
})
