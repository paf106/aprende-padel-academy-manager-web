function assertCents(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} debe ser un entero no negativo`)
}

export function prorateFee(feeCents: number, scheduledSessions: number, cancelledSessions: number) {
  assertCents(feeCents, 'La cuota')
  assertCents(scheduledSessions, 'Las sesiones programadas')
  assertCents(cancelledSessions, 'Las sesiones canceladas')
  if (cancelledSessions > scheduledSessions) throw new Error('Hay más sesiones canceladas que programadas')
  if (scheduledSessions === 0) return 0
  return Math.round((feeCents * (scheduledSessions - cancelledSessions)) / scheduledSessions)
}
