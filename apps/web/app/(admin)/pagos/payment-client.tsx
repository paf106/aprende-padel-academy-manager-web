'use client'

import { useActionState, useEffect, useState } from 'react'
import { closeBillingPeriod, generatePayments } from './actions'
import { Button } from '../../../components/ui/button'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { FormMessage } from '../../../components/ui/form-message'
import { useToast } from '../../../components/ui/toast'
import type { ActionResult } from '../../lib/action-result'

function displayPeriod(period: string) {
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  }).format(new Date(`${period}-01T12:00:00Z`))
}

export function GeneratePayments({ period }: { period: string }) {
  const [state, action, pending] = useActionState(generatePayments, null as ActionResult | null)
  const [open, setOpen] = useState(false)
  const showToast = useToast()
  useEffect(() => {
    if (state?.ok) showToast(state.message)
  }, [state, showToast])
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Generar cobros del mes
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title={`Generar cobros · ${displayPeriod(period)}`}
        description="Se recalcularán los cobros pendientes y las liquidaciones de las clases terminadas. Los pagos registrados se conservan."
      >
        <form action={action} className="space-y-4 px-5 py-5 sm:px-6">
          <input type="hidden" name="period" value={`${period}-01`} />
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button type="submit" disabled={pending || Boolean(state?.ok)}>
              {pending ? 'Generando…' : state?.ok ? 'Generado' : 'Confirmar generación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}

export function ClosePeriod({ period }: { period: string }) {
  const [state, action, pending] = useActionState(closeBillingPeriod, null as ActionResult | null)
  const [open, setOpen] = useState(false)
  const showToast = useToast()
  useEffect(() => {
    if (state?.ok) showToast(state.message)
  }, [state, showToast])
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Cerrar el mes
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title={`Cerrar periodo · ${displayPeriod(period)}`}
        description="No se podrán recalcular cobros, modificar importes ni registrar pagos después del cierre."
      >
        <form action={action} className="space-y-4 px-5 py-5 sm:px-6">
          <input type="hidden" name="period" value={`${period}-01`} />
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || Boolean(state?.ok)}>
              {pending ? 'Cerrando…' : state?.ok ? 'Mes cerrado' : 'Confirmar cierre'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
