'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { FormMessage } from '../../../components/ui/form-message'
import { useToast } from '../../../components/ui/toast'
import { createClub } from './actions'
import type { ActionResult } from '../../lib/action-result'

export function ClubForm() {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, start] = useTransition()
  const showToast = useToast()
  async function submit(form: FormData) {
    start(async () => {
      const result = await createClub(null, form)
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
        onClick={() => {
          setOpen(true)
          setState(null)
        }}
      >
        Nuevo club
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title="Crear club"
        description="Añade una sede a tu organización."
      >
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nombre
            <input
              name="name"
              required
              maxLength={120}
              className="min-h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Localidad
            <input
              name="municipality"
              required
              maxLength={100}
              className="min-h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Dirección
            <input
              name="address"
              maxLength={240}
              className="min-h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Zona horaria
            <input
              name="timezone"
              required
              defaultValue="Europe/Madrid"
              className="min-h-10 rounded-xl border border-slate-300 px-3"
            />
          </label>
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar club'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
