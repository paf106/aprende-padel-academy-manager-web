import { describe, expect, it } from 'vitest'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { diffRows, fromRows, hasChanges, toRows } from '@/lib/db/mapping'

const withTimes = (rows: ReturnType<typeof toRows>) =>
  // Postgres returns time columns with seconds.
  Object.fromEntries(
    Object.entries(rows).map(([name, list]) => [
      name,
      list.map((row) => (row.start_time ? { ...row, start_time: `${row.start_time}:00` } : row)),
    ]),
  )

describe('database mapping', () => {
  it('rows read from the database rebuild the same data', () => {
    const data = makeAppData()
    const rebuilt = fromRows(withTimes(toRows(data)))
    expect(toRows(rebuilt)).toEqual(toRows(data))
    expect(rebuilt.sessions.length).toBe(data.sessions.length)
    expect(rebuilt.groups[0].studentIds).toEqual(data.groups[0].studentIds)
  })

  it('has no changes when nothing changed', () => {
    const rows = toRows(makeAppData())
    expect(hasChanges(diffRows(rows, rows))).toBe(false)
  })

  it('only sends the rows that changed', () => {
    const data = makeAppData()
    const student = data.students[0]
    const next = mutations.setStudentActive(data, student.id, false)
    const changes = diffRows(toRows(data), toRows(next))
    expect(Object.keys(changes.upserts)).toEqual(['core.students'])
    expect(changes.upserts['core.students']).toHaveLength(1)
    expect(changes.deletes).toEqual({})
  })

  it('reports deleted rows by their key', () => {
    const data = makeAppData()
    const club = data.clubs[1]
    const changes = diffRows(toRows(data), toRows(mutations.deleteClub(data, club.id)))
    expect(changes.deletes['core.clubs']).toEqual([{ id: club.id }])
  })

  it('payments are only ever inserted', () => {
    const data = makeAppData()
    const paid = mutations.addPayment(data, {
      accountId: data.accounts[0].id,
      month: '2026-11',
      amountCents: 1000,
      method: 'bizum',
      paidOn: '2026-11-05',
    })
    const changes = diffRows(toRows(data), toRows(paid))
    expect(changes.upserts['payments.payments']).toHaveLength(1)
    expect(changes.deletes['payments.payments']).toBeUndefined()
  })
})
