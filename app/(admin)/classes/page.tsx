import { localTodayInTimeZone } from '@/lib/core/dates'
import { ClassesView } from '@/app/(admin)/classes/classes-view'

export const metadata = { title: 'Clases | AprendePadel' }

export default function ClassesPage() {
  const today = localTodayInTimeZone('Europe/Madrid')
  return <ClassesView today={today} />
}
