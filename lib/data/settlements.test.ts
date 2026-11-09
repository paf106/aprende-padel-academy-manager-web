import { describe, expect, it } from 'vitest'
import { buildSettlements } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { diffRows, fromRows, toRows } from '@/lib/db/mapping'
import { buildSteps } from '@/lib/db/steps'

function withFinishedClass() {
  const base = makeAppData()
  const session = base.sessions.find((s) => s.groupId)!
  const state = mutations.updateSession(base, session.id, { status: 'completed' })
  const month = session.date.slice(0, 7)
  const row = buildSettlements(state, `${month}-01`).find((t) => t.teacherId === session.teacherId)!
  return { state, month, row }
}

describe('teacher settlements', () => {
  it('keeps what was paid for a month, once', () => {
    const { state, month, row } = withFinishedClass()
    expect(row.totalCents).toBeGreaterThan(0)
    const paid = { amountCents: row.totalCents, sessions: row.sessions, hours: row.hours }
    const next = mutations.markSettlementPaid(state, row.teacherId, month, '2026-11-30', paid)
    expect(next.teacherSettlements).toHaveLength(1)
    expect(next.teacherSettlements[0]).toMatchObject({
      teacherId: row.teacherId,
      month,
      paidOn: '2026-11-30',
      ...paid,
    })
    expect(mutations.markSettlementPaid(next, row.teacherId, month, '2026-12-01', paid)).toBe(next)
  })

  it('does not record a settlement of nothing', () => {
    const { state, month, row } = withFinishedClass()
    expect(
      mutations.markSettlementPaid(state, row.teacherId, month, '2026-11-30', {
        amountCents: 0,
        sessions: 0,
        hours: 0,
      }),
    ).toBe(state)
  })

  it('can be undone', () => {
    const { state, month, row } = withFinishedClass()
    const paid = mutations.markSettlementPaid(state, row.teacherId, month, '2026-11-30', {
      amountCents: row.totalCents,
      sessions: row.sessions,
      hours: row.hours,
    })
    const undone = mutations.undoSettlement(paid, paid.teacherSettlements[0].id)
    expect(undone.teacherSettlements).toEqual([])
  })

  it('shows a difference when the month changes after it was paid', () => {
    const { state, month, row } = withFinishedClass()
    const paid = mutations.markSettlementPaid(state, row.teacherId, month, '2026-11-30', {
      amountCents: row.totalCents,
      sessions: row.sessions,
      hours: row.hours,
    })
    const other = paid.sessions.find((s) => s.groupId && s.status === 'pending' && s.date.startsWith(month))
    if (!other) return
    const later = mutations.updateSession(paid, other.id, { status: 'completed' })
    const now = buildSettlements(later, `${month}-01`).find((t) => t.teacherId === row.teacherId)!
    expect(now.totalCents).toBeGreaterThan(paid.teacherSettlements[0].amountCents)
  })

  it('is saved as one new row and read back', () => {
    const { state, month, row } = withFinishedClass()
    const paid = mutations.markSettlementPaid(state, row.teacherId, month, '2026-11-30', {
      amountCents: row.totalCents,
      sessions: row.sessions,
      hours: 1.5,
    })
    const steps = buildSteps(diffRows(toRows(state), toRows(paid)))
    expect(steps).toEqual([expect.objectContaining({ op: 'upsert', table: 'payments.teacher_settlements' })])
    const readBack = fromRows(toRows(paid))
    expect(readBack.teacherSettlements[0]).toMatchObject({ month, paidOn: '2026-11-30', hours: 1.5 })
  })
})
