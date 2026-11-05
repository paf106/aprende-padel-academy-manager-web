'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid } from '@/components/ds/card'
import { MultiSelectField, SelectField, TextField } from '@/components/ds/field'
import { PageContainer } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import { defaultCapacity } from '@/lib/classes/capacity'
import { isIsoDate } from '@/lib/core/dates'
import { cancellationReasonLabels, moduleLabels, paymentMethodLabels } from '@/lib/core/labels'
import { cancellationReasons, type ModuleId, type PaymentMethod } from '@/lib/core/types'
import { validate } from '@/lib/core/validation'
import { useAppData } from '@/lib/data/provider'
import { modules } from '@/lib/modules'
import { billingSettingsSchema, type BillingSettings } from '@/lib/payments/settings'

export function SettingsView() {
  const toast = useToast()
  const { billing, actions } = useAppData()
  const [values, setValues] = useState<BillingSettings>(billing)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const set = <K extends keyof BillingSettings>(key: K, value: BillingSettings[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const save = () => {
    const parsed = validate(billingSettingsSchema, values)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    setErrors({})
    actions.setBilling(parsed.data)
    toast('Ajustes de cobro guardados. Se aplican a los cobros calculados desde ahora.')
  }

  return (
    <PageContainer>
      <h1 className="sr-only">Ajustes</h1>
      <BentoGrid>
        <BentoCard span="xl" title="Cobro de cuotas">
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="included-classes"
                type="number"
                min={1}
                label="Clases que cubre la cuota por cada día a la semana"
                hint="Si el mes tiene menos clases se cobra la parte proporcional; si tiene más, la clase de más."
                value={values.includedPerWeeklyClass}
                error={errors.includedPerWeeklyClass}
                onChange={(e) => set('includedPerWeeklyClass', Number(e.target.value))}
              />
              <TextField
                id="notice-days"
                type="number"
                min={0}
                label="Días de preaviso para dar de baja"
                hint="Sin este preaviso se cobra el mes entero."
                value={values.leaveNoticeDays}
                error={errors.leaveNoticeDays}
                onChange={(e) => set('leaveNoticeDays', Number(e.target.value))}
              />
            </div>
            <MultiSelectField
              label="Motivos de cancelación que no se cobran al alumno"
              value={values.creditReasons}
              onChange={(v) => set('creditReasons', v as BillingSettings['creditReasons'])}
              options={cancellationReasons.map((reason) => ({
                value: reason,
                label: cancellationReasonLabels[reason],
              }))}
            />
            <p className="-mt-3 text-xs text-muted-foreground">
              Si el alumno falta por su cuenta se cobra la clase, sea cual sea el motivo. El descuento se
              aplica en el mismo mes.
            </p>
            <MultiSelectField
              label="Métodos de pago permitidos"
              value={values.allowedPaymentMethods}
              error={errors.allowedPaymentMethods}
              onChange={(v) => set('allowedPaymentMethods', v as PaymentMethod[])}
              options={(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((method) => ({
                value: method,
                label: paymentMethodLabels[method],
              }))}
            />
            <Button className="w-fit" onClick={save}>
              Guardar ajustes de cobro
            </Button>
          </div>
        </BentoCard>
        <BentoCard span="md" title="Reglas de clase">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Aforo adultos</dt>
              <dd className="font-semibold">{defaultCapacity.adult}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Aforo niños</dt>
              <dd className="font-semibold">{defaultCapacity.child}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Duración habitual</dt>
              <dd className="font-semibold">60 min (o 90 min)</dd>
            </div>
          </dl>
          <SeasonEndField />
          <Link href="/payments?view=rates" className="text-sm font-medium text-brand">
            Editar tarifas, ofertas y pago a profesores
          </Link>
        </BentoCard>
        <BentoCard span="full" title="Módulos">
          <ul className="divide-y divide-border">
            {modules.map((module) => (
              <li key={module.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium">{moduleLabels[module.id as ModuleId]}</span>
                  <span className="block text-xs text-muted-foreground">{module.description}</span>
                </span>
                <Badge tone={module.status === 'active' ? 'brand' : 'neutral'}>
                  {module.status === 'active' ? 'Disponible' : 'Próximamente'}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            La contratación de módulos la gestiona el equipo de plataforma.
          </p>
        </BentoCard>
      </BentoGrid>
    </PageContainer>
  )
}

function SeasonEndField() {
  const toast = useToast()
  const { seasonEnd, actions } = useAppData()
  const [value, setValue] = useState(seasonEnd)
  const [error, setError] = useState('')
  const save = () => {
    if (!isIsoDate(value)) {
      setError('Indica una fecha válida')
      return
    }
    setError('')
    actions.setSeasonEnd(value)
    toast('Fin de temporada guardado. Los calendarios de los grupos se han actualizado.')
  }
  return (
    <div className="grid gap-2">
      <TextField
        id="season-end"
        type="date"
        label="Fin de temporada"
        hint="Los grupos generan sus clases hasta esta fecha."
        value={value}
        error={error}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button size="sm" variant="secondary" className="w-fit" disabled={value === seasonEnd} onClick={save}>
        Guardar fecha
      </Button>
    </div>
  )
}
