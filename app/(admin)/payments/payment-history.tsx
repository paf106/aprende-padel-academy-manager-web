'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/crud/confirm-dialog'
import { Button } from '@/components/ds/button'
import { Input, Label } from '@/components/ds/input'
import { useToast } from '@/components/ds/toast'
import { paymentMethodLabels } from '@/lib/core/labels'
import { formatMoney } from '@/lib/core/money'
import { activePayments } from '@/lib/data/billing'
import { useAppData } from '@/lib/data/provider'

const day = (date: string) => date.split('-').reverse().join('/')

/** Payments of an account in a month. They are never deleted: a wrong one is voided and stays in the list. */
export function PaymentHistory({ accountId, month }: { accountId: string; month: string }) {
  const toast = useToast()
  const { payments, actions } = useAppData()
  const [voiding, setVoiding] = useState<string[] | null>(null)
  const [reason, setReason] = useState('')

  const mine = payments.filter((p) => p.accountId === accountId && p.month === month && !p.reversesId)
  const active = new Set(activePayments(payments).map((p) => p.id))
  const voidOf = (id: string) => payments.find((p) => p.reversesId === id)
  if (mine.length === 0) return null

  const close = () => {
    setVoiding(null)
    setReason('')
  }
  const confirm = () => {
    if (!voiding) return
    for (const id of voiding) actions.voidPayment(id, reason)
    toast(voiding.length > 1 ? 'Pagos anulados. El mes vuelve a no pagado.' : 'Pago anulado.')
    close()
  }
  const activeIds = mine.filter((p) => active.has(p.id)).map((p) => p.id)

  return (
    <div className="mt-4 grid gap-2 border-t border-border pt-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold">Pagos de este mes</h4>
        {activeIds.length > 1 ? (
          <Button size="sm" variant="ghost" onClick={() => setVoiding(activeIds)}>
            Anular todos
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-1">
        {mine.map((payment) => {
          const voided = !active.has(payment.id)
          return (
            <li key={payment.id} className="flex items-center justify-between gap-3">
              <span className={voided ? 'text-muted-foreground line-through' : ''}>
                {day(payment.paidOn)} · {paymentMethodLabels[payment.method]} ·{' '}
                {formatMoney(payment.amountCents)}
                {payment.createdByEmail ? ` · ${payment.createdByEmail}` : ''}
              </span>
              {voided ? (
                <span className="text-xs text-muted-foreground">
                  Anulado
                  {voidOf(payment.id)?.createdByEmail ? ` por ${voidOf(payment.id)?.createdByEmail}` : ''}
                  {voidOf(payment.id)?.voidReason ? ` · ${voidOf(payment.id)?.voidReason}` : ''}
                </span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setVoiding([payment.id])}>
                  Anular
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <ConfirmDialog
        open={voiding !== null}
        title={voiding && voiding.length > 1 ? 'Anular todos los pagos del mes' : 'Anular pago'}
        description="El pago no se borra: queda en el historial como anulado y deja de contar. El mes vuelve a quedar pendiente de cobro."
        confirmLabel="Anular"
        onClose={close}
        onConfirm={confirm}
      >
        <div className="mt-4">
          <Label htmlFor="void-reason">Motivo (opcional)</Label>
          <Input
            id="void-reason"
            value={reason}
            placeholder="Por ejemplo, me equivoqué de cuenta"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
