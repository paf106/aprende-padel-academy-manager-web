import { allocateToMembers } from '@/lib/payments/account-billing'
import { priceMembers, segmentForMonth } from '@/lib/payments/pricing'
import { prorateFee } from '@/lib/payments/proration'
import type { AppliedOffer, MemberPrice, RateCatalog } from '@/lib/payments/rates'
import type { BillingSettings } from '@/lib/payments/settings'

export type MemberMonth = {
  memberId: string
  name: string
  birthDate: string
  /** Number of active groups the member attends: how many days a week they come. */
  classesPerWeek: number
  /** Classes of the month, including those lost to holidays. */
  occurrences: number
  /** Classes of the month that fell on a closed day. */
  holidayClasses: number
  /** Cancelled classes whose reason gives a credit to this member. */
  creditedCancellations: number
  /** Leaving without enough notice: the month is charged in full and credits are lost. */
  forfeitCredits?: boolean
}

/** A manual price that wins over the automatic one. Months are YYYY-MM; an empty `to` means open ended. */
export type RateOverride = {
  id: string
  scope: 'student' | 'account'
  targetId: string
  amountCents: number
  reason: string
  from: string
  to: string
}

export type MemberLine = {
  memberId: string
  name: string
  segmentId: string | null
  classesPerWeek: number
  source: MemberPrice['source'] | 'override'
  offerId: string | null
  /** Monthly fee share of this member. */
  shareCents: number
  includedClasses: number
  occurrences: number
  extraClasses: number
  extraCents: number
  /** Classes (cancelled or lost to holidays) that earn a credit this month. */
  creditClasses: number
  earnedCreditCents: number
  appliedCreditCents: number
  totalCents: number
}

export type ChargeResult = {
  lines: MemberLine[]
  offers: AppliedOffer[]
  overrides: RateOverride[]
  totalCents: number
  warnings: string[]
}

export type ChargeInput = {
  accountId: string
  month: string
  members: readonly MemberMonth[]
  catalog: RateCatalog
  settings: BillingSettings
  /** Credits earned the previous month, in cents, by member. Used when credits apply the next month. */
  carriedCredits?: Readonly<Record<string, number>>
  overrides?: readonly RateOverride[]
}

const overrideActive = (override: RateOverride, month: string) =>
  override.from <= month && (!override.to || month <= override.to)

export function monthlyCharge(input: ChargeInput): ChargeResult {
  const { month, settings } = input
  const billed = input.members.filter((m) => m.classesPerWeek > 0 && m.occurrences > 0)
  const active = (input.overrides ?? []).filter((o) => overrideActive(o, month))
  const accountOverride = active.find((o) => o.scope === 'account' && o.targetId === input.accountId)
  const studentOverrides = new Map(active.filter((o) => o.scope === 'student').map((o) => [o.targetId, o]))

  const pricedMembers = billed.filter((m) => !studentOverrides.has(m.memberId))
  const segments = new Map(
    billed.map((m) => [m.memberId, segmentForMonth(input.catalog.segments, m.birthDate, month)?.id ?? null]),
  )
  const pricing = priceMembers(
    pricedMembers.map((m) => ({
      id: m.memberId,
      segmentId: segments.get(m.memberId) ?? null,
      classesPerWeek: m.classesPerWeek,
    })),
    input.catalog,
  )
  const priceOf = new Map(pricing.prices.map((p) => [p.memberId, p]))

  let shares = new Map<string, number>(pricing.prices.map((p) => [p.memberId, p.amountCents]))
  if (accountOverride && pricedMembers.length > 0) {
    const weights = pricedMembers.map((m) => ({
      memberId: m.memberId,
      amountCents: priceOf.get(m.memberId)?.amountCents ?? 0,
    }))
    shares = new Map(
      allocateToMembers(weights, accountOverride.amountCents).map((s) => [s.memberId, s.amountCents]),
    )
  }

  const usedOverrides = new Set<RateOverride>()
  const lines: MemberLine[] = billed.map((member) => {
    const studentOverride = studentOverrides.get(member.memberId)
    const price = priceOf.get(member.memberId)
    if (studentOverride) usedOverrides.add(studentOverride)
    else if (accountOverride) usedOverrides.add(accountOverride)

    const overridden = Boolean(studentOverride || accountOverride)
    const share = studentOverride ? studentOverride.amountCents : (shares.get(member.memberId) ?? 0)
    const included = member.classesPerWeek * settings.includedPerWeeklyClass
    const offered = member.occurrences - member.holidayClasses

    let extraClasses = 0
    let extraCents = 0
    let creditClasses = 0
    let earned = 0
    let applied = 0
    if (settings.mode === 'prorate') {
      const prorated = prorateFee(share, offered, Math.min(member.creditedCancellations, offered))
      applied = member.forfeitCredits ? 0 : share - prorated
      creditClasses = member.creditedCancellations
    } else {
      if (settings.chargeExtraClasses) extraClasses = Math.max(0, member.occurrences - included)
      extraCents = included > 0 ? Math.round((share * extraClasses) / included) : 0
      creditClasses = member.creditedCancellations + member.holidayClasses
      earned = included > 0 ? Math.round((share * creditClasses) / included) : 0
      const available =
        settings.creditTiming === 'same_month' ? earned : (input.carriedCredits?.[member.memberId] ?? 0)
      applied = member.forfeitCredits ? 0 : Math.min(available, share + extraCents)
    }
    return {
      memberId: member.memberId,
      name: member.name,
      segmentId: segments.get(member.memberId) ?? null,
      classesPerWeek: member.classesPerWeek,
      source: overridden ? 'override' : (price?.source ?? 'unpriced'),
      offerId: overridden ? null : (price?.offerId ?? null),
      shareCents: share,
      includedClasses: included,
      occurrences: member.occurrences,
      extraClasses,
      extraCents,
      creditClasses,
      earnedCreditCents: earned,
      appliedCreditCents: applied,
      totalCents: share + extraCents - applied,
    }
  })

  return {
    lines,
    offers: accountOverride ? [] : pricing.offers,
    overrides: [...usedOverrides],
    totalCents: lines.reduce((sum, line) => sum + line.totalCents, 0),
    warnings: pricing.warnings,
  }
}
