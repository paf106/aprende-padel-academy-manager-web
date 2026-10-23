import type { StudentCategory } from '@/lib/core/types'

export const defaultCapacity: Record<StudentCategory, number> = { adult: 4, child: 6 }

export function hasFreeSpot(
  category: StudentCategory,
  occupied: number,
  capacity: Record<StudentCategory, number> = defaultCapacity,
) {
  return occupied < capacity[category]
}

export function freeSpots(
  category: StudentCategory,
  occupied: number,
  capacity: Record<StudentCategory, number> = defaultCapacity,
) {
  return Math.max(0, capacity[category] - occupied)
}
