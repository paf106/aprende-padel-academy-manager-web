import { describe, expect, it } from 'vitest'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { diffRows, toRows } from '@/lib/db/mapping'
import { buildSteps } from '@/lib/db/steps'

const stepsFor = (before: ReturnType<typeof makeAppData>, after: ReturnType<typeof makeAppData>) =>
  buildSteps(diffRows(toRows(before), toRows(after)))

describe('save steps', () => {
  it('has nothing to send when nothing changed', () => {
    const data = makeAppData()
    expect(stepsFor(data, data)).toEqual([])
  })

  it('writes parents before children and deletes last, children first', () => {
    const base = makeAppData()
    const group = base.groups[0]
    const madre = base.students.find((s) => s.firstName === 'Madre')!
    const next = mutations.deleteStudent(mutations.deleteGroup(base, group.id), madre.id)
    const added = mutations.createStudent(next, {
      ...madre,
      accountId: '',
      firstName: 'Nuevo',
      extraClubIds: [],
    } as never)
    const steps = stepsFor(base, added)
    const order = steps.map((s) => `${s.op} ${s.table}`)
    const firstDelete = steps.findIndex((s) => s.op === 'delete')
    expect(steps.slice(firstDelete).every((s) => s.op === 'delete')).toBe(true)
    expect(order.indexOf('upsert core.students')).toBeLessThan(firstDelete)
    expect(order.indexOf('delete classes.group_members')).toBeLessThan(order.indexOf('delete classes.groups'))
    expect(order.indexOf('delete classes.groups')).toBeLessThan(order.indexOf('delete core.students'))
  })

  it('payments are only inserted, never upserted or deleted', () => {
    const base = makeAppData()
    const account = base.accounts[0]
    const paid = mutations.addPayment(base, {
      accountId: account.id,
      month: '2026-11',
      amountCents: 100,
      method: 'cash',
      paidOn: '2026-11-05',
    })
    const steps = stepsFor(base, paid)
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ op: 'insert', table: 'payments.payments', keys: ['id'] })
    const voided = mutations.voidPayment(paid, paid.payments[0].id, 'x')
    expect(stepsFor(paid, voided).map((s) => s.op)).toEqual(['insert'])
  })

  it('sends the conflict columns of tables with a composite key', () => {
    const base = makeAppData()
    const steps = stepsFor(
      base,
      mutations.setTeacherRates(base, {
        ...base.teacherRates,
        adult: { ...base.teacherRates.adult, threshold: 4 },
      }),
    )
    expect(steps).toEqual([
      expect.objectContaining({
        table: 'payments.teacher_pay_rates',
        conflict: ['organization_id', 'category'],
      }),
    ])
  })
})
