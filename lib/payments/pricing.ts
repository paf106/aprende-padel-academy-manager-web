import { allocateToMembers } from '@/lib/payments/account-billing'
import {
  packSize,
  type AgeSegment,
  type AppliedOffer,
  type IndividualRate,
  type MemberPrice,
  type PackOffer,
  type PackSlot,
  type PricingMember,
  type PricingResult,
  type RateCatalog,
} from '@/lib/payments/rates'

/** Whole years on `onDate`. Both dates are YYYY-MM-DD. */
export function ageOn(birthDate: string, onDate: string) {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [y, m, d] = onDate.split('-').map(Number)
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0)
}

export function segmentForAge(segments: readonly AgeSegment[], age: number) {
  return segments.find((s) => age >= s.minAge && (s.maxAge === null || age <= s.maxAge)) ?? null
}

/** The segment is recalculated every month, on the first day of that month. */
export function segmentForMonth(segments: readonly AgeSegment[], birthDate: string, month: string) {
  return segmentForAge(segments, ageOn(birthDate, `${month}-01`))
}

export function findRate(rates: readonly IndividualRate[], segmentId: string | null, classesPerWeek: number) {
  if (!segmentId) return null
  return (
    rates.find((r) => r.segmentId === segmentId && r.classesPerWeek === classesPerWeek)?.monthlyCents ?? null
  )
}

/** Whether the members fill every slot of the composition exactly, each member in one slot. */
export function matchesComposition(slots: readonly PackSlot[], memberSegments: readonly (string | null)[]) {
  const total = slots.reduce((sum, slot) => sum + slot.count, 0)
  if (memberSegments.length !== total) return false
  const remaining = slots.map((slot) => slot.count)
  const assign = (index: number): boolean => {
    if (index === memberSegments.length) return remaining.every((n) => n === 0)
    const segment = memberSegments[index]
    if (!segment) return false
    for (let s = 0; s < slots.length; s++) {
      if (remaining[s] > 0 && slots[s].segmentIds.includes(segment)) {
        remaining[s] -= 1
        if (assign(index + 1)) return true
        remaining[s] += 1
      }
    }
    return false
  }
  return assign(0)
}

function combinations<T>(items: readonly T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [head, ...tail] = items
  return [...combinations(tail, size - 1).map((rest) => [head, ...rest]), ...combinations(tail, size)]
}

/** Cost used for a member without a rate, so that any offer covering them wins. */
const UNPRICED_PENALTY = 100_000_000

type Choice = {
  cost: number
  offers: { offer: PackOffer; members: PricingMember[] }[]
  singles: PricingMember[]
}

function bestChoice(
  members: readonly PricingMember[],
  offers: readonly PackOffer[],
  rates: readonly IndividualRate[],
): Choice {
  if (members.length === 0) return { cost: 0, offers: [], singles: [] }
  const [first, ...rest] = members
  const alone = findRate(rates, first.segmentId, first.classesPerWeek)
  const restBest = bestChoice(rest, offers, rates)
  let best: Choice = {
    cost: (alone ?? UNPRICED_PENALTY) + restBest.cost,
    offers: restBest.offers,
    singles: [first, ...restBest.singles],
  }
  for (const offer of offers) {
    if (!offer.active || offer.classesPerWeek !== first.classesPerWeek) continue
    const size = packSize(offer)
    if (size < 2 || size > members.length) continue
    for (const others of combinations(rest, size - 1)) {
      const group = [first, ...others]
      if (
        !matchesComposition(
          offer.composition,
          group.map((m) => m.segmentId),
        )
      )
        continue
      const left = rest.filter((m) => !others.includes(m))
      const sub = bestChoice(left, offers, rates)
      const cost = offer.priceCents + sub.cost
      if (cost < best.cost) {
        best = { cost, offers: [{ offer, members: group }, ...sub.offers], singles: sub.singles }
      }
    }
  }
  return best
}

/**
 * Cheapest way to price a set of members: individual rates and pack offers.
 * Offers only combine members attending the same number of classes per week.
 */
export function priceMembers(members: readonly PricingMember[], catalog: RateCatalog): PricingResult {
  const warnings: string[] = []
  const byFrequency = new Map<number, PricingMember[]>()
  for (const member of members)
    byFrequency.set(member.classesPerWeek, [...(byFrequency.get(member.classesPerWeek) ?? []), member])

  const prices: MemberPrice[] = []
  const applied: AppliedOffer[] = []
  for (const [, group] of [...byFrequency].sort((a, b) => a[0] - b[0])) {
    const choice = bestChoice(group, catalog.offers, catalog.rates)
    for (const { offer, members: covered } of choice.offers) {
      const individual = covered.map((m) => findRate(catalog.rates, m.segmentId, m.classesPerWeek))
      const shares = allocateToMembers(
        covered.map((m, i) => ({ memberId: m.id, amountCents: individual[i] ?? 0 })),
        offer.priceCents,
      )
      covered.forEach((m, i) => {
        prices.push({
          memberId: m.id,
          amountCents: shares.find((s) => s.memberId === m.id)?.amountCents ?? 0,
          individualCents: individual[i],
          source: 'offer',
          offerId: offer.id,
        })
      })
      applied.push({
        offerId: offer.id,
        name: offer.name,
        priceCents: offer.priceCents,
        memberIds: covered.map((m) => m.id),
      })
    }
    for (const member of choice.singles) {
      const rate = findRate(catalog.rates, member.segmentId, member.classesPerWeek)
      if (rate === null) {
        warnings.push(
          member.segmentId
            ? `No hay cuota para ${member.classesPerWeek} ${member.classesPerWeek === 1 ? 'clase' : 'clases'} por semana en este tramo de edad`
            : 'La edad no encaja en ningún tramo de edad',
        )
      }
      prices.push({
        memberId: member.id,
        amountCents: rate ?? 0,
        individualCents: rate,
        source: rate === null ? 'unpriced' : 'individual',
        offerId: null,
      })
    }
  }
  const order = new Map(members.map((m, i) => [m.id, i]))
  prices.sort((a, b) => (order.get(a.memberId) ?? 0) - (order.get(b.memberId) ?? 0))
  return { prices, offers: applied, warnings: [...new Set(warnings)] }
}
