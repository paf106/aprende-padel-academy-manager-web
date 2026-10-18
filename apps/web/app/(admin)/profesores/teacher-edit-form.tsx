'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { Field } from '../../../components/ui/field'
import { Input } from '../../../components/ui/input'
import { FormMessage } from '../../../components/ui/form-message'
import { useToast } from '../../../components/ui/toast'
import { updateTeacher } from './actions'
import type { ActionResult } from '../../lib/action-result'

type Teacher = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  active: boolean
  club_ids: string[]
}

export function TeacherEditForm({
  teacher,
  clubs,
}: {
  teacher: Teacher
  clubs: { id: string; name: string; active: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<ActionResult | null>(null)
  const [busy, start] = useTransition()
  const showToast = useToast()

  async function submit(formData: FormData) {
    formData.set('teacherId', teacher.id)
    start(async () => {
      const result = await updateTeacher(null, formData)
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
        title={`Editar ${teacher.full_name}`}
        description="Actualiza sus datos y los clubes donde puede impartir clases."
      >
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <Field id={`teacher-name-${teacher.id}`} label="Nombre completo" required>
            <Input
              id={`teacher-name-${teacher.id}`}
              name="fullName"
              defaultValue={teacher.full_name}
              required
              maxLength={140}
            />
          </Field>
          <Field
            id={`teacher-email-${teacher.id}`}
            label="Email de acceso"
            hint="El correo usado para iniciar sesión no se cambia desde este formulario."
          >
            <Input
              id={`teacher-email-${teacher.id}`}
              type="email"
              value={teacher.email ?? ''}
              readOnly
              aria-readonly="true"
              className="bg-slate-50 text-slate-600"
            />
          </Field>
          <Field id={`teacher-phone-${teacher.id}`} label="Teléfono">
            <Input
              id={`teacher-phone-${teacher.id}`}
              name="phone"
              type="tel"
              autoComplete="off"
              defaultValue={teacher.phone ?? ''}
              maxLength={40}
            />
          </Field>
          <fieldset className="grid gap-1.5 rounded-2xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-800">Clubes asignados</legend>
            {clubs.map((club) => (
              <label
                key={club.id}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-slate-800 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name="clubIds"
                  value={club.id}
                  defaultChecked={teacher.club_ids.includes(club.id)}
                  disabled={!club.active}
                  className="size-4 accent-emerald-800"
                />
                <span className="min-w-0 flex-1 truncate">{club.name}</span>
                {!club.active ? <span className="text-xs text-slate-500">Inactivo</span> : null}
              </label>
            ))}
          </fieldset>
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
