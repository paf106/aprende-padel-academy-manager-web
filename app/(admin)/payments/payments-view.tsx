'use client'

import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PaymentStatusBadge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { Card } from '@/components/ds/card'
import { DataTable } from '@/components/ds/data-table'
import { Dropdown } from '@/components/ds/dropdown'
import { PageContainer, PageToolbar } from '@/components/ds/page-header'
import { Tabs } from '@/components/ds/tabs'
import { useToast } from '@/components/ds/toast'
import { formatMoney } from '@/lib/core/money'
import { buildCharges, buildSettlements, chargesOfClub, groupProfitability } from '@/lib/data/billing'
import { useAppData } from '@/lib/data/provider'
import { ChargesTab } from './charges-tab'
import { MonthPicker } from './month-picker'
import { RatesTab } from './rates-tab'

export type PaymentsTab = 'charges' | 'teachers' | 'rates' | 'profitability'

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
    .join('\n')
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function PaymentsView({
  today,
  initialMonth,
  initialClub,
  initialTab,
}: {
  today: string
  initialMonth: string
  initialClub: string
  initialTab: PaymentsTab
}) {
  const toast = useToast()
  const demo = useAppData()
  const [tab, setTab] = useState<PaymentsTab>(initialTab)
  const [paidTeachers, setPaidTeachers] = useState<string[]>([])
  const [month, setMonth] = useState(initialMonth)
  const [clubChoice, setClubChoice] = useState(initialClub)
  const club = demo.activeClubs.some((c) => c.id === clubChoice) ? clubChoice : ''
  // The billing functions read the month from a date, so the first day of the chosen month stands for it.
  const monthStart = `${month}-01`

  const allCharges = useMemo(() => buildCharges(demo, monthStart), [demo, monthStart])
  const charges = useMemo(() => chargesOfClub(demo, allCharges, club), [demo, allCharges, club])
  const settlements = useMemo(() => buildSettlements(demo, monthStart, club), [demo, monthStart, club])
  const profitability = useMemo(
    () => groupProfitability(demo, monthStart, allCharges, club),
    [demo, monthStart, allCharges, club],
  )

  const rememberInUrl = (key: string, value: string) => {
    const url = new URL(window.location.href)
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
    window.history.replaceState(null, '', url)
  }
  const chooseMonth = (next: string) => {
    setMonth(next)
    rememberInUrl('month', next)
  }
  const chooseClub = (next: string) => {
    setClubChoice(next)
    rememberInUrl('club', next)
  }

  const exportCsv = () => {
    if (tab === 'teachers') {
      downloadCsv(`liquidaciones-${month}.csv`, [
        ['Profesor', 'Clases', 'Horas', 'Total'],
        ...settlements.map((s) => [s.name, s.sessions, s.hours, euros(s.totalCents)]),
      ])
    } else {
      downloadCsv(`cobros-${month}.csv`, [
        ['Cuenta', 'A cobrar', 'Pagado', 'Pendiente', 'Estado'],
        ...charges.map((c) => [
          c.account.name,
          euros(c.dueCents),
          euros(c.paidCents),
          euros(c.balanceCents),
          c.status,
        ]),
      ])
    }
  }

  return (
    <PageContainer>
      <PageToolbar
        title="Pagos"
        actions={
          <>
            <MonthPicker month={month} currentMonth={today.slice(0, 7)} onChange={chooseMonth} />
            <Dropdown
              aria-label="Sede"
              className="w-44"
              allLabel="Todas las sedes"
              value={club}
              onChange={chooseClub}
              options={demo.activeClubs.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Button variant="secondary" onClick={exportCsv}>
              <Download size={16} aria-hidden="true" />
              Exportar CSV
            </Button>
          </>
        }
      >
        <Tabs
          label="Sección"
          value={tab}
          onChange={(v) => setTab(v as PaymentsTab)}
          tabs={[
            { value: 'charges', label: 'Cobros' },
            { value: 'teachers', label: 'Liquidaciones' },
            { value: 'rates', label: 'Tarifas' },
            { value: 'profitability', label: 'Rentabilidad' },
          ]}
        />
      </PageToolbar>

      {tab === 'charges' ? <ChargesTab month={month} today={today} charges={charges} /> : null}

      {tab === 'teachers' ? (
        <Card>
          <DataTable
            rows={settlements}
            rowKey={(s) => s.teacherId}
            columns={[
              { key: 'name', header: 'Profesor', cell: (s) => <span className="font-medium">{s.name}</span> },
              { key: 'sessions', header: 'Clases terminadas', align: 'right', cell: (s) => s.sessions },
              { key: 'hours', header: 'Horas', align: 'right', cell: (s) => s.hours },
              {
                key: 'total',
                header: 'Total',
                align: 'right',
                cell: (s) => <span className="font-semibold">{formatMoney(s.totalCents)}</span>,
              },
              {
                key: 'status',
                header: 'Estado',
                cell: (s) => (
                  <PaymentStatusBadge status={paidTeachers.includes(s.teacherId) ? 'paid' : 'pending'} />
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                cell: (s) =>
                  paidTeachers.includes(s.teacherId) ? null : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPaidTeachers((p) => [...p, s.teacherId])
                        toast(`Liquidación de ${s.name} marcada como pagada.`)
                      }}
                    >
                      Marcar pagada
                    </Button>
                  ),
              },
            ]}
          />
        </Card>
      ) : null}

      {tab === 'rates' ? <RatesTab month={month} /> : null}

      {tab === 'profitability' ? (
        <Card>
          <DataTable
            rows={profitability}
            rowKey={(p) => p.group.id}
            columns={[
              {
                key: 'group',
                header: 'Grupo',
                cell: (p) => <span className="font-medium">{p.group.name}</span>,
              },
              { key: 'club', header: 'Sede', cell: (p) => demo.clubLabel(p.group.clubId) },
              { key: 'income', header: 'Cobrado', align: 'right', cell: (p) => formatMoney(p.incomeCents) },
              { key: 'cost', header: 'Profesor', align: 'right', cell: (p) => formatMoney(p.costCents) },
              {
                key: 'margin',
                header: 'Margen',
                align: 'right',
                cell: (p) => (
                  <span className={p.marginCents < 0 ? 'font-semibold text-danger' : 'font-semibold'}>
                    {formatMoney(p.marginCents)}
                  </span>
                ),
              },
            ]}
          />
          <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Margen aproximado: cobrado menos pago al profesor. El alquiler de pista no se incluye.
          </p>
        </Card>
      ) : null}
    </PageContainer>
  )
}
