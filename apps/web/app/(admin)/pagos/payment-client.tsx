'use client'

import { useState, useTransition } from 'react'
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
  const [state, setState] = useState<ActionResult | null>(null)
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const showToast = useToast()
  const submit = (data: FormData) =>
    start(async () => {
      const result = await generatePayments(null, data)
      setState(result)
      if (result.ok) {
        showToast(result.message)
        setOpen(false)
      }
    })
  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setState(null)
          setOpen(true)
        }}
      >
        Generar cobros del mes
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title={`Generar cobros · ${displayPeriod(period)}`}
        description="Se recalcularán los cobros pendientes y las liquidaciones de las clases terminadas. Los pagos registrados se conservan."
      >
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <input type="hidden" name="period" value={`${period}-01`} />
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Generando…' : 'Confirmar generación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}

export function ClosePeriod({ period }: { period: string }) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const showToast = useToast()
  const submit = (data: FormData) =>
    start(async () => {
      const result = await closeBillingPeriod(null, data)
      setState(result)
      if (result.ok) {
        showToast(result.message)
        setOpen(false)
      }
    })
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setState(null)
          setOpen(true)
        }}
      >
        Cerrar el mes
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title={`Cerrar periodo · ${displayPeriod(period)}`}
        description="No se podrán recalcular cobros, modificar importes ni registrar pagos después del cierre."
      >
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <input type="hidden" name="period" value={`${period}-01`} />
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? 'Cerrando…' : 'Confirmar cierre'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
