import { describe, expect, it } from 'vitest'
import { addDays, addMonths } from '@/lib/core/calendar-nav'
import { localTodayInTimeZone } from '@/lib/core/dates'
import { activePayments, buildCharges } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { diffRows, toRows } from '@/lib/db/mapping'

const today = localTodayInTimeZone('Europe/Madrid')
const month = today.slice(0, 7)
const longSeason = () => mutations.setSeasonEnd(makeAppData(), addDays(today, 120))

function paidAccount() {
  const base = longSeason()
  const madre = base.students.find((s) => s.firstName === 'Madre')!
  const charge = buildCharges(base, `${month}-01`).find((c) => c.account.id === madre.accountId)!
  const state = mutations.addPayment(base, {
    accountId: madre.accountId,
    month,
    amountCents: charge.dueCents,
    method: 'cash',
    paidOn: today,
  })
  return { state, accountId: madre.accountId, due: charge.dueCents }
}
const statusOf = (state: ReturnType<typeof longSeason>, accountId: string) =>
  buildCharges(state, `${month}-01`).find((c) => c.account.id === accountId)!

describe('voiding payments', () => {
  it('a voided payment stops counting and the month goes back to unpaid', () => {
    const { state, accountId } = paidAccount()
    expect(statusOf(state, accountId).status).toBe('paid')
    const payment = state.payments[0]
    const voided = mutations.voidPayment(state, payment.id, '  Me equivoqué de cuenta ')
    expect(statusOf(voided, accountId).status).toBe('pending')
    expect(statusOf(voided, accountId).paidCents).toBe(0)
    expect(statusOf(voided, accountId).lastPayment).toBeUndefined()
    expect(activePayments(voided.payments)).toHaveLength(0)
  })

  it('keeps the payment in the history and adds an entry that points to it', () => {
    const { state } = paidAccount()
    const payment = state.payments[0]
    const voided = mutations.voidPayment(state, payment.id, 'Duplicado')
    expect(voided.payments).toHaveLength(2)
    expect(voided.payments[0]).toEqual(payment)
    expect(voided.payments[1]).toMatchObject({
      reversesId: payment.id,
      voidReason: 'Duplicado',
      amountCents: payment.amountCents,
    })
  })

  it('a payment can only be voided once, and a voiding entry cannot be voided', () => {
    const { state } = paidAccount()
    const once = mutations.voidPayment(state, state.payments[0].id, '')
    expect(mutations.voidPayment(once, state.payments[0].id, '')).toBe(once)
    expect(mutations.voidPayment(once, once.payments[1].id, '')).toBe(once)
  })

  it('voids every payment of the month at once, leaving other months alone', () => {
    const { state, accountId, due } = paidAccount()
    const nextMonth = addMonths(month, 1)
    let data = mutations.addPayment(state, {
      accountId,
      month,
      amountCents: 100,
      method: 'bizum',
      paidOn: today,
    })
    data = mutations.addPayment(data, {
      accountId,
      month: nextMonth,
      amountCents: 500,
      method: 'cash',
      paidOn: today,
    })
    const voided = mutations.voidMonthPayments(data, accountId, month, 'Pruebas')
    expect(activePayments(voided.payments).map((p) => p.month)).toEqual([nextMonth])
    expect(statusOf(voided, accountId).paidCents).toBe(0)
    expect(due).toBeGreaterThan(0)
  })

  it('saving a void only inserts one new payment row', () => {
    const { state } = paidAccount()
    const voided = mutations.voidPayment(state, state.payments[0].id, 'x')
    const changes = diffRows(toRows(state), toRows(voided))
    expect(Object.keys(changes.upserts)).toEqual(['payments.payments'])
    expect(changes.upserts['payments.payments']).toHaveLength(1)
    expect(changes.upserts['payments.payments'][0]).toMatchObject({
      reverses_id: state.payments[0].id,
      void_reason: 'x',
    })
    expect(changes.deletes).toEqual({})
  })
})
