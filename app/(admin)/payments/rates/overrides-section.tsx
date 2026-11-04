'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/crud/confirm-dialog'
import { FormDrawer } from '@/components/crud/form-drawer'
import { RowActionsMenu } from '@/components/crud/row-actions-menu'
import { DataTable } from '@/components/ds/data-table'
import { Field, SelectField, TextField } from '@/components/ds/field'
import { MoneyInput } from '@/components/ds/money-input'
import { useToast } from '@/components/ds/toast'
import { formatMoney } from '@/lib/core/money'
import { validate } from '@/lib/core/validation'
import { fullName } from '@/lib/demo/data'
import { useDemo } from '@/lib/demo/use-demo'
import type { RateOverride } from '@/lib/payments/monthly-charge'
import { overrideSchema, type OverrideInput } from '@/lib/payments/rate-schemas'
import { SectionCard } from './section-card'

export function OverrideFormDrawer({
  initial,
  month,
  onClose,
}: {
  initial?: Partial<Pick<OverrideInput, 'scope' | 'targetId'>>
  month: string
  onClose: () => void
}) {
  const toast = useToast()
  const { accounts, students, actions } = useDemo()
  const [values, setValues] = useState<OverrideInput>({
    scope: initial?.scope ?? 'account',
    targetId: initial?.targetId ?? '',
    amountCents: 0,
    reason: '',
    from: month,
    to: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const targets =
    values.scope === 'account'
      ? accounts.map((a) => ({ value: a.id, label: a.name }))
      : students.filter((s) => s.active).map((s) => ({ value: s.id, label: fullName(s) }))

  const submit = () => {
    const parsed = validate(overrideSchema, values)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    actions.addOverride(parsed.data)
    toast('Precio fijado. Se aplica en los cobros de esos meses.')
    onClose()
  }

  return (
    <FormDrawer
      open
      title="Fijar un precio a mano"
      description="Sustituye al cálculo automático. Sirve para altas a mitad de mes, becas o acuerdos especiales."
      submitLabel="Fijar precio"
      onSubmit={submit}
      onClose={onClose}
    >
      <SelectField
        label="Se aplica a"
        value={values.scope}
        onChange={(v) => setValues((x) => ({ ...x, scope: v as OverrideInput['scope'], targetId: '' }))}
        options={[
          { value: 'account', label: 'Toda la cuenta de cobro' },
          { value: 'student', label: 'Un solo alumno' },
        ]}
      />
      <SelectField
        label={values.scope === 'account' ? 'Cuenta' : 'Alumno'}
        placeholder="Elige uno"
        value={values.targetId}
        error={errors.targetId}
        onChange={(v) => setValues((x) => ({ ...x, targetId: v }))}
        options={targets}
      />
      <Field
        label={values.scope === 'account' ? 'Precio total al mes (€)' : 'Precio al mes (€)'}
        error={errors.amountCents}
      >
        <MoneyInput
          aria-label="Precio al mes"
          valueCents={values.amountCents}
          onCommit={(cents) => setValues((x) => ({ ...x, amountCents: cents ?? 0 }))}
        />
      </Field>
      <TextField
        id="override-reason"
        label="Motivo (obligatorio)"
        value={values.reason}
        error={errors.reason}
        onChange={(e) => setValues((x) => ({ ...x, reason: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="override-from"
          type="month"
          label="Desde el mes"
          value={values.from}
          error={errors.from}
          onChange={(e) => setValues((x) => ({ ...x, from: e.target.value }))}
        />
        <TextField
          id="override-to"
          type="month"
          label="Hasta el mes"
          hint="Vacío = sin fin"
          value={values.to}
          error={errors.to}
          onChange={(e) => setValues((x) => ({ ...x, to: e.target.value }))}
        />
      </div>
    </FormDrawer>
  )
}

export function OverridesSection({ month }: { month: string }) {
  const toast = useToast()
  const { overrides, accounts, students, actions } = useDemo()
  const [form, setForm] = useState(false)
  const [deleting, setDeleting] = useState<RateOverride | null>(null)
  const targetName = (o: RateOverride) =>
    o.scope === 'account'
      ? `Cuenta · ${accounts.find((a) => a.id === o.targetId)?.name ?? '—'}`
      : `Alumno · ${students.find((s) => s.id === o.targetId) ? fullName(students.find((s) => s.id === o.targetId)!) : '—'}`

  return (
    <SectionCard
      title="Precios fijados a mano"
      description="Sustituyen al cálculo automático durante los meses indicados. Quedan siempre con su motivo."
      actionLabel="Fijar precio"
      onAction={() => setForm(true)}
    >
      <DataTable
        rows={overrides}
        rowKey={(o) => o.id}
        empty={<p className="px-5 py-8 text-sm text-muted-foreground">No hay precios fijados a mano.</p>}
        columns={[
          {
            key: 'target',
            header: 'Se aplica a',
            cell: (o) => <span className="font-medium">{targetName(o)}</span>,
          },
          { key: 'amount', header: 'Precio al mes', align: 'right', cell: (o) => formatMoney(o.amountCents) },
          { key: 'reason', header: 'Motivo', cell: (o) => o.reason },
          { key: 'range', header: 'Meses', cell: (o) => `${o.from}${o.to ? ` a ${o.to}` : ' en adelante'}` },
          {
            key: 'actions',
            header: '',
            align: 'right',
            className: 'w-12',
            cell: (o) => (
              <RowActionsMenu
                label="Acciones del precio fijado"
                actions={[{ label: 'Quitar', tone: 'danger', onSelect: () => setDeleting(o) }]}
              />
            ),
          },
        ]}
      />
      {form ? <OverrideFormDrawer month={month} onClose={() => setForm(false)} /> : null}
      {deleting ? (
        <ConfirmDialog
          open
          title="Quitar el precio fijado"
          description="Desde este mes el cobro vuelve a calcularse con las tarifas y ofertas."
          confirmLabel="Quitar"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            actions.removeOverride(deleting.id)
            setDeleting(null)
            toast('Precio fijado eliminado.')
          }}
        />
      ) : null}
    </SectionCard>
  )
}
