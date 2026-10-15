import { describe, expect, it } from 'vitest'
import { clubCalendarColor, layoutDayEvents } from './calendar'

describe('distribución de eventos del calendario', () => {
  it('coloca eventos simultáneos lado a lado y mantiene alturas por duración', () => {
    const layout = layoutDayEvents([
      { id: 'one', startsAt: '2026-10-06T09:00:00', endsAt: '2026-10-06T10:30:00' },
      { id: 'two', startsAt: '2026-10-06T09:30:00', endsAt: '2026-10-06T10:00:00' },
    ])
    expect(layout[0].left).toBe(0)
    expect(layout[0].width).toBe(50)
    expect(layout[0].height).toBe(94)
    expect(layout[1].left).toBe(50)
  })

  it('recorta el inicio y oculta el cuarto evento solapado tras tres columnas', () => {
    const events = Array.from({ length: 4 }, (_, index) => ({ id: String(index), startsAt: `2026-10-06T09:0${index}:00`, endsAt: '2026-10-06T10:00:00' }))
    const result = layoutDayEvents(events)
    expect(result).toHaveLength(4)
    expect(result.filter((event) => event.hidden)).toHaveLength(1)
  })

  it('selecciona color estable dentro de la paleta', () => {
    expect(clubCalendarColor(0)).toEqual(clubCalendarColor(6))
  })
})
