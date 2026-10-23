'use client'

import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { accountStatement } from '@/lib/payments/account-billing'
import { defaultTeacherRates, type TeacherRates } from '@/lib/payments/teacher-pay'
import { formatMoney } from '@/lib/core/money'
import { PaymentStatusBadge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid, Card, Stat } from '@/components/ds/card'
import { DataTable, type Column } from '@/components/ds/data-table'
import { Drawer } from '@/components/ds/drawer'
import { Dropdown, FilterChips } from '@/components/ds/dropdown'
import { Input, Label, SearchInput } from '@/components/ds/input'
import { PageContainer, PageHeader } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import type { Charge, TeacherSettlementRow } from '@/lib/demo/billing'
import { clubById, feePlans as initialPlans } from '@/lib/demo/data'

type Tab = 'charges' | 'teachers' | 'rates' | 'profitability'
type Profit = {
  id: string
  name: string
  clubId: string
  incomeCents: number
  costCents: number
  marginCents: number
}
type Method = 'cash' | 'transfer' | 'bizum'
const methodLabel: Record<Method, string> = { cash: 'Efectivo', transfer: 'Transferencia', bizum: 'Bizum' }
const methodOptions = (Object.keys(methodLabel) as Method[]).map((value) => ({
  value,
  label: methodLabel[value],
}))

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
const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

export function PaymentsView({
  month,
  initialTab,
  charges: initialCharges,
  settlements,
  profitability,
}: {
  month: string
  initialTab: Tab
  charges: Charge[]
  settlements: TeacherSettlementRow[]
  profitability: Profit[]
}) {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [charges, setCharges] = useState(initialCharges)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [payFor, setPayFor] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Method>('bizum')
  const [paidOn, setPaidOn] = useState(`${month}-15`)
  const [plans, setPlans] = useState(initialPlans)
  const [rates, setRates] = useState<TeacherRates>(defaultTeacherRates)
  const [paidTeachers, setPaidTeachers] = useState<string[]>([])

  const rows = useMemo(
    () =>
      charges.filter(
        (c) => c.account.name.toLowerCase().includes(query.toLowerCase()) && (!status || c.status === status),
      ),
    [charges, query, status],
  )
  const totals = {
    due: charges.reduce((s, c) => s + c.dueCents, 0),
    paid: charges.reduce((s, c) => s + c.paidCents, 0),
    debt: charges.reduce((s, c) => s + c.debtCents, 0),
  }
  const payTarget = charges.find((c) => c.account.id === payFor)

  const registerPayment = () => {
    const cents = Math.round(Number(amount.replace(',', '.')) * 100)
    if (!payTarget || !Number.isFinite(cents) || cents <= 0) {
      toast('Introduce un importe válido.', 'error')
      return
    }
    const statement = accountStatement({
      members: payTarget.members.map((m) => ({ memberId: m.studentId, amountCents: m.proratedCents })),
      paymentsCents: [payTarget.paidCents + cents],
    })
    setCharges((list) =>
      list.map((c) =>
        c.account.id === payTarget.account.id
          ? {
              ...c,
              ...statement,
              lastPayment: { date: paidOn, method },
              debtCents: Math.max(0, c.debtCents - cents),
            }
          : c,
      ),
    )
    setPayFor(null)
    setAmount('')
    toast(
      statement.surplusCents > 0
        ? `Pago registrado. ${formatMoney(statement.surplusCents)} quedan como saldo a favor para el mes siguiente.`
        : 'Pago registrado.',
    )
  }

  const chargeColumns: Column<Charge>[] = [
    {
      key: 'account',
      header: 'Cuenta',
      cell: (c) => (
        <button
          type="button"
          aria-expanded={open === c.account.id}
          onClick={() => setOpen(open === c.account.id ? null : c.account.id)}
          className="flex cursor-pointer items-center gap-2 font-medium"
        >
          {open === c.account.id ? (
            <ChevronDown size={14} aria-hidden="true" />
          ) : (
            <ChevronRight size={14} aria-hidden="true" />
          )}
          {c.account.name}
          <span className="text-xs font-normal text-muted-foreground">
            {c.members.length > 1 ? `${c.members.length} miembros` : ''}
          </span>
        </button>
      ),
    },
    { key: 'due', header: 'A cobrar', align: 'right', cell: (c) => formatMoney(c.dueCents) },
    { key: 'paid', header: 'Pagado', align: 'right', cell: (c) => formatMoney(c.paidCents) },
    {
      key: 'debt',
      header: 'Deuda total',
      align: 'right',
      cell: (c) =>
        c.debtCents > 0 ? (
          <span className={c.monthsOverdue > 0 ? 'font-semibold text-danger' : ''}>
            {formatMoney(c.debtCents)}
            {c.monthsOverdue > 0 ? ` · ${c.monthsOverdue} m.` : ''}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'status', header: 'Estado', cell: (c) => <PaymentStatusBadge status={c.status} /> },
    {
      key: 'method',
      header: 'Último pago',
      cell: (c) =>
        c.lastPayment
          ? `${c.lastPayment.date.split('-').reverse().join('/')} · ${methodLabel[c.lastPayment.method]}`
          : '—',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (c) =>
        c.balanceCents > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setPayFor(c.account.id)
              setAmount((c.balanceCents / 100).toFixed(2))
            }}
          >
            Registrar pago
          </Button>
        ) : null,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Pagos"
        description={`Cobros y liquidaciones de ${new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01`))}`}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              if (tab === 'teachers')
                downloadCsv(`liquidaciones-${month}.csv`, [
                  ['Profesor', 'Clases', 'Horas', 'Total'],
                  ...settlements.map((s) => [s.name, s.sessions, s.hours, euros(s.totalCents)]),
                ])
              else
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
            }}
          >
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </Button>
        }
      />
      <FilterChips
        label="Sección"
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={[
          { value: 'charges', label: 'Cobros del mes' },
          { value: 'teachers', label: 'Liquidaciones' },
          { value: 'rates', label: 'Tarifas' },
          { value: 'profitability', label: 'Rentabilidad' },
        ]}
      />

      {tab === 'charges' ? (
        <>
          <BentoGrid>
            <BentoCard span="md">
              <Stat value={formatMoney(totals.due)} label="A cobrar este mes" />
            </BentoCard>
            <BentoCard span="md">
              <Stat
                value={formatMoney(totals.paid)}
                label="Cobrado"
                hint={`${Math.round((totals.paid / Math.max(totals.due, 1)) * 100)}% del total`}
              />
            </BentoCard>
            <BentoCard span="md">
              <Stat
                value={formatMoney(totals.debt)}
                label="Deuda acumulada"
                hint="Incluye meses anteriores"
              />
            </BentoCard>
          </BentoGrid>
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              aria-label="Buscar cuenta"
              placeholder="Buscar cuenta…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            <FilterChips
              label="Estado"
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'Todos' },
                { value: 'pending', label: 'No pagado' },
                { value: 'partial', label: 'Parcial' },
                { value: 'paid', label: 'Pagado' },
              ]}
            />
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    {chargeColumns.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        className={`px-4 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}
                      >
                        {c.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((charge) => (
                    <Fragment key={charge.account.id}>
                      <tr className="border-b border-border/60">
                        {chargeColumns.map((c) => (
                          <td
                            key={c.key}
                            className={`px-4 py-3 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}
                          >
                            {c.cell(charge)}
                          </td>
                        ))}
                      </tr>
                      {open === charge.account.id ? (
                        <tr className="bg-muted/40">
                          <td colSpan={chargeColumns.length} className="px-10 py-3">
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              Desglose por miembro
                            </p>
                            <ul className="grid gap-1.5 text-sm">
                              {charge.members.map((m) => (
                                <li key={m.studentId} className="flex justify-between gap-4">
                                  <span>{m.name}</span>
                                  <span className="tabular-nums text-muted-foreground">
                                    {formatMoney(m.baseCents)} · {m.scheduled - m.cancelled}/{m.scheduled}{' '}
                                    clases →{' '}
                                    <span className="font-semibold text-foreground">
                                      {formatMoney(m.proratedCents)}
                                    </span>
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

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

      {tab === 'rates' ? (
        <BentoGrid>
          <BentoCard span="lg" title="Cuotas mensuales de alumnos">
            <ul className="grid gap-3">
              {plans.map((plan) => (
                <li key={plan.id} className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{plan.name}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Importe de ${plan.name}`}
                      inputMode="decimal"
                      className="w-24 text-right"
                      value={euros(plan.monthlyCents)}
                      onChange={(e) => {
                        const cents = Math.round(Number(e.target.value.replace(',', '.')) * 100)
                        if (Number.isFinite(cents))
                          setPlans((list) =>
                            list.map((p) => (p.id === plan.id ? { ...p, monthlyCents: cents } : p)),
                          )
                      }}
                    />
                    <span className="text-sm text-muted-foreground">€/mes</span>
                  </div>
                </li>
              ))}
            </ul>
            <Button className="mt-2 self-start" onClick={() => toast('Tarifas guardadas.')}>
              Guardar tarifas
            </Button>
          </BentoCard>
          <BentoCard span="lg" title="Pago a profesores (€/hora)">
            <div className="grid gap-4">
              {(['adult', 'child'] as const).map((category) => (
                <fieldset key={category} className="grid grid-cols-3 gap-3">
                  <legend className="mb-2 text-sm font-medium">
                    {category === 'adult' ? 'Adultos' : 'Niños'}
                  </legend>
                  <div>
                    <Label>Umbral alumnos</Label>
                    <Input
                      type="number"
                      min={1}
                      value={rates[category].threshold}
                      onChange={(e) =>
                        setRates((r) => ({
                          ...r,
                          [category]: { ...r[category], threshold: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Menos del umbral</Label>
                    <Input
                      inputMode="decimal"
                      value={euros(rates[category].belowCents)}
                      onChange={(e) =>
                        setRates((r) => ({
                          ...r,
                          [category]: {
                            ...r[category],
                            belowCents: Math.round(Number(e.target.value.replace(',', '.')) * 100) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Desde el umbral</Label>
                    <Input
                      inputMode="decimal"
                      value={euros(rates[category].atOrAboveCents)}
                      onChange={(e) =>
                        setRates((r) => ({
                          ...r,
                          [category]: {
                            ...r[category],
                            atOrAboveCents: Math.round(Number(e.target.value.replace(',', '.')) * 100) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                </fieldset>
              ))}
            </div>
            <Button className="mt-2 self-start" onClick={() => toast('Reglas de pago guardadas.')}>
              Guardar reglas
            </Button>
          </BentoCard>
        </BentoGrid>
      ) : null}

      {tab === 'profitability' ? (
        <Card>
          <DataTable
            rows={profitability}
            rowKey={(p) => p.id}
            columns={[
              { key: 'group', header: 'Grupo', cell: (p) => <span className="font-medium">{p.name}</span> },
              { key: 'club', header: 'Sede', cell: (p) => clubById(p.clubId)?.name },
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

      <Drawer
        open={payTarget !== undefined && payFor !== null}
        onClose={() => setPayFor(null)}
        title="Registrar pago"
        description={
          payTarget
            ? `${payTarget.account.name} · pendiente ${formatMoney(payTarget.balanceCents)}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayFor(null)}>
              Cancelar
            </Button>
            <Button onClick={registerPayment}>Guardar pago</Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div>
            <Label htmlFor="pay-amount">Importe (€)</Label>
            <Input
              id="pay-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Método</Label>
            <Dropdown
              aria-label="Método de pago"
              value={method}
              onChange={(v) => setMethod(v as Method)}
              options={methodOptions}
            />
          </div>
          <div>
            <Label htmlFor="pay-date">Fecha</Label>
            <Input id="pay-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            Los pagos son un registro inmutable: no se pueden editar ni borrar. Si te pasas, el excedente
            queda como saldo a favor.
          </p>
        </div>
      </Drawer>
    </PageContainer>
  )
}
