import { localTodayInTimeZone } from '@/lib/core/dates'
import { PaymentsView, type PaymentsTab } from '@/app/(admin)/payments/payments-view'

export const metadata = { title: 'Pagos | AprendePadel' }

const tabs = ['charges', 'teachers', 'rates', 'profitability'] as const

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  return (
    <PaymentsView
      today={localTodayInTimeZone('Europe/Madrid')}
      initialTab={(tabs as readonly string[]).includes(view ?? '') ? (view as PaymentsTab) : 'charges'}
    />
  )
}
