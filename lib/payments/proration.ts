function assertCents(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer`)
}

export function prorateFee(feeCents: number, scheduledSessions: number, cancelledSessions: number) {
  assertCents(feeCents, 'La cuota')
  assertCents(scheduledSessions, 'Las sesiones programadas')
  assertCents(cancelledSessions, 'Las sesiones canceladas')
  if (cancelledSessions > scheduledSessions) throw new Error('Cancelled sessions exceed scheduled sessions')
  if (scheduledSessions === 0) return 0
  return Math.round((feeCents * (scheduledSessions - cancelledSessions)) / scheduledSessions)
}
