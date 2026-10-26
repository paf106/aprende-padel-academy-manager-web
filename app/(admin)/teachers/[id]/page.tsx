import { localTodayInTimeZone } from '@/lib/core/dates'
import { buildSettlements } from '@/lib/demo/billing'
import { TeacherProfile } from './teacher-profile'

export default async function TeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const settlement =
    buildSettlements(localTodayInTimeZone('Europe/Madrid')).find((s) => s.teacherId === id) ?? null
  return <TeacherProfile id={id} settlement={settlement} />
}
