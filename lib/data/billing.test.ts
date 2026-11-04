import { describe, expect, it } from 'vitest'
import { addDays, addMonths } from '@/lib/core/calendar-nav'
import { buildCharges, buildSettlements, groupProfitability, simulateMonth } from '@/lib/data/billing'
import { makeAppData } from '@/lib/data/fixtures'
import { mutations } from '@/lib/data/mutations'
import { localTodayInTimeZone } from '@/lib/core/dates'

const state = makeAppData()
const today = localTodayInTimeZone('Europe/Madrid')

describe('billing', () => {
  const charges = buildCharges(state, today)
  it('bills accounts with consistent totals and no unpriced members', () => {
    expect(charges.length).toBeGreaterThan(0)
    for (const charge of charges) {
      expect(charge.dueCents).toBe(charge.members.reduce((sum, line) => sum + line.totalCents, 0))
      expect(charge.members.every((line) => line.totalCents >= 0)).toBe(true)
      expect(charge.warnings).toEqual([])
    }
  })
  it('a payment settles the account', () => {
    const charge = charges.find((c) => c.dueCents > 0)!
    const paid = mutations.addPayment(state, {
      accountId: charge.account.id,
      month: today.slice(0, 7),
      amountCents: charge.dueCents,
      method: 'bizum',
      paidOn: today,
    })
    const after = buildCharges(paid, today).find((c) => c.account.id === charge.account.id)!
    expect(after.status).toBe('paid')
  })
  it('computes settlements and profitability from the data', () => {
    expect(buildSettlements(state, today).every((s) => s.totalCents >= 0)).toBe(true)
    expect(groupProfitability(state, today, charges)).toHaveLength(state.groups.length)
  })
})

describe('monthly fee from the calendar', () => {
  const longSeason = mutations.setSeasonEnd(makeAppData(), addDays(today, 120))
  const month = addMonths(today.slice(0, 7), 1)
  const madre = longSeason.students.find((s) => s.firstName === 'Madre')!
  const classes = longSeason.sessions.filter(
    (s) => s.groupId && s.date.startsWith(month) && s.studentIds.includes(madre.id),
  )
  const feeFor = (data: typeof longSeason) =>
    simulateMonth(data, madre.accountId, month, []).lines.find((l) => l.memberId === madre.id)!

  it('charges the rate for the classes the calendar has that month', () => {
    expect([4, 5]).toContain(classes.length)
    expect(feeFor(longSeason)).toMatchObject({ billedClasses: classes.length, includedClasses: 4 })
    expect(feeFor(longSeason).totalCents).toBe(Math.round((3500 * classes.length) / 4))
  })

  it('a cancelled class with discount is not charged', () => {
    const state = mutations.cancelSessions(longSeason, [classes[0].id], 'rain')
    expect(feeFor(state).billedClasses).toBe(classes.length - 1)
  })

  it('a cancelled class without discount is charged', () => {
    const state = mutations.cancelSessions(longSeason, [classes[0].id], 'other')
    expect(feeFor(state).billedClasses).toBe(classes.length)
  })

  it('a deleted class is not charged', () => {
    const state = mutations.deleteSession(longSeason, classes[0].id)
    expect(feeFor(state).billedClasses).toBe(classes.length - 1)
  })

  it('a closure removes the pending classes of those days', () => {
    const state = mutations.addClosure(longSeason, {
      id: crypto.randomUUID(),
      clubId: '',
      from: classes[0].date,
      to: classes[0].date,
      reason: 'Festivo',
    })
    expect(state.sessions.some((s) => s.id === classes[0].id)).toBe(false)
    expect(feeFor(state).billedClasses).toBe(classes.length - 1)
  })

  it('a single class bought by a guest never counts as a weekly class', () => {
    const other = longSeason.students.find((s) => s.firstName === 'Luis')!
    const state = mutations.addGuestToSession(longSeason, classes[0].id, other.id)
    const line = simulateMonth(state, other.accountId, month, []).lines.find((l) => l.memberId === other.id)
    expect(line).toBeUndefined()
  })
})
