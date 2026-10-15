'use client'
import { useActionState } from 'react'
import { adjustStudentCharge, adjustTeacherSettlement, recordStudentPayment, recordTeacherPayment } from './actions'
import { Button } from '../../../components/ui/button'
import { FormMessage } from '../../../components/ui/form-message'
import type { ActionResult } from '../clases/actions'

function PaymentForm({ id, balance, teacher }: { id: string; balance: number; teacher: boolean }) {
  const actionFn = teacher ? recordTeacherPayment : recordStudentPayment
  const [state, action, pending] = useActionState(actionFn, null as ActionResult | null)
  return <form action={action} className="flex flex-wrap items-end gap-2"><input type="hidden" name={teacher ? 'settlementId' : 'chargeId'} value={id}/><label className="grid gap-1 text-xs font-medium text-slate-600"><span>Importe (€)</span><input name="amount" type="number" min="0.01" max={(balance / 100).toFixed(2)} step="0.01" inputMode="decimal" placeholder={`Saldo ${new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(balance/100)}…`} required className="min-h-10 w-32 rounded-lg border border-slate-400 px-2.5 text-sm text-slate-900"/></label><label className="grid gap-1 text-xs font-medium text-slate-600"><span>Método</span><select name="method" className="min-h-10 rounded-lg border border-slate-400 bg-white px-2 text-sm text-slate-900"><option value="cash">Efectivo</option><option value="bizum">Bizum</option></select></label><Button type="submit" size="sm" disabled={pending || balance <= 0}>{pending ? 'Guardando…' : 'Registrar pago'}</Button>{state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}</form>
}
export function StudentTransactionForm(props: { id: string; balance: number }) { return <PaymentForm {...props} teacher={false}/> }
export function TeacherTransactionForm(props: { id: string; balance: number }) { return <PaymentForm {...props} teacher/> }
export function AdjustmentForm({ id, teacher = false, currentAmount }: { id: string; teacher?: boolean; currentAmount: number }) {
  const actionFn = teacher ? adjustTeacherSettlement : adjustStudentCharge
  const [state, action, pending] = useActionState(actionFn, null as ActionResult | null)
  return <form action={action} className="flex flex-wrap items-end gap-2"><input type="hidden" name={teacher ? 'settlementId' : 'chargeId'} value={id}/><label className="grid gap-1 text-xs font-medium text-slate-600">Ajustar total (€)<input name="override" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={(currentAmount / 100).toFixed(2)} required className="min-h-10 w-32 rounded-lg border border-slate-400 px-2.5 text-sm text-slate-900"/></label><label className="grid gap-1 text-xs font-medium text-slate-600">Motivo<input name="reason" minLength={3} maxLength={300} required placeholder="Motivo del ajuste…" className="min-h-10 w-56 rounded-lg border border-slate-400 px-2.5 text-sm text-slate-900"/></label><Button type="submit" size="sm" variant="secondary" disabled={pending}>{pending ? 'Guardando…' : 'Aplicar ajuste'}</Button>{state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}</form>
}
