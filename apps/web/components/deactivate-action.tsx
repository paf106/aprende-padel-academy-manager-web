'use client'

import { useState, useTransition } from 'react'
import { Button } from './ui/button'
import type { ActionResult } from '../app/(admin)/clases/actions'

export function DeactivateAction({ action, label }: { action: () => Promise<ActionResult>; label: string }) {
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()
  return <div className="flex items-center gap-2"><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => {
    if (!window.confirm(`¿Desactivar ${label.toLocaleLowerCase('es')}?`)) return
    startTransition(async () => setResult(await action()))
  }}>{pending ? 'Desactivando…' : 'Desactivar'}</Button>{result ? <span role="status" className={`text-xs ${result.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{result.message}</span> : null}</div>
}
