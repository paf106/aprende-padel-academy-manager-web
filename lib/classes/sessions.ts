export type TimeSlot = { date: string; start: string; duration: number }

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function slotsOverlap(a: TimeSlot, b: TimeSlot) {
  if (a.date !== b.date) return false
  const aStart = toMinutes(a.start)
  const bStart = toMinutes(b.start)
  return aStart < bStart + b.duration && bStart < aStart + a.duration
}
