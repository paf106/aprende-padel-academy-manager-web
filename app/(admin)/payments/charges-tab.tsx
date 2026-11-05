'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { PaymentStatusBadge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid, Card, Stat } from '@/components/ds/card'
import { Drawer } from '@/components/ds/drawer'
import { Dropdown } from '@/components/ds/dropdown'
import { FilterBar, type FilterDef } from '@/components/ds/filter-bar'
import { Input, Label } from '@/components/ds/input'
import { useToast } from '@/components/ds/toast'
import { ChargeBreakdown } from './charge-breakdown'
import { monthLabel } from './month-picker'
import { OverrideFormDrawer } from './rates/overrides-section'
import { paymentMethodLabels } from '@/lib/core/labels'
import { formatMoney } from '@/lib/core/money'
import type { PaymentMethod } from '@/lib/core/types'
import type { Charge } from '@/lib/data/billing'
import { useAppData } from '@/lib/data/provider'

const statusFilters: FilterDef[] = [
  {
    key: 'status',
    label: 'Estado',
    allLabel: 'Todos los estados',
    options: [
      { value: 'pending', label: 'No pagado' },
      { value: 'partial', label: 'Parcial' },
      { value: 'paid', label: 'Pagado' },
    ],
  },
]

const COLUMNS = ['Cuenta', 'A cobrar', 'Pagado', 'Deuda total', 'Estado', 'Último pago', '']

export function ChargesTab({ month, today, charges }: { month: string; today: string; charges: Charge[] }) {
  const toast = useToast()
  const { billing, catalog, actions } = useAppData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [payFor, setPayFor] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>(billing.allowedPaymentMethods[0] ?? 'cash')
  const [paidOn, setPaidOn] = useState(today)
  const [fixPriceFor, setFixPriceFor] = useState<string | null>(null)

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
    const surplus = Math.max(0, payTarget.paidCents + cents - payTarget.dueCents)
    actions.addPayment({ accountId: payTarget.account.id, month, amountCents: cents, method, paidOn })
    setPayFor(null)
    setAmount('')
    toast(
      surplus > 0
        ? `Pago registrado. ${formatMoney(surplus)} quedan como saldo a favor para el mes siguiente.`
        : `Pago de ${monthLabel(month)} registrado.`,
    )
  }

  return (
    <>
      <BentoGrid>
        <BentoCard span="md">
          <Stat value={formatMoney(totals.due)} label={`A cobrar en ${monthLabel(month)}`} />
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
            hint="Hasta este mes, con los anteriores"
          />
        </BentoCard>
      </BentoGrid>
      <div className="flex flex-wrap items-center gap-2">
        <FilterBar
          search={{ value: query, onChange: setQuery, placeholder: 'Buscar cuenta…', label: 'Buscar cuenta' }}
          filters={statusFilters}
          values={{ status }}
          onChange={(_key, value) => setStatus(value)}
          onClear={() => {
            setQuery('')
            setStatus('')
          }}
        />
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {COLUMNS.map((name, index) => (
                  <th
                    key={name || 'actions'}
                    scope="col"
                    className={`px-4 py-3 font-medium ${index === 1 || index === 2 || index === 3 || index === 6 ? 'text-right' : ''}`}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((charge) => {
                const expanded = open === charge.account.id
                return (
                  <Fragment key={charge.account.id}>
                    <tr className="border-b border-border/60">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setOpen(expanded ? null : charge.account.id)}
                          className="flex cursor-pointer items-center gap-2 font-medium"
                        >
                          {expanded ? (
                            <ChevronDown size={14} aria-hidden="true" />
                          ) : (
                            <ChevronRight size={14} aria-hidden="true" />
                          )}
                          {charge.account.name}
                          <span className="text-xs font-normal text-muted-foreground">
                            {charge.members.length > 1 ? `${charge.members.length} miembros` : ''}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(charge.dueCents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(charge.paidCents)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {charge.debtCents > 0 ? (
                          <span className={charge.monthsOverdue > 0 ? 'font-semibold text-danger' : ''}>
                            {formatMoney(charge.debtCents)}
                            {charge.monthsOverdue > 0 ? ` · ${charge.monthsOverdue} m.` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentStatusBadge status={charge.status} />
                      </td>
                      <td className="px-4 py-3">
                        {charge.lastPayment
                          ? `${charge.lastPayment.paidOn.split('-').reverse().join('/')} · ${paymentMethodLabels[charge.lastPayment.method]}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setFixPriceFor(charge.account.id)}>
                          Fijar precio
                        </Button>
                        {charge.balanceCents > 0 ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setPayFor(charge.account.id)
                              setAmount((charge.balanceCents / 100).toFixed(2))
                              setMethod(billing.allowedPaymentMethods[0] ?? 'cash')
                            }}
                          >
                            Registrar pago
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="bg-muted/40">
                        <td colSpan={COLUMNS.length} className="px-10 py-4">
                          <ChargeBreakdown
                            data={{
                              offers: charge.offers,
                              overrides: charge.overrides,
                              warnings: charge.warnings,
                              lines: charge.members,
                              extraCharges: charge.extraCharges,
                            }}
                            catalog={catalog}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {fixPriceFor ? (
        <OverrideFormDrawer
          initial={{ scope: 'account', targetId: fixPriceFor }}
          month={month}
          onClose={() => setFixPriceFor(null)}
        />
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
              onChange={(v) => setMethod(v as PaymentMethod)}
              options={billing.allowedPaymentMethods.map((value) => ({
                value,
                label: paymentMethodLabels[value],
              }))}
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
    </>
  )
}
