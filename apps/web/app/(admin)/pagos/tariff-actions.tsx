'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../../components/ui/button'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { Field } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import { FormMessage } from '../../../components/ui/form-message'
import { useToast } from '../../../components/ui/toast'
import { setTariffActive, updateTariff } from './actions'
import type { ActionResult } from '../../lib/action-result'

type Tariff = {
  id: string
  name: string
  monthly_amount_cents: number
  category: 'adult' | 'child'
  active: boolean
}

export function TariffEditForm({ tariff }: { tariff: Tariff }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ActionResult | null>(null)
  const [busy, start] = useTransition()
  const router = useRouter()
  const showToast = useToast()
  function submit(formData: FormData) {
    formData.set('id', tariff.id)
    start(async () => {
      const result = await updateTariff(null, formData)
      setState(result)
      if (result.ok) {
        showToast(result.message)
        setOpen(false)
        router.refresh()
      }
    })
  }
  const initialAmount = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(tariff.monthly_amount_cents / 100)
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          setState(null)
          setOpen(true)
        }}
      >
        Editar
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title={`Editar tarifa · ${tariff.name}`}
        description="Los cambios afectan a las próximas generaciones de cobros; los importes ya liquidados se conservan."
      >
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <Field id={`tariff-name-${tariff.id}`} label="Nombre" required>
            <Input
              id={`tariff-name-${tariff.id}`}
              name="name"
              defaultValue={tariff.name}
              required
              maxLength={100}
            />
          </Field>
          <Field id={`tariff-amount-${tariff.id}`} label="Cuota mensual (€)" required>
            <Input
              id={`tariff-amount-${tariff.id}`}
              name="amountEuros"
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              maxLength={10}
              defaultValue={initialAmount}
              required
              className="w-40 tabular-nums"
            />
          </Field>
          <p className="text-sm text-slate-600">
            Categoría: {tariff.category === 'adult' ? 'Adultos' : 'Infantil'}
          </p>
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}

export function TariffActiveAction({ tariff }: { tariff: Tariff }) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const showToast = useToast()
  const next = !tariff.active
  return (
    <Button
      type="button"
      size="sm"
      variant={tariff.active ? 'ghost' : 'secondary'}
      disabled={pending}
      className={tariff.active ? 'text-rose-800 hover:bg-rose-50' : ''}
      onClick={() => {
        if (
          tariff.active &&
          !window.confirm(
            `¿Desactivar la tarifa «${tariff.name}»? No se ofrecerá en nuevas asignaciones; el historial se conserva.`,
          )
        )
          return
        start(async () => {
          const result = await setTariffActive(tariff.id, next)
          showToast(result.message, result.ok ? 'success' : 'error')
          if (result.ok) router.refresh()
        })
      }}
    >
      {pending ? 'Guardando…' : tariff.active ? 'Desactivar' : 'Reactivar'}
    </Button>
  )
}
