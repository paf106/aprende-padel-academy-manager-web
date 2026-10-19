'use client'

import { useState, useTransition } from 'react'
import { markAllAttendance } from '../actions'
import { Button } from '../../../../components/ui/button'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { FormMessage } from '../../../../components/ui/form-message'
import { useToast } from '../../../../components/ui/toast'

export function MarkAllPresentButton({ sessionId }: { sessionId: string }) {
  const [busy, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const showToast = useToast()
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => {
          setResult(null)
          setOpen(true)
        }}
      >
        Marcar todos presentes
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title="Marcar todos presentes"
        description="Esta acción cambiará a presentes a todos los alumnos de la clase, incluidas las ausencias y faltas justificadas."
      >
        {result && !result.ok ? (
          <div className="px-5 pt-5 sm:px-6">
            <FormMessage>{result.message}</FormMessage>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 px-5 py-5 sm:px-6">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                const response = await markAllAttendance(sessionId)
                setResult(response)
                if (response.ok) {
                  showToast(response.message)
                  setOpen(false)
                }
              })
            }
          >
            {busy ? 'Guardando…' : 'Marcar todos presentes'}
          </Button>
        </div>
      </DialogContent>
    </>
  )
}
