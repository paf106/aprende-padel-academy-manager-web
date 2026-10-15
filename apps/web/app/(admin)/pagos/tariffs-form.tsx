'use client'
import { useActionState } from 'react'
import { saveTariff } from './actions'
import { Button } from '../../../components/ui/button'
import { FormMessage } from '../../../components/ui/form-message'
import type { ActionResult } from '../../lib/action-result'

export function TariffForm() {
  const [state, action, pending] = useActionState(saveTariff, null as ActionResult | null)
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
      <label className="grid min-w-48 gap-1.5 text-xs font-medium text-slate-600">
        Nombre
        <input
          name="name"
          required
          placeholder="Adultos · 2 días por semana…"
          className="min-h-10 rounded-xl border border-slate-300 px-3 text-sm text-slate-900"
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-slate-600">
        Categoría
        <select
          name="category"
          className="min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
        >
          <option value="adult">Adultos</option>
          <option value="child">Infantil</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-slate-600">
        Cuota mensual (€)
        <input
          name="amountEuros"
          type="number"
          step="0.01"
          min="0"
          required
          className="min-h-10 w-36 rounded-xl border border-slate-300 px-3 text-sm text-slate-900"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Añadir tarifa'}
      </Button>
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
    </form>
  )
}
