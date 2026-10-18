'use client'
import { useActionState } from 'react'
import { saveTariff } from './actions'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Field } from '../../../components/ui/field'
import { FormMessage } from '../../../components/ui/form-message'
import type { ActionResult } from '../../lib/action-result'

export function TariffForm() {
  const [state, action, pending] = useActionState(saveTariff, null as ActionResult | null)
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">
      <Field id="tariff-name" label="Nombre" required className="min-w-48">
        <Input id="tariff-name" name="name" required placeholder="Adultos · 2 días por semana…" />
      </Field>
      <Field id="tariff-category" label="Categoría">
        <Select id="tariff-category" name="category">
          <option value="adult">Adultos</option>
          <option value="child">Infantil</option>
        </Select>
      </Field>
      <Field id="tariff-amount" label="Cuota mensual (€)" required>
        <Input
          id="tariff-amount"
          name="amountEuros"
          type="text"
          inputMode="decimal"
          pattern="[0-9]+([.,][0-9]{1,2})?"
          maxLength={10}
          required
          className="w-36"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Añadir tarifa'}
      </Button>
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
    </form>
  )
}
