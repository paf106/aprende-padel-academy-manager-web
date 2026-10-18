'use client'

import { useState, useTransition } from 'react'
import { editSession } from '../actions'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Select } from '../../../../components/ui/select'
import { Textarea } from '../../../../components/ui/textarea'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { FormMessage } from '../../../../components/ui/form-message'
import { useToast } from '../../../../components/ui/toast'
import type { ActionResult } from '../../../lib/action-result'

function localInput(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

export function SessionEditForm({
  sessionId,
  startsAt,
  endsAt,
  notes,
  timeZone,
}: {
  sessionId: string
  startsAt: string
  endsAt: string
  notes: string
  timeZone: string
}) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, start] = useTransition()
  const showToast = useToast()
  async function submit(form: FormData) {
    form.set('sessionId', sessionId)
    start(async () => {
      const result = await editSession(null, form)
      setState(result)
      if (result.ok) {
        showToast(result.message)
        setOpen(false)
      }
    })
  }
  const duration = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000)
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
        Editar fecha y hora
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title="Editar clase"
        description="Cambia el horario sin modificar el grupo."
      >
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Fecha y hora
            <Input
              name="localStart"
              type="datetime-local"
              defaultValue={localInput(startsAt, timeZone)}
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Duración
            <Input
              name="duration"
              type="number"
              min="30"
              max="180"
              step="15"
              defaultValue={duration}
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Notas
            <Textarea name="notes" defaultValue={notes} maxLength={500} />
          </label>
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
