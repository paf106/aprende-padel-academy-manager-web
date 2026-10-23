export type MemberCharge = { memberId: string; amountCents: number }
export type AccountMonth = { month: string; dueCents: number; paidCents: number }

export type AccountStatus = 'paid' | 'partial' | 'pending' | 'none'

function assertCents(value: number) {
  if (!Number.isSafeInteger(value)) throw new Error('Amounts must be integer cents')
}

export function accountStatement(input: {
  members: readonly MemberCharge[]
  adjustmentsCents?: number
  creditCents?: number
  paymentsCents: readonly number[]
}) {
  const adjustments = input.adjustmentsCents ?? 0
  const credit = input.creditCents ?? 0
  ;[adjustments, credit, ...input.paymentsCents, ...input.members.map((m) => m.amountCents)].forEach(
    assertCents,
  )
  if (credit < 0 || input.paymentsCents.some((p) => p < 0))
    throw new Error('Negative amounts are not allowed')
  const gross = input.members.reduce((sum, m) => sum + m.amountCents, 0) + adjustments
  const dueCents = Math.max(0, gross - credit)
  const paidCents = input.paymentsCents.reduce((sum, p) => sum + p, 0)
  const balanceCents = Math.max(0, dueCents - paidCents)
  const surplusCents = Math.max(0, paidCents - dueCents)
  const status: AccountStatus =
    dueCents === 0 ? 'none' : paidCents >= dueCents ? 'paid' : paidCents > 0 ? 'partial' : 'pending'
  return { dueCents, paidCents, balanceCents, surplusCents, status }
}

export function allocateToMembers(members: readonly MemberCharge[], totalCents: number): MemberCharge[] {
  assertCents(totalCents)
  const base = members.reduce((sum, m) => sum + m.amountCents, 0)
  if (members.length === 0) return []
  if (base === 0) {
    const even = Math.floor(totalCents / members.length)
    let rest = totalCents - even * members.length
    return members.map((m) => ({ memberId: m.memberId, amountCents: even + (rest-- > 0 ? 1 : 0) }))
  }
  const shares = members.map((m) => {
    const exact = (totalCents * m.amountCents) / base
    return { memberId: m.memberId, amountCents: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let rest = totalCents - shares.reduce((sum, s) => sum + s.amountCents, 0)
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (rest <= 0) break
    share.amountCents += 1
    rest -= 1
  }
  return shares.map(({ memberId, amountCents }) => ({ memberId, amountCents }))
}

export function accountDebt(months: readonly AccountMonth[], currentMonth: string) {
  const unpaid = months.filter((m) => m.dueCents > m.paidCents).sort((a, b) => a.month.localeCompare(b.month))
  const totalCents = unpaid.reduce((sum, m) => sum + (m.dueCents - m.paidCents), 0)
  const monthIndex = (value: string) => {
    const [year, month] = value.split('-').map(Number)
    return year * 12 + month - 1
  }
  const monthsOverdue = unpaid.filter((m) => m.month < currentMonth).length
  const oldest = unpaid[0]?.month ?? null
  return {
    totalCents,
    monthsOverdue,
    oldestMonth: oldest,
    oldestAgeMonths: oldest ? Math.max(0, monthIndex(currentMonth) - monthIndex(oldest)) : 0,
  }
}
