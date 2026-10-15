'use client'

import { useState, useTransition } from 'react'
import { Button } from './ui/button'
import { DialogContent } from './ui/dialog-shell'
import { FormMessage } from './ui/form-message'
import { useToast } from './ui/toast'
import type { ActionResult } from '../app/lib/action-result'

export function DeactivateAction({ action, label }: { action: () => Promise<ActionResult>; label: string }) {
  const [result, setResult] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const showToast = useToast()
  function confirm() {
    startTransition(async () => {
      const response = await action()
      setResult(response)
      showToast(response.message, response.ok ? 'success' : 'error')
      if (response.ok) setOpen(false)
    })
  }
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        aria-label={`Desactivar ${label}`}
        disabled={pending}
        onClick={() => {
          setResult(null)
          setOpen(true)
        }}
      >
        {pending ? 'Desactivando…' : 'Desactivar'}
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title={`Desactivar ${label}`}
        description="La desactivación oculta este elemento de la gestión diaria; sus registros históricos se conservan."
      >
        {result && !result.ok ? <FormMessage>{result.message}</FormMessage> : null}
        <div className="flex justify-end gap-2 px-5 py-5 sm:px-6">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? 'Desactivando…' : 'Confirmar desactivación'}
          </Button>
        </div>
      </DialogContent>
    </>
  )
}
