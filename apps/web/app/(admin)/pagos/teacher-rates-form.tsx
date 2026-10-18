'use client'

import { useActionState, useState } from 'react'
import { saveTeacherRates, setTeacherRateOverride } from './actions'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { FormMessage } from '../../../components/ui/form-message'
import type { ActionResult } from '../../lib/action-result'

type Settings = {
  teacher_rate_below_cents: number
  teacher_rate_threshold_cents: number
  teacher_student_threshold: number
}
type RateTarget = { kind: 'default' } | { kind: 'teacher'; teacherId: string }

function euroValue(cents: number) {
  return (cents / 100).toFixed(2)
}

function RatesForm({
  settings,
  target,
  hasOverride = false,
}: {
  settings: Settings
  target: RateTarget
  hasOverride?: boolean
}) {
  const teacher = target.kind === 'teacher'
  const [editing, setEditing] = useState(!teacher || hasOverride)
  const actionFunction = teacher ? setTeacherRateOverride : saveTeacherRates
  const [state, action, pending] = useActionState(actionFunction, null as ActionResult | null)
  if (teacher && !editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-700">
          <span aria-hidden="true" className="size-2 rounded-full bg-slate-500" />
          Usa los valores generales
        </span>
        <Button size="sm" variant="secondary" type="button" onClick={() => setEditing(true)}>
          Definir excepción
        </Button>
      </div>
    )
  }
  return (
    <form
      action={action}
      className="flex flex-wrap items-end gap-3 p-4"
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        if (
          submitter instanceof HTMLButtonElement &&
          submitter.name === 'clearOverride' &&
          !window.confirm('¿Quitar la excepción y volver a los valores generales?')
        )
          event.preventDefault()
      }}
    >
      {teacher ? <input type="hidden" name="teacherId" value={target.teacherId} /> : null}
      {teacher ? (
        <>
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">
            Menos de {settings.teacher_student_threshold} alumnos (€ / h)
            <Input
              name="below"
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              maxLength={10}
              placeholder={euroValue(settings.teacher_rate_below_cents)}
              defaultValue={hasOverride ? euroValue(settings.teacher_rate_below_cents) : ''}
              required
              className="w-36 tabular-nums"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">
            Desde {settings.teacher_student_threshold} alumnos (€ / h)
            <Input
              name="threshold"
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              maxLength={10}
              placeholder={euroValue(settings.teacher_rate_threshold_cents)}
              defaultValue={hasOverride ? euroValue(settings.teacher_rate_threshold_cents) : ''}
              required
              className="w-36 tabular-nums"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">
            Umbral de alumnos
            <Input
              name="studentThreshold"
              type="number"
              min="1"
              max="16"
              defaultValue={hasOverride ? settings.teacher_student_threshold : 3}
              required
              className="w-28 tabular-nums"
            />
          </label>
        </>
      ) : (
        <>
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">
            Menos de {settings.teacher_student_threshold} alumnos (€ / h)
            <Input
              name="belowEuros"
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              maxLength={10}
              defaultValue={euroValue(settings.teacher_rate_below_cents)}
              required
              className="w-36 tabular-nums"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">
            Desde {settings.teacher_student_threshold} alumnos (€ / h)
            <Input
              name="thresholdEuros"
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              maxLength={10}
              defaultValue={euroValue(settings.teacher_rate_threshold_cents)}
              required
              className="w-36 tabular-nums"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">
            Umbral de alumnos
            <Input
              name="studentThreshold"
              type="number"
              min="1"
              max="16"
              defaultValue={settings.teacher_student_threshold}
              required
              className="w-28 tabular-nums"
            />
          </label>
        </>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Guardando…' : teacher ? 'Guardar excepción' : 'Guardar valores generales'}
      </Button>
      {teacher && hasOverride ? (
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          name="clearOverride"
          value="true"
          disabled={pending}
          className="text-rose-800 hover:bg-rose-50"
        >
          Quitar excepción
        </Button>
      ) : null}
      {teacher ? (
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      ) : null}
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
    </form>
  )
}

export function DefaultTeacherRatesForm({ settings }: { settings: Settings }) {
  return <RatesForm settings={settings} target={{ kind: 'default' }} />
}
export function TeacherOverrideRatesForm({
  settings,
  teacherId,
  hasOverride,
}: {
  settings: Settings
  teacherId: string
  hasOverride: boolean
}) {
  return <RatesForm settings={settings} target={{ kind: 'teacher', teacherId }} hasOverride={hasOverride} />
}
