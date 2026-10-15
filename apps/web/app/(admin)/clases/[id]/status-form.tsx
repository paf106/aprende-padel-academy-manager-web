'use client'

import { useState, useTransition } from 'react'
import { setSessionStatus, type ActionResult } from '../actions'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { Button } from '../../../../components/ui/button'
import { FormMessage } from '../../../../components/ui/form-message'

export function SessionStatusForm({ sessionId, initialStatus }: { sessionId: string; initialStatus: 'pending' | 'completed' | 'cancelled' }) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, start] = useTransition()
  const targetStatus = initialStatus === 'completed' ? 'pending' : 'completed'
  function submit(formData: FormData) { formData.set('sessionId', sessionId); formData.set('status', targetStatus); start(async () => { const response = await setSessionStatus(null, formData); setResult(response); if (response.ok) setOpen(false) }) }
  if (initialStatus === 'cancelled') return null
  return <><Button size="sm" variant={targetStatus === 'completed' ? 'default' : 'secondary'} onClick={() => { setResult(null); setOpen(true) }}>{targetStatus === 'completed' ? 'Marcar terminada' : 'Reabrir clase'}</Button><DialogContent open={open} onOpenChange={setOpen} title={targetStatus === 'completed' ? 'Terminar clase' : 'Reabrir clase'} description="Puedes cambiar el estado más adelante."><form action={submit} className="space-y-4 px-5 py-5 sm:px-6">{result ? <FormMessage tone={result.ok ? 'success' : 'error'}>{result.message}</FormMessage> : null}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Volver</Button><Button disabled={pending}>{pending ? 'Guardando…' : targetStatus === 'completed' ? 'Marcar terminada' : 'Reabrir clase'}</Button></div></form></DialogContent></>
}
