import { localTodayInTimeZone } from '@/lib/core/dates'
import { buildSettlements } from '@/lib/demo/billing'
import { TeachersView } from './teachers-view'

export const metadata = { title: 'Profesores | AprendePadel' }

export default function TeachersPage() {
  const settlements = buildSettlements(localTodayInTimeZone('Europe/Madrid'))
  return <TeachersView settlements={settlements} />
}
