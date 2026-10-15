'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { FormMessage } from '../../../components/ui/form-message'
import { createTeacher } from './actions'
import type { ActionResult } from '../clases/actions'

export function TeacherForm({ clubs }: { clubs: { id: string; name: string }[] }) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, start] = useTransition()
  async function submit(form: FormData) { start(async () => { const result = await createTeacher(null, form); setState(result); if (result.ok) setOpen(false) }) }
  return <>
    <Button onClick={() => { setOpen(true); setState(null) }}>Nuevo profesor</Button>
    <DialogContent open={open} onOpenChange={setOpen} title="Añadir profesor" description="Crea el acceso y asigna los clubes donde imparte clases."><form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nombre completo<input name="fullName" required maxLength={140} className="min-h-10 rounded-xl border border-slate-300 px-3"/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Email<input name="email" type="email" required autoComplete="off" spellCheck={false} className="min-h-10 rounded-xl border border-slate-300 px-3"/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Teléfono<input name="phone" type="tel" autoComplete="off" className="min-h-10 rounded-xl border border-slate-300 px-3"/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Contraseña inicial<input name="password" type="password" minLength={10} required autoComplete="new-password" className="min-h-10 rounded-xl border border-slate-300 px-3"/></label>
      <fieldset className="grid gap-2 rounded-xl border border-slate-200 p-3"><legend className="px-1 text-sm font-medium text-slate-700">Clubes</legend>{clubs.map((club) => <label className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-slate-50" key={club.id}><input type="checkbox" name="clubIds" value={club.id} className="accent-emerald-700"/>{club.name}</label>)}</fieldset>
      <p className="text-xs text-slate-500">La contraseña se usa para crear el acceso y no se guarda en las tablas de la academia.</p>{state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={busy}>{busy ? 'Creando…' : 'Crear profesor'}</Button></div>
    </form></DialogContent>
  </>
}
