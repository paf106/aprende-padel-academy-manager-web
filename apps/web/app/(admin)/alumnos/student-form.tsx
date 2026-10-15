'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { FormMessage } from '../../../components/ui/form-message'
import { useToast } from '../../../components/ui/toast'
import { saveStudent } from './actions'
import type { ActionResult } from '../clases/actions'

type Props = { clubs: { id: string; name: string }[]; tariffs: { id: string; name: string; category: 'adult' | 'child'; monthly_amount_cents: number }[] }

export function StudentForm({ clubs, tariffs }: Props) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [busy, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<'adult' | 'child'>('adult')
  const showToast = useToast()
  async function submit(form: FormData) { start(async () => { const result = await saveStudent(null, form); setState(result); if (result.ok) { showToast(result.message); setOpen(false) } }) }
  return <>
    <Button onClick={() => { setOpen(true); setState(null) }}>Nuevo alumno</Button>
    <DialogContent open={open} onOpenChange={setOpen} title="Añadir alumno" description="Completa sus datos y asigna una tarifa mensual."><form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Nombre<Input name="firstName" required maxLength={80}/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Apellidos<Input name="lastName" required maxLength={100}/></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Fecha de nacimiento<Input name="birthDate" type="date" required/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Categoría<select name="category" value={category} onChange={(event) => setCategory(event.target.value as 'adult' | 'child')} className="min-h-10 rounded-xl border border-slate-300 bg-white px-3"><option value="adult">Adultos</option><option value="child">Infantil</option></select></label></div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Club<select name="clubId" required defaultValue="" className="min-h-10 rounded-xl border border-slate-300 bg-white px-3"><option value="">Selecciona un club</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Tarifa mensual<select name="tariffId" required defaultValue="" className="min-h-10 rounded-xl border border-slate-300 bg-white px-3"><option value="">Selecciona una tarifa</option>{tariffs.filter((tariff) => tariff.category === category).map((tariff) => <option key={tariff.id} value={tariff.id}>{tariff.name} · {(tariff.monthly_amount_cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Email<Input name="email" type="email" autoComplete="off" spellCheck={false}/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Teléfono<Input name="phone" type="tel" autoComplete="off"/></label></div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Género<select name="gender" defaultValue="unspecified" className="min-h-10 rounded-xl border border-slate-300 bg-white px-3"><option value="unspecified">Prefiero no indicarlo</option><option value="female">Mujer</option><option value="male">Hombre</option><option value="other">Otro</option></select></label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nivel<select name="level" defaultValue="iniciacion" className="min-h-10 rounded-xl border border-slate-300 bg-white px-3"><option value="iniciacion">Iniciación</option><option value="principiante">Principiante</option><option value="medio">Medio</option><option value="avanzado">Avanzado</option><option value="competicion">Competición</option></select></label>
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Crear alumno'}</Button></div>
    </form></DialogContent>
  </>
}
