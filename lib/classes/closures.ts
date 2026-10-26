export type Closure = { id: number; clubId: string; from: string; to: string; reason: string }

const MAX_DAYS = 400

/** Every closed date for a club. A closure without clubId applies to all clubs. */
export function expandClosedDays(closures: readonly Closure[], clubId: string) {
  const days: string[] = []
  for (const closure of closures) {
    if (closure.clubId && closure.clubId !== clubId) continue
    const cursor = new Date(`${closure.from}T00:00:00Z`)
    const end = new Date(`${closure.to}T00:00:00Z`)
    for (let i = 0; cursor <= end && i < MAX_DAYS; i++) {
      days.push(cursor.toISOString().slice(0, 10))
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }
  return days
}
