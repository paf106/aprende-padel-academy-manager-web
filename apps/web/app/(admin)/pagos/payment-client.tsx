'use client'
import { useActionState } from 'react'
import { closeBillingPeriod, generatePayments } from './actions'
import { Button } from '../../../components/ui/button'
import { FormMessage } from '../../../components/ui/form-message'
import type { ActionResult } from '../clases/actions'

export function GeneratePayments({ period }: { period: string }) {
  const [state, action, pending] = useActionState(generatePayments, null as ActionResult | null)
  return <form action={action} className="flex flex-wrap items-center gap-2"><input type="hidden" name="period" value={`${period}-01`}/><Button type="submit" disabled={pending}>{pending ? 'Generando…' : 'Generar cobros del mes'}</Button>{state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}</form>
}
export function ClosePeriod({ period }: { period: string }) {
  const [state, action, pending] = useActionState(closeBillingPeriod, null as ActionResult | null)
  return <form action={action} className="flex flex-wrap items-center gap-2" onSubmit={(event) => { if (!window.confirm(`¿Cerrar el periodo ${period}? Después no se podrán recalcular cobros ni registrar pagos.`)) event.preventDefault() }}><input type="hidden" name="period" value={`${period}-01`}/><Button type="submit" variant="secondary" disabled={pending}>{pending ? 'Cerrando…' : 'Cerrar el mes'}</Button>{state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}</form>
}
