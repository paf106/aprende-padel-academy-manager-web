import { expandClosedDays } from '@/lib/classes/closures'
import { addMonths, isoWeekday, monthDates } from '@/lib/core/calendar-nav'
import type { CancellationReason } from '@/lib/core/types'
import { teacherName, type Account, type Group, type Session } from '@/lib/demo/data'
import type { DemoState, PaymentRecord } from '@/lib/demo/state'
import { accountDebt, accountStatement, type AccountStatus } from '@/lib/payments/account-billing'
import {
  monthlyCharge,
  type ChargeResult,
  type MemberLine,
  type MemberMonth,
} from '@/lib/payments/monthly-charge'
import type { AppliedOffer } from '@/lib/payments/rates'
import { resolveTeacherRate, teacherSessionPay } from '@/lib/payments/teacher-pay'
import type { RateOverride } from '@/lib/payments/monthly-charge'

const MAX_HISTORY_MONTHS = 14

const memberName = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`

export function creditApplies(state: DemoState, session: Session, studentId: string) {
  const reason = (session.cancelReason ?? 'rain') as CancellationReason
  if (!state.billing.creditReasons.includes(reason)) return false
  return !session.creditedStudentIds || session.creditedStudentIds.includes(studentId)
}

/** Classes, holidays and credited cancellations of every active member of an account for one month. */
export function memberMonths(state: DemoState, accountId: string, month: string): MemberMonth[] {
  const dates = monthDates(month)
  return state.students
    .filter((s) => s.accountId === accountId && s.active)
    .map((student) => {
      const mine = state.groups.filter((g) => g.studentIds.includes(student.id))
      let classesPerWeek = 0
      let occurrences = 0
      let holidayClasses = 0
      const attended = new Set<string>()
      for (const group of mine) {
        const closed = new Set(expandClosedDays(state.closures, group.clubId))
        const days = dates.filter(
          (d) =>
            isoWeekday(d) === group.weekday && d >= group.startsOn && (!group.endsOn || d <= group.endsOn),
        )
        if (days.length === 0) continue
        classesPerWeek += 1
        occurrences += days.length
        holidayClasses += days.filter((d) => closed.has(d)).length
        attended.add(group.id)
      }
      const creditedCancellations = state.sessions.filter(
        (s) =>
          attended.has(s.groupId) &&
          s.date.startsWith(month) &&
          s.status === 'cancelled' &&
          creditApplies(state, s, student.id),
      ).length
      return {
        memberId: student.id,
        name: memberName(student),
        birthDate: student.birthDate,
        classesPerWeek,
        occurrences,
        holidayClasses,
        creditedCancellations,
      }
    })
}

export type MonthStatement = {
  month: string
  result: ChargeResult
  dueCents: number
  paidCents: number
  balanceCents: number
  surplusCents: number
  status: AccountStatus
}

export function seasonMonths(state: DemoState, currentMonth: string) {
  const first = state.groups.map((g) => g.startsOn.slice(0, 7)).sort()[0] ?? currentMonth
  const months: string[] = []
  for (
    let month = first < currentMonth ? first : currentMonth;
    month <= currentMonth;
    month = addMonths(month, 1)
  ) {
    months.push(month)
  }
  return months.slice(-MAX_HISTORY_MONTHS)
}

/** Month by month statements of an account, carrying credits and overpayments forward. */
export function accountHistory(state: DemoState, account: Account, currentMonth: string): MonthStatement[] {
  let carried: Record<string, number> = {}
  let surplus = 0
  return seasonMonths(state, currentMonth).map((month) => {
    const result = monthlyCharge({
      accountId: account.id,
      month,
      members: memberMonths(state, account.id, month),
      catalog: state.catalog,
      settings: state.billing,
      carriedCredits: carried,
      overrides: state.overrides,
    })
    carried = Object.fromEntries(result.lines.map((l) => [l.memberId, l.earnedCreditCents]))
    const payments = state.payments.filter((p) => p.accountId === account.id && p.month === month)
    const statement = accountStatement({
      members: result.lines.map((l) => ({ memberId: l.memberId, amountCents: l.totalCents })),
      creditCents: surplus,
      paymentsCents: payments.map((p) => p.amountCents),
    })
    surplus = statement.surplusCents
    return { month, result, ...statement }
  })
}

export type Charge = {
  account: Account
  month: string
  members: MemberLine[]
  offers: AppliedOffer[]
  overrides: RateOverride[]
  warnings: string[]
  dueCents: number
  paidCents: number
  balanceCents: number
  surplusCents: number
  status: AccountStatus
  lastPayment?: PaymentRecord
  debtCents: number
  monthsOverdue: number
}

export function buildCharges(state: DemoState, today: string): Charge[] {
  const month = today.slice(0, 7)
  return state.accounts
    .map((account) => {
      const history = accountHistory(state, account, month)
      const current = history[history.length - 1]
      const debt = accountDebt(
        history.map((h) => ({ month: h.month, dueCents: h.dueCents, paidCents: h.paidCents })),
        month,
      )
      const lastPayment = state.payments
        .filter((p) => p.accountId === account.id && p.month === month)
        .sort((a, b) => b.paidOn.localeCompare(a.paidOn))[0]
      return {
        account,
        month,
        members: current.result.lines,
        offers: current.result.offers,
        overrides: current.result.overrides,
        warnings: current.result.warnings,
        dueCents: current.dueCents,
        paidCents: current.paidCents,
        balanceCents: current.balanceCents,
        surplusCents: current.surplusCents,
        status: current.status,
        lastPayment,
        debtCents: debt.totalCents,
        monthsOverdue: debt.monthsOverdue,
      }
    })
    .filter((c) => c.members.length > 0)
}

export function monthSessions(state: DemoState, today: string) {
  const month = today.slice(0, 7)
  return state.sessions.filter((s) => s.date.startsWith(month))
}

export type TeacherSettlementRow = {
  teacherId: string
  name: string
  sessions: number
  hours: number
  totalCents: number
}

export function sessionPay(state: DemoState, session: Session) {
  return teacherSessionPay({
    rate: resolveTeacherRate(session.category, state.teacherRates),
    enrolledStudents: session.studentIds.length,
    durationMinutes: session.duration,
    status: session.status,
  })
}

export function buildSettlements(state: DemoState, today: string): TeacherSettlementRow[] {
  const sessions = monthSessions(state, today)
  return state.teachers.map((teacher) => {
    const mine = sessions.filter((s) => s.teacherId === teacher.id && s.status === 'completed')
    return {
      teacherId: teacher.id,
      name: teacherName(teacher),
      sessions: mine.length,
      hours: mine.reduce((sum, s) => sum + s.duration / 60, 0),
      totalCents: mine.reduce((sum, s) => sum + sessionPay(state, s), 0),
    }
  })
}

export function groupProfitability(state: DemoState, today: string, charges = buildCharges(state, today)) {
  const sessions = monthSessions(state, today)
  return state.groups.map((group: Group) => {
    const cost = sessions
      .filter((s) => s.groupId === group.id)
      .reduce((sum, s) => sum + sessionPay(state, s), 0)
    const income = charges.reduce((sum, charge) => {
      const paidRatio = charge.dueCents === 0 ? 0 : Math.min(1, charge.paidCents / charge.dueCents)
      return (
        sum +
        charge.members
          .filter((line) => group.studentIds.includes(line.memberId))
          .reduce(
            (acc, line) => acc + Math.round((line.totalCents * paidRatio) / Math.max(line.classesPerWeek, 1)),
            0,
          )
      )
    }, 0)
    return { group, incomeCents: income, costCents: cost, marginCents: income - cost }
  })
}

/** Demo payments: past months paid, the current month paid, half paid or pending depending on the account. */
export function seedPayments(state: DemoState, today: string): PaymentRecord[] {
  const current = today.slice(0, 7)
  const previous = addMonths(current, -1)
  const methods = ['cash', 'transfer'] as const
  const base: DemoState = { ...state, payments: [] }
  const payments: PaymentRecord[] = []
  state.accounts.forEach((account, index) => {
    for (const statement of accountHistory(base, account, current)) {
      let amount = statement.dueCents
      if (statement.month === current) {
        const mode = index % 4
        amount =
          mode === 0 || mode === 3 ? statement.dueCents : mode === 1 ? Math.round(statement.dueCents / 2) : 0
      } else if (index % 5 === 0 && statement.month === previous) {
        amount = 0
      }
      if (amount <= 0) continue
      payments.push({
        id: `seed-${account.id}-${statement.month}`,
        accountId: account.id,
        month: statement.month,
        amountCents: amount,
        method: methods[(index + statement.month.length) % 2],
        paidOn: `${statement.month}-0${(index % 3) + 1}`,
      })
    }
  })
  return payments
}
