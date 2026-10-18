'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { FormMessage } from '../../../components/ui/form-message'
import { useToast } from '../../../components/ui/toast'
import { updateStudent } from './actions'
import type { ActionResult } from '../../lib/action-result'

type Student = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  level: 'iniciacion' | 'principiante' | 'medio' | 'avanzado' | 'competicion'
}

export function StudentEditForm({ student }: { student: Student }) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const showToast = useToast()
  const [busy, start] = useTransition()
  async function submit(form: FormData) {
    form.set('id', student.id)
    start(async () => {
      const result = await updateStudent(null, form)
      setState(result)
      if (result.ok) {
        showToast(result.message)
        setOpen(false)
      }
    })
  }
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setState(null)
          setOpen(true)
        }}
      >
        Editar
      </Button>
      <DialogContent open={open} onOpenChange={setOpen} title="Editar alumno">
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Nombre
              <Input name="firstName" defaultValue={student.first_name} required />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Apellidos
              <Input name="lastName" defaultValue={student.last_name} required />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Email
              <Input
                name="email"
                type="email"
                autoComplete="off"
                spellCheck={false}
                defaultValue={student.email ?? ''}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Teléfono
              <Input name="phone" type="tel" autoComplete="off" defaultValue={student.phone ?? ''} />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nivel
            <Select name="level" defaultValue={student.level}>
              <option value="iniciacion">Iniciación</option>
              <option value="principiante">Principiante</option>
              <option value="medio">Medio</option>
              <option value="avanzado">Avanzado</option>
              <option value="competicion">Competición</option>
            </Select>
          </label>
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
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
