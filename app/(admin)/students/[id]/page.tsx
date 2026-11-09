import { localTodayInTimeZone } from '@/lib/core/dates'
import { StudentProfile } from './student-profile'

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentProfile id={id} today={localTodayInTimeZone('Europe/Madrid')} />
}
