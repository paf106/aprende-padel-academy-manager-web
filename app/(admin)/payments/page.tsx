import { localTodayInTimeZone } from '@/lib/core/dates'
import { PaymentsView, type PaymentsTab } from '@/app/(admin)/payments/payments-view'

export const metadata = { title: 'Pagos | AprendePadel' }

const tabs = ['charges', 'teachers', 'rates', 'profitability'] as const

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>
}) {
  const { view, month } = await searchParams
  const today = localTodayInTimeZone('Europe/Madrid')
  return (
    <PaymentsView
      today={today}
      initialMonth={/^d{4}-(0[1-9]|1[0-2])$/.test(month ?? '') ? month! : today.slice(0, 7)}
      initialTab={(tabs as readonly string[]).includes(view ?? '') ? (view as PaymentsTab) : 'charges'}
    />
  )
}
