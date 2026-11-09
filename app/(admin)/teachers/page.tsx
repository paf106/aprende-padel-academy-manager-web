import { localTodayInTimeZone } from '@/lib/core/dates'
import { TeachersView } from './teachers-view'

export const metadata = { title: 'Profesores | AprendePadel' }

export default function TeachersPage() {
  return <TeachersView today={localTodayInTimeZone('Europe/Madrid')} />
}
