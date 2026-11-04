import { localTodayInTimeZone } from '@/lib/core/dates'
import { DashboardView } from '@/app/(admin)/dashboard-view'

export default function DashboardPage() {
  return <DashboardView today={localTodayInTimeZone('Europe/Madrid')} />
}
