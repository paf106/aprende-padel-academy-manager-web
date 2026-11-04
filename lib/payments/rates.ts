export type AgeSegment = {
  id: string
  name: string
  minAge: number
  /** Null means no upper limit. */
  maxAge: number | null
}

/** Monthly price for one person in a segment attending `classesPerWeek` classes a week. */
export type IndividualRate = {
  segmentId: string
  classesPerWeek: number
  monthlyCents: number
}

/** `count` members whose age segment is one of `segmentIds`. */
export type PackSlot = { count: number; segmentIds: string[] }

/** A combined price (family, couple...) covering exactly the members described by `composition`. */
export type PackOffer = {
  id: string
  name: string
  classesPerWeek: number
  priceCents: number
  composition: PackSlot[]
  active: boolean
}

export type RateCatalog = {
  segments: AgeSegment[]
  rates: IndividualRate[]
  offers: PackOffer[]
}

export type PricingMember = {
  id: string
  /** Null when the age fits no segment. */
  segmentId: string | null
  classesPerWeek: number
}

export type MemberPrice = {
  memberId: string
  amountCents: number
  /** What this member would pay alone, when a rate exists. */
  individualCents: number | null
  source: 'offer' | 'individual' | 'unpriced'
  offerId: string | null
}

export type AppliedOffer = { offerId: string; name: string; priceCents: number; memberIds: string[] }

export type PricingResult = {
  prices: MemberPrice[]
  offers: AppliedOffer[]
  warnings: string[]
}

export const packSize = (offer: Pick<PackOffer, 'composition'>) =>
  offer.composition.reduce((sum, slot) => sum + slot.count, 0)
