'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { FormMessage } from '../../../components/ui/form-message'
import { updateStudent } from './actions'
import type { ActionResult } from '../clases/actions'

type Student = { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; level: 'iniciacion' | 'principiante' | 'medio' | 'avanzado' | 'competicion' }

export function StudentEditForm({ student }: { student: Student }) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, start] = useTransition()
  async function submit(form: FormData) {
    form.set('id', student.id)
    start(async () => { const result = await updateStudent(null, form); setState(result); if (result.ok) setOpen(false) })
  }
  return <>
    <Button variant="secondary" size="sm" onClick={() => { setState(null); setOpen(true) }}>Editar</Button>
    <DialogContent open={open} onOpenChange={setOpen} title="Editar alumno"><form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Nombre<input name="firstName" defaultValue={student.first_name} required className="min-h-10 rounded-xl border border-slate-300 px-3"/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Apellidos<input name="lastName" defaultValue={student.last_name} required className="min-h-10 rounded-xl border border-slate-300 px-3"/></label></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium text-slate-700">Email<input name="email" type="email" defaultValue={student.email ?? ''} className="min-h-10 rounded-xl border border-slate-300 px-3"/></label><label className="grid gap-1.5 text-sm font-medium text-slate-700">Teléfono<input name="phone" type="tel" defaultValue={student.phone ?? ''} className="min-h-10 rounded-xl border border-slate-300 px-3"/></label></div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">Nivel<select name="level" defaultValue={student.level} className="min-h-10 rounded-xl border border-slate-300 bg-white px-3"><option value="iniciacion">Iniciación</option><option value="principiante">Principiante</option><option value="medio">Medio</option><option value="avanzado">Avanzado</option><option value="competicion">Competición</option></select></label>
      {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
    </form></DialogContent>
  </>
}
