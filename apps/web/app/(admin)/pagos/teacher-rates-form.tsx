'use client'

import { useActionState } from 'react'
import { saveTeacherRates, setTeacherRateOverride } from './actions'
import { Button } from '../../../components/ui/button'
import { FormMessage } from '../../../components/ui/form-message'
import type { ActionResult } from '../../lib/action-result'

type Settings = {
  teacher_rate_below_cents: number
  teacher_rate_threshold_cents: number
  teacher_student_threshold: number
}
type RateTarget = { kind: 'default' } | { kind: 'teacher'; teacherId: string }

function RatesForm({ settings, target }: { settings: Settings; target: RateTarget }) {
  const teacher = target.kind === 'teacher'
  const actionFunction = teacher ? setTeacherRateOverride : saveTeacherRates
  const [state, action, pending] = useActionState(actionFunction, null as ActionResult | null)
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 p-4">
      {teacher ? <input type="hidden" name="teacherId" value={target.teacherId} /> : null}
      {teacher ? (
        <>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Menos del umbral (€ / h)
            <input
              name="below"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={(settings.teacher_rate_below_cents / 100).toFixed(2)}
              className="min-h-10 w-36 rounded-xl border border-slate-500 px-3 text-sm text-slate-900"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Desde el umbral (€ / h)
            <input
              name="threshold"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={(settings.teacher_rate_threshold_cents / 100).toFixed(2)}
              className="min-h-10 w-36 rounded-xl border border-slate-500 px-3 text-sm text-slate-900"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" name="clearOverride" value="true" className="accent-emerald-800" />
            Quitar excepción
          </label>
        </>
      ) : (
        <>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Menos de {settings.teacher_student_threshold} inscritos (€ / h)
            <input
              name="belowEuros"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={(settings.teacher_rate_below_cents / 100).toFixed(2)}
              className="min-h-10 w-36 rounded-xl border border-slate-500 px-3 text-sm text-slate-900"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Desde {settings.teacher_student_threshold} inscritos (€ / h)
            <input
              name="thresholdEuros"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={(settings.teacher_rate_threshold_cents / 100).toFixed(2)}
              className="min-h-10 w-36 rounded-xl border border-slate-500 px-3 text-sm text-slate-900"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium text-slate-700">
            Umbral de inscritos
            <input
              name="studentThreshold"
              type="number"
              min="1"
              max="16"
              defaultValue={settings.teacher_student_threshold}
              className="min-h-10 w-28 rounded-xl border border-slate-500 px-3 text-sm text-slate-900"
            />
          </label>
        </>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Guardando…' : teacher ? 'Guardar excepción' : 'Guardar valores generales'}
      </Button>
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
    </form>
  )
}

export function DefaultTeacherRatesForm({ settings }: { settings: Settings }) {
  return <RatesForm settings={settings} target={{ kind: 'default' }} />
}

export function TeacherOverrideRatesForm({ settings, teacherId }: { settings: Settings; teacherId: string }) {
  return <RatesForm settings={settings} target={{ kind: 'teacher', teacherId }} />
}
