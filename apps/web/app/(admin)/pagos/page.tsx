import { localTodayInTimeZone } from '@aprende-padel/core'
import { buildCharges, buildSettlements, groupProfitability } from '../../../lib/demo-billing'
import { PaymentsView } from './payments-view'

export const metadata = { title: 'Pagos | AprendePadel' }

const tabs = ['cobros', 'profesores', 'tarifas', 'rentabilidad'] as const
type Tab = (typeof tabs)[number]

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams
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
      initialTab={(tabs as readonly string[]).includes(vista ?? '') ? (vista as Tab) : 'cobros'}
      charges={buildCharges(today)}
      settlements={buildSettlements(today)}
      profitability={profit}
    />
  )
}
