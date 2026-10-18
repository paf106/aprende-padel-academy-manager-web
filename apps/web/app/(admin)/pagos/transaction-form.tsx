'use client'

import { useActionState } from 'react'
import {
  adjustStudentCharge,
  adjustTeacherSettlement,
  recordStudentPayment,
  recordTeacherPayment,
} from './actions'
import { Button } from '../../../components/ui/button'
import { Field } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { FormMessage } from '../../../components/ui/form-message'
import type { ActionResult } from '../../lib/action-result'

function PaymentForm({ id, balance, teacher }: { id: string; balance: number; teacher: boolean }) {
  const actionFn = teacher ? recordTeacherPayment : recordStudentPayment
  const [state, action, pending] = useActionState(actionFn, null as ActionResult | null)
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name={teacher ? 'settlementId' : 'chargeId'} value={id} />
      <Field
        id={`payment-amount-${id}`}
        label="Importe (€)"
        required
        hint={`Saldo pendiente: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(balance / 100)}`}
        className="max-w-40"
      >
        <Input
          id={`payment-amount-${id}`}
          name="amount"
          type="text"
          inputMode="decimal"
          pattern="[0-9]+([.,][0-9]{1,2})?"
          maxLength={10}
          placeholder="Ej.: 45,50…"
          required
          autoComplete="off"
          className="tabular-nums"
        />
      </Field>
      <Field id={`payment-method-${id}`} label="Método">
        <Select id={`payment-method-${id}`} name="method" className="min-w-32">
          <option value="cash">Efectivo</option>
          <option value="bizum">Bizum</option>
        </Select>
      </Field>
      <details className="group relative">
        <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-700">
          Añadir nota
        </summary>
        <Input
          name="note"
          maxLength={300}
          autoComplete="off"
          placeholder="Nota del pago…"
          aria-label="Nota del pago"
          className="absolute right-0 top-full z-20 mt-1 min-w-56 shadow-lg"
        />
      </details>
      <Button type="submit" size="sm" disabled={pending || balance <= 0}>
        {pending ? 'Guardando…' : 'Registrar pago'}
      </Button>
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
    </form>
  )
}

export function StudentTransactionForm(props: { id: string; balance: number }) {
  return <PaymentForm {...props} teacher={false} />
}
export function TeacherTransactionForm(props: { id: string; balance: number }) {
  return <PaymentForm {...props} teacher />
}

function AdjustmentForm({
  id,
  target,
  currentAmount,
  hasOverride,
}: {
  id: string
  target: 'student' | 'teacher'
  currentAmount: number
  hasOverride: boolean
}) {
  const teacher = target === 'teacher'
  const actionFn = teacher ? adjustTeacherSettlement : adjustStudentCharge
  const [state, action, pending] = useActionState(actionFn, null as ActionResult | null)
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        if (
          submitter instanceof HTMLButtonElement &&
          submitter.name === 'clearOverride' &&
          !window.confirm('¿Quitar el ajuste y volver al importe calculado?')
        )
          event.preventDefault()
      }}
    >
      <input type="hidden" name={teacher ? 'settlementId' : 'chargeId'} value={id} />
      <Field id={`adjust-amount-${id}`} label="Ajustar total (€)" required className="max-w-40">
        <Input
          id={`adjust-amount-${id}`}
          name="override"
          type="text"
          inputMode="decimal"
          pattern="[0-9]+([.,][0-9]{1,2})?"
          maxLength={10}
          defaultValue={(currentAmount / 100).toFixed(2)}
          required
          className="tabular-nums"
        />
      </Field>
      <Field id={`adjust-reason-${id}`} label="Motivo" required className="min-w-48">
        <Input
          id={`adjust-reason-${id}`}
          name="reason"
          minLength={3}
          maxLength={300}
          required
          placeholder="Motivo del ajuste…"
          autoComplete="off"
        />
      </Field>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? 'Guardando…' : 'Aplicar ajuste'}
      </Button>
      {hasOverride ? (
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          name="clearOverride"
          value="true"
          disabled={pending}
          className="text-rose-800 hover:bg-rose-50"
        >
          Quitar ajuste
        </Button>
      ) : null}
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
    </form>
  )
}

export function StudentAdjustmentForm(props: { id: string; currentAmount: number; hasOverride: boolean }) {
  return <AdjustmentForm {...props} target="student" />
}
export function TeacherAdjustmentForm(props: { id: string; currentAmount: number; hasOverride: boolean }) {
  return <AdjustmentForm {...props} target="teacher" />
}
