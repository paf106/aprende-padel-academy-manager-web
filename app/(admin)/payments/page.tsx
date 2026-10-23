import { localTodayInTimeZone } from '@/lib/core/dates'
import { buildCharges, buildSettlements, groupProfitability } from '@/lib/demo/billing'
import { PaymentsView } from '@/app/(admin)/payments/payments-view'

export const metadata = { title: 'Pagos | AprendePadel' }

const tabs = ['charges', 'teachers', 'rates', 'profitability'] as const
type Tab = (typeof tabs)[number]

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams
  const today = localTodayInTimeZone('Europe/Madrid')
  const profit = groupProfitability(today).map(({ group, incomeCents, costCents, marginCents }) => ({
    id: group.id,
    name: group.name,
    clubId: group.clubId,
    incomeCents,
    costCents,
    marginCents,
  }))
  return (
    <PaymentsView
      month={today.slice(0, 7)}
      initialTab={(tabs as readonly string[]).includes(view ?? '') ? (view as Tab) : 'charges'}
      charges={buildCharges(today)}
      settlements={buildSettlements(today)}
      profitability={profit}
    />
  )
}
