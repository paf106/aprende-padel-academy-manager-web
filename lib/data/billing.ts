import { expandClosedDays } from '@/lib/classes/closures'
import { addMonths } from '@/lib/core/calendar-nav'
import type { CancellationReason } from '@/lib/core/types'
import {
  teacherName,
  type Account,
  type AppData,
  type ExtraCharge,
  type Group,
  type PaymentRecord,
  type Session,
} from '@/lib/data/types'
import { accountDebt, accountStatement, type AccountStatus } from '@/lib/payments/account-billing'
import {
  monthlyCharge,
  type ChargeResult,
  type MemberLine,
  type MemberMonth,
} from '@/lib/payments/monthly-charge'
import type { AppliedOffer } from '@/lib/payments/rates'
import { resolveTeacherRate, teacherIsPaid, teacherSessionPay } from '@/lib/payments/teacher-pay'
import type { RateOverride } from '@/lib/payments/monthly-charge'

const MAX_HISTORY_MONTHS = 14

const memberName = (s: { firstName: string; lastName: string }) => `${s.firstName} ${s.lastName}`

export function creditApplies(state: AppData, session: Session, studentId: string) {
  const reason = (session.cancelReason ?? 'rain') as CancellationReason
  // Nobody came: the students lose the class and the teacher is paid for it.
  if (reason === 'no_show') return false
  // Only one student could come: that student is never charged, the others are.
  if (reason === 'single_attendee') return Boolean(session.creditedStudentIds?.includes(studentId))
  if (!state.billing.creditReasons.includes(reason)) return false
  return !session.creditedStudentIds || session.creditedStudentIds.includes(studentId)
}

/**
 * Classes of the month for every active member of an account, read from the calendar: the classes where the
 * student is a member of the group. Holidays and discounted cancellations are not charged.
 */
export function memberMonths(state: AppData, accountId: string, month: string): MemberMonth[] {
  const closedByClub = new Map<string, Set<string>>()
  const closedOn = (clubId: string, date: string) => {
    if (!closedByClub.has(clubId)) closedByClub.set(clubId, new Set(expandClosedDays(state.closures, clubId)))
    return closedByClub.get(clubId)!.has(date)
  }
  return state.students
    .filter((s) => s.accountId === accountId && s.active)
    .map((student) => {
      const mine = state.sessions.filter(
        (s) =>
          s.groupId &&
          s.date.startsWith(month) &&
          s.studentIds.includes(student.id) &&
          !s.guests?.[student.id],
      )
      let holidayClasses = 0
      let creditedCancellations = 0
      for (const session of mine) {
        if (closedOn(session.clubId, session.date)) holidayClasses += 1
        else if (session.status === 'cancelled' && creditApplies(state, session, student.id)) {
          creditedCancellations += 1
        }
      }
      return {
        memberId: student.id,
        name: memberName(student),
        birthDate: student.birthDate,
        classesPerWeek: new Set(mine.map((s) => s.groupId)).size,
        occurrences: mine.length,
        holidayClasses,
        creditedCancellations,
      }
    })
}

export type MonthStatement = {
  month: string
  result: ChargeResult
  extraCharges: ExtraCharge[]
  dueCents: number
  paidCents: number
  balanceCents: number
  surplusCents: number
  status: AccountStatus
}

export function seasonMonths(state: AppData, currentMonth: string) {
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

/** Month by month statements of an account, carrying overpayments forward. */
export function accountHistory(state: AppData, account: Account, currentMonth: string): MonthStatement[] {
  let surplus = 0
  return seasonMonths(state, currentMonth).map((month) => {
    const result = monthlyCharge({
      accountId: account.id,
      month,
      members: memberMonths(state, account.id, month),
      catalog: state.catalog,
      settings: state.billing,
      overrides: state.overrides,
    })
    const payments = state.payments.filter((p) => p.accountId === account.id && p.month === month)
    const extraCharges = state.extraCharges.filter((c) => c.accountId === account.id && c.month === month)
    const statement = accountStatement({
      members: result.lines.map((l) => ({ memberId: l.memberId, amountCents: l.totalCents })),
      adjustmentsCents: extraCharges.reduce((sum, c) => sum + c.amountCents, 0),
      creditCents: surplus,
      paymentsCents: payments.map((p) => p.amountCents),
    })
    surplus = statement.surplusCents
    return { month, result, extraCharges, ...statement }
  })
}

export type Charge = {
  account: Account
  month: string
  members: MemberLine[]
  offers: AppliedOffer[]
  overrides: RateOverride[]
  extraCharges: ExtraCharge[]
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

export function buildCharges(state: AppData, today: string): Charge[] {
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
        extraCharges: current.extraCharges,
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
    .filter((c) => c.members.length > 0 || c.extraCharges.length > 0)
}

export function monthSessions(state: AppData, today: string) {
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

export function sessionPay(state: AppData, session: Session) {
  return teacherSessionPay({
    rate: resolveTeacherRate(session.category, state.teacherRates),
    enrolledStudents: session.studentIds.length,
    durationMinutes: session.duration,
    status: session.status,
    cancelReason: session.cancelReason,
  })
}

/** Charges of the accounts that have a student whose usual club is `clubId`. Without a club, all of them. */
export function chargesOfClub(state: AppData, charges: Charge[], clubId?: string) {
  if (!clubId) return charges
  return charges.filter((c) =>
    state.students.some((s) => s.accountId === c.account.id && s.clubId === clubId),
  )
}

/** Settlements of the month; with a club, only the classes given there and the teachers who gave any. */
export function buildSettlements(state: AppData, today: string, clubId?: string): TeacherSettlementRow[] {
  const sessions = monthSessions(state, today).filter((s) => !clubId || s.clubId === clubId)
  return state.teachers
    .filter((teacher) => !clubId || sessions.some((s) => s.teacherId === teacher.id))
    .map((teacher) => {
      const mine = sessions.filter(
        (s) => s.teacherId === teacher.id && teacherIsPaid(s.status, s.cancelReason),
      )
      return {
        teacherId: teacher.id,
        name: teacherName(teacher),
        sessions: mine.length,
        hours: mine.reduce((sum, s) => sum + s.duration / 60, 0),
        totalCents: mine.reduce((sum, s) => sum + sessionPay(state, s), 0),
      }
    })
}

export function groupProfitability(
  state: AppData,
  today: string,
  charges = buildCharges(state, today),
  clubId?: string,
) {
  const sessions = monthSessions(state, today)
  return state.groups
    .filter((g) => !clubId || g.clubId === clubId)
    .map((group: Group) => {
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
              (acc, line) =>
                acc + Math.round((line.totalCents * paidRatio) / Math.max(line.classesPerWeek, 1)),
              0,
            )
        )
      }, 0)
      return { group, incomeCents: income, costCents: cost, marginCents: income - cost }
    })
}

/** What an account would be charged in a month if some members were not attending (simulator). */
export function simulateMonth(
  state: AppData,
  accountId: string,
  month: string,
  excludedMemberIds: readonly string[],
): ChargeResult {
  return monthlyCharge({
    accountId,
    month,
    members: memberMonths(state, accountId, month).filter((m) => !excludedMemberIds.includes(m.memberId)),
    catalog: state.catalog,
    settings: state.billing,
    overrides: state.overrides,
  })
}
