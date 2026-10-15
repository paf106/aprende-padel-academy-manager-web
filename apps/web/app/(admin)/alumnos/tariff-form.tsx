'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { FormMessage } from '../../../components/ui/form-message'
import { changeStudentTariff } from './actions'
import type { ActionResult } from '../clases/actions'
import { localTodayInTimeZone, money } from '@aprende-padel/core'

type Tariff = { id: string; name: string; monthly_amount_cents: number; category: 'adult' | 'child' }
export function StudentTariffForm({ studentId, category, tariffs, current }: { studentId: string; category: 'adult' | 'child'; tariffs: Tariff[]; current?: string }) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, start] = useTransition()
  async function submit(form: FormData) { form.set('studentId', studentId); start(async () => { const result = await changeStudentTariff(null, form); setState(result); if (result.ok) setOpen(false) }) }
  return <>
    <Button size="sm" variant="secondary" onClick={() => { setState(null); setOpen(true) }}>Cambiar tarifa</Button>
    <DialogContent open={open} onOpenChange={setOpen} title="Cambiar tarifa" description="La tarifa anterior termina el día previo a la nueva fecha."><form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nueva tarifa<select name="tariffId" defaultValue="" required className="min-h-10 rounded-xl border border-slate-300 bg-white px-3"><option value="">Selecciona una tarifa</option>{tariffs.filter((tariff) => tariff.category === category).map((tariff) => <option value={tariff.id} key={tariff.id}>{tariff.name} · {money(tariff.monthly_amount_cents)}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Vigente desde<input name="startsOn" type="date" required defaultValue={localTodayInTimeZone('Europe/Madrid')} className="min-h-10 rounded-xl border border-slate-300 px-3"/></label>{current ? <p className="text-xs text-slate-500">El alumno ya tiene una tarifa asignada.</p> : null}
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={busy}>{busy ? 'Guardando…' : 'Asignar tarifa'}</Button></div>
    </form></DialogContent>
  </>
}
