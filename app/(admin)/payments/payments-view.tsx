'use client'

import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PaymentStatusBadge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { ConfirmDialog } from '@/components/crud/confirm-dialog'
import { Card } from '@/components/ds/card'
import { Input, Label } from '@/components/ds/input'
import { DataTable } from '@/components/ds/data-table'
import { FilterBar, type FilterDef } from '@/components/ds/filter-bar'
import { PageContainer, PageToolbar } from '@/components/ds/page-header'
import { Tabs } from '@/components/ds/tabs'
import { useToast } from '@/components/ds/toast'
import { formatMoney } from '@/lib/core/money'
import { buildCharges, buildSettlements, chargesOfClub, groupProfitability } from '@/lib/data/billing'
import { useAppData } from '@/lib/data/provider'
import { ChargesTab } from './charges-tab'
import { MonthPicker, monthLabel } from './month-picker'
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
  const [settling, setSettling] = useState<{
    teacherId: string
    name: string
    amountCents: number
    sessions: number
    hours: number
  } | null>(null)
  const [paidOn, setPaidOn] = useState(today)
  const [undoing, setUndoing] = useState<string | null>(null)
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

  const clubFilter: FilterDef = {
    key: 'club',
    label: 'Sede',
    allLabel: 'Todas las sedes',
    options: demo.activeClubs.map((c) => ({ value: c.id, label: c.name })),
  }
  const clubBar = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterBar
        filters={[clubFilter]}
        values={{ club }}
        onChange={(_key, value) => chooseClub(value)}
        onClear={() => chooseClub('')}
      />
    </div>
  )

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

      {tab === 'charges' ? (
        <ChargesTab
          month={month}
          today={today}
          charges={charges}
          clubFilter={clubFilter}
          club={club}
          onClubChange={chooseClub}
        />
      ) : null}

      {tab === 'teachers' ? (
        <>
          {clubBar}
          <Card>
            <DataTable
              rows={settlements}
              rowKey={(s) => s.teacherId}
              columns={[
                {
                  key: 'name',
                  header: 'Profesor',
                  cell: (s) => <span className="font-medium">{s.name}</span>,
                },
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
                  cell: (s) => {
                    const record = demo.teacherSettlements.find(
                      (r) => r.teacherId === s.teacherId && r.month === month,
                    )
                    return (
                      <div className="grid gap-0.5">
                        <PaymentStatusBadge status={record ? 'paid' : 'pending'} />
                        {record ? (
                          <span className="text-xs text-muted-foreground">
                            Pagada el {record.paidOn.split('-').reverse().join('/')} ·{' '}
                            {formatMoney(record.amountCents)}
                            {record.createdByEmail ? ` · ${record.createdByEmail}` : ''}
                          </span>
                        ) : null}
                        {record && record.amountCents !== s.totalCents ? (
                          <span className="text-xs text-warning">
                            Se pagaron {formatMoney(record.amountCents)}; ahora son{' '}
                            {formatMoney(s.totalCents)}
                          </span>
                        ) : null}
                      </div>
                    )
                  },
                },
                {
                  key: 'actions',
                  header: '',
                  align: 'right',
                  cell: (s) => {
                    const record = demo.teacherSettlements.find(
                      (r) => r.teacherId === s.teacherId && r.month === month,
                    )
                    return record ? (
                      <Button size="sm" variant="ghost" onClick={() => setUndoing(record.id)}>
                        Deshacer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={s.totalCents <= 0}
                        onClick={() => {
                          setPaidOn(today)
                          setSettling({
                            teacherId: s.teacherId,
                            name: s.name,
                            amountCents: s.totalCents,
                            sessions: s.sessions,
                            hours: s.hours,
                          })
                        }}
                      >
                        Marcar pagada
                      </Button>
                    )
                  },
                },
              ]}
            />
          </Card>
        </>
      ) : null}

      {tab === 'rates' ? <RatesTab month={month} /> : null}

      {tab === 'profitability' ? (
        <>
          {clubBar}
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
        </>
      ) : null}
      <ConfirmDialog
        open={settling !== null}
        title="Marcar liquidación como pagada"
        description={
          settling
            ? `${settling.name} · ${monthLabel(month)} · ${formatMoney(settling.amountCents)} (${settling.sessions} clases, ${settling.hours} h).`
            : ''
        }
        confirmLabel="Marcar pagada"
        tone="primary"
        onClose={() => setSettling(null)}
        onConfirm={() => {
          if (!settling) return
          demo.actions.markSettlementPaid(settling.teacherId, month, paidOn, {
            amountCents: settling.amountCents,
            sessions: settling.sessions,
            hours: settling.hours,
          })
          toast(`Liquidación de ${settling.name} marcada como pagada.`)
          setSettling(null)
        }}
      >
        <div className="mt-4">
          <Label htmlFor="settlement-date">Fecha de pago</Label>
          <Input
            id="settlement-date"
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </div>
      </ConfirmDialog>
      <ConfirmDialog
        open={undoing !== null}
        title="Deshacer la liquidación"
        description="La liquidación volverá a estar pendiente de pago."
        confirmLabel="Deshacer"
        onClose={() => setUndoing(null)}
        onConfirm={() => {
          if (!undoing) return
          demo.actions.undoSettlement(undoing)
          toast('Liquidación pendiente otra vez.')
          setUndoing(null)
        }}
      />
    </PageContainer>
  )
}
