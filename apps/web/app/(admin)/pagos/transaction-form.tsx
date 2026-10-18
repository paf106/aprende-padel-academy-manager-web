'use client'
import { useActionState } from 'react'
import {
  adjustStudentCharge,
  adjustTeacherSettlement,
  recordStudentPayment,
  recordTeacherPayment,
} from './actions'
import { Button } from '../../../components/ui/button'
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
      <label className="grid gap-1 text-xs font-medium text-slate-600">
        <span>Importe (€)</span>
        <Input
          name="amount"
          type="number"
          min="0.01"
          max={(balance / 100).toFixed(2)}
          step="0.01"
          inputMode="decimal"
          placeholder={`Saldo ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(balance / 100)}…`}
          required
          className="w-32"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">
        <span>Método</span>
        <Select name="method" className="w-auto min-w-32">
          <option value="cash">Efectivo</option>
          <option value="bizum">Bizum</option>
        </Select>
      </label>
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
}: {
  id: string
  target: 'student' | 'teacher'
  currentAmount: number
}) {
  const teacher = target === 'teacher'
  const actionFn = teacher ? adjustTeacherSettlement : adjustStudentCharge
  const [state, action, pending] = useActionState(actionFn, null as ActionResult | null)
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name={teacher ? 'settlementId' : 'chargeId'} value={id} />
      <label className="grid gap-1 text-xs font-medium text-slate-600">
        Ajustar total (€)
        <Input
          name="override"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          defaultValue={(currentAmount / 100).toFixed(2)}
          required
          className="w-32"
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">
        Motivo
        <Input
          name="reason"
          minLength={3}
          maxLength={300}
          required
          placeholder="Motivo del ajuste…"
          className="w-56"
        />
      </label>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? 'Guardando…' : 'Aplicar ajuste'}
      </Button>
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
    </form>
  )
}

export function StudentAdjustmentForm(props: { id: string; currentAmount: number }) {
  return <AdjustmentForm {...props} target="student" />
}
export function TeacherAdjustmentForm(props: { id: string; currentAmount: number }) {
  return <AdjustmentForm {...props} target="teacher" />
}
