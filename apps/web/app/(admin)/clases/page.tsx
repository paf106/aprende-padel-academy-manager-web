import { localTodayInTimeZone } from '@aprende-padel/core'
import { generateSessions } from '../../../lib/demo-data'
import { ClassesView } from './classes-view'

export const metadata = { title: 'Clases | AprendePadel' }

export default function ClassesPage() {
  const today = localTodayInTimeZone('Europe/Madrid')
  return <ClassesView today={today} initialSessions={generateSessions(today)} />
}
