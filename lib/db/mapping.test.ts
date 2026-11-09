import { describe, expect, it } from 'vitest'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { diffRows, fromRows, hasChanges, orderColumns, TABLES, toRows } from '@/lib/db/mapping'

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

describe('ids', () => {
  it('every id column of the generated rows is a UUID', () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const rows = toRows(makeAppData())
    // The fixture price list reuses the readable ids of the AprendePadel constants; the seed script maps them to UUIDs.
    const priceList = ['age_segments', 'individual_rates', 'pack_offers', 'course_rates']
    for (const [table, list] of Object.entries(rows)) {
      if (priceList.some((name) => table.endsWith(name))) continue
      for (const row of list) {
        for (const [column, value] of Object.entries(row)) {
          if (value && (column === 'id' || column.endsWith('_id'))) {
            expect(value, `${table}.${column}`).toMatch(uuid)
          }
        }
      }
    }
  })
})

describe('read order', () => {
  it('every table with keys sorts by a total order that ends with its keys', () => {
    for (const spec of TABLES.filter((s) => s.keys.length > 0)) {
      const columns = orderColumns(spec)
      expect(columns.slice(-spec.keys.length), spec.table).toEqual(spec.keys)
    }
  })
})
