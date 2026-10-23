import { accountDebt, accountStatement, type AccountStatus } from '@/lib/payments/account-billing'
import { defaultTeacherRates, resolveTeacherRate, teacherSessionPay } from '@/lib/payments/teacher-pay'
import { prorateFee } from '@/lib/payments/proration'
import {
  accounts,
  feePlans,
  generateSessions,
  groups,
  students,
  teachers,
  type Account,
  type Session,
} from '@/lib/demo/data'

export type ChargeMember = {
  studentId: string
  name: string
  baseCents: number
  scheduled: number
  cancelled: number
  proratedCents: number
}
export type Charge = {
  account: Account
  members: ChargeMember[]
  dueCents: number
  paidCents: number
  balanceCents: number
  status: AccountStatus
  lastPayment?: { date: string; method: 'cash' | 'transfer' | 'bizum' }
  debtCents: number
  monthsOverdue: number
}

export function monthSessions(today: string) {
  const month = today.slice(0, 7)
  return generateSessions(today).filter((s) => s.date.startsWith(month))
}

export function buildCharges(today: string): Charge[] {
  const month = today.slice(0, 7)
  const sessions = monthSessions(today)
  return accounts
    .map((account, index) => {
      const plan = feePlans.find((p) => p.id === account.feePlanId)!
      const members: ChargeMember[] = students
        .filter((s) => s.accountId === account.id && s.active)
        .map((s) => {
          const mine = sessions.filter((x) =>
            groups.find((g) => g.id === x.groupId)?.studentIds.includes(s.id),
          )
          const scheduled = mine.length
          const cancelled = mine.filter((x) => x.status === 'cancelled').length
          return {
            studentId: s.id,
            name: `${s.firstName} ${s.lastName}`,
            baseCents: scheduled ? plan.monthlyCents : 0,
            scheduled,
            cancelled,
            proratedCents: prorateFee(scheduled ? plan.monthlyCents : 0, scheduled, cancelled),
          }
        })
        .filter((m) => m.scheduled > 0)
      const memberCharges = members.map((m) => ({ memberId: m.studentId, amountCents: m.proratedCents }))
      const due = memberCharges.reduce((sum, m) => sum + m.amountCents, 0)
      const mode = index % 4
      const payments = mode === 0 || mode === 3 ? [due] : mode === 1 ? [Math.round(due / 2)] : []
      const statement = accountStatement({ members: memberCharges, paymentsCents: payments })
      const previousUnpaid =
        index % 5 === 0 ? [{ month: '2026-08', dueCents: plan.monthlyCents, paidCents: 0 }] : []
      const debt = accountDebt(
        [...previousUnpaid, { month, dueCents: statement.dueCents, paidCents: statement.paidCents }],
        month,
      )
      return {
        account,
        members,
        ...statement,
        lastPayment:
          statement.paidCents > 0
            ? {
                date: `${month}-0${(index % 8) + 1}`,
                method: (['cash', 'transfer', 'bizum'] as const)[index % 3],
              }
            : undefined,
        debtCents: debt.totalCents,
        monthsOverdue: debt.monthsOverdue,
      }
    })
    .filter((c) => c.members.length > 0)
}

export type TeacherSettlementRow = {
  teacherId: string
  name: string
  sessions: number
  hours: number
  totalCents: number
}

export function sessionPay(session: Session) {
  const group = groups.find((g) => g.id === session.groupId)!
  const rate = resolveTeacherRate(session.category, defaultTeacherRates)
  return teacherSessionPay({
    rate,
    enrolledStudents: session.studentIds.length,
    durationMinutes: session.duration,
    status: session.status,
  })
}

export function buildSettlements(today: string): TeacherSettlementRow[] {
  const sessions = monthSessions(today)
  return teachers.map((teacher) => {
    const mine = sessions.filter((s) => s.teacherId === teacher.id && s.status === 'completed')
    return {
      teacherId: teacher.id,
      name: teacher.name,
      sessions: mine.length,
      hours: mine.reduce((sum, s) => sum + s.duration / 60, 0),
      totalCents: mine.reduce((sum, s) => sum + sessionPay(s), 0),
    }
  })
}

export function groupProfitability(today: string) {
  const sessions = monthSessions(today)
  const charges = buildCharges(today)
  return groups.map((group) => {
    const mine = sessions.filter((s) => s.groupId === group.id)
    const cost = mine.reduce((sum, s) => sum + sessionPay(s), 0)
    const income = charges.reduce(
      (sum, charge) =>
        sum +
        charge.members
          .filter((m) => group.studentIds.includes(m.studentId))
          .reduce((acc, m) => {
            const share = charge.balanceCents === 0 ? 1 : charge.paidCents / Math.max(charge.dueCents, 1)
            return acc + Math.round(m.proratedCents * share)
          }, 0),
      0,
    )
    return { group, incomeCents: income, costCents: cost, marginCents: income - cost }
  })
}
