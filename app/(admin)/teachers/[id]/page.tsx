import { localTodayInTimeZone } from '@/lib/core/dates'
import { TeacherProfile } from './teacher-profile'

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TeacherProfile id={id} today={localTodayInTimeZone('Europe/Madrid')} />
}
