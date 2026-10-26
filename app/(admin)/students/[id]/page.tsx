import { localTodayInTimeZone } from '@/lib/core/dates'
import { buildCharges } from '@/lib/demo/billing'
import { studentById } from '@/lib/demo/data'
import { StudentProfile } from './student-profile'

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const today = localTodayInTimeZone('Europe/Madrid')
  const seed = studentById(id)
  const charge = seed ? (buildCharges(today).find((c) => c.account.id === seed.accountId) ?? null) : null
  return <StudentProfile id={id} today={today} charge={charge} />
}
