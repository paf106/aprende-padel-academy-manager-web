import { allocateToMembers } from '@/lib/payments/account-billing'

/** Prices outside the monthly fee: single classes and private classes. */
export type ExtraRates = {
  /** Price of one 60-minute class for someone who is not in the group (paid the same day). */
  dropInCents: number
  /** Instructor price of a private class (60 minutes) with one student. */
  privateOneCents: number
  /** Instructor price per student of a private class (60 minutes) with two students. */
  privateTwoCents: number
  privateMinAge: number
}

/** AprendePadel Academy 2026-2027 conditions. */
export const aprendePadelExtras: ExtraRates = {
  dropInCents: 1500,
  privateOneCents: 3000,
  privateTwoCents: 2500,
  privateMinAge: 13,
}

export const MAX_PRIVATE_STUDENTS = 2

const scale = (cents: number, durationMinutes: number) => Math.round((cents * durationMinutes) / 60)

export function dropInPrice(extras: ExtraRates, durationMinutes: number) {
  return scale(extras.dropInCents, durationMinutes)
}

export type PrivateClassPrice = {
  /** Instructor price per student. */
  instructorPerStudentCents: number
  /** Share of the court price paid by each student, in the same order as the students. */
  courtCents: number[]
  /** Total each student pays, in the same order as the students. */
  perStudentCents: number[]
  totalCents: number
}

/** Instructor price per student plus the court price of the class, split equally between students. */
export function privateClassPrice(input: {
  extras: ExtraRates
  students: number
  durationMinutes: number
  courtPricePerHourCents: number
}): PrivateClassPrice {
  if (!Number.isInteger(input.students) || input.students < 1 || input.students > MAX_PRIVATE_STUDENTS) {
    throw new Error('Private classes are for one or two students')
  }
  const instructorPerStudentCents = scale(
    input.students === 1 ? input.extras.privateOneCents : input.extras.privateTwoCents,
    input.durationMinutes,
  )
  const courtTotal = scale(input.courtPricePerHourCents, input.durationMinutes)
  const ids = Array.from({ length: input.students }, (_, i) => String(i))
  const courtCents = allocateToMembers(
    ids.map((memberId) => ({ memberId, amountCents: 0 })),
    courtTotal,
  ).map((s) => s.amountCents)
  const perStudentCents = courtCents.map((court) => instructorPerStudentCents + court)
  return {
    instructorPerStudentCents,
    courtCents,
    perStudentCents,
    totalCents: perStudentCents.reduce((sum, value) => sum + value, 0),
  }
}

/** Messages (shown to the user) for the rules a private class breaks. */
export function privateClassIssues(extras: ExtraRates, ages: readonly number[]) {
  const issues: string[] = []
  if (ages.length < 1 || ages.length > MAX_PRIVATE_STUDENTS)
    issues.push('Las clases particulares son para 1 o 2 alumnos')
  if (ages.some((age) => age < extras.privateMinAge)) {
    issues.push(`Las clases particulares son a partir de los ${extras.privateMinAge} años`)
  }
  return issues
}
