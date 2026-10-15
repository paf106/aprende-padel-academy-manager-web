'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check, Circle } from 'lucide-react'
import { setAttendanceQuick, updateAttendance } from '../actions'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { Button } from '../../../../components/ui/button'
import { FormMessage } from '../../../../components/ui/form-message'
import { useToast } from '../../../../components/ui/toast'
import { Menu } from '../../../../components/ui/menu'

export function AttendanceForm({ sessionId, studentId, studentName, initialStatus, disabled = false }: { sessionId: string; studentId: string; studentName?: string; initialStatus?: 'present' | 'absent' | 'justified'; disabled?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useOptimistic(initialStatus)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentState, setCommentState] = useState<{ ok: boolean; message: string } | null>(null)
  const [commentPending, startComment] = useTransition()
  const showToast = useToast()
  const nextStatus = status === 'present' ? 'absent' : 'present'
  function mark(value: 'present' | 'absent' | 'justified') {
    startTransition(async () => { setStatus(value); const data = new FormData(); data.set('sessionId', sessionId); data.set('studentId', studentId); data.set('status', value); const result = await setAttendanceQuick(null, data); if (!result.ok) showToast(result.message, 'error') })
  }
  function saveComment(data: FormData) {
    data.set('sessionId', sessionId); data.set('studentId', studentId)
    if (status) data.set('status', status)
    startComment(async () => { const result = await updateAttendance(null, data); setCommentState(result); if (result.ok) { showToast(result.message); setCommentOpen(false) } })
  }
  return <div className="flex items-center gap-1">
    <button type="button" className={`inline-flex min-h-9 min-w-10 items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold sm:min-w-28 ${status === 'present' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}`} aria-label={status === 'present' ? 'Presente. Marcar ausente' : status === 'absent' ? 'Ausente. Marcar presente' : status === 'justified' ? 'Falta justificada. Marcar presente' : 'Sin marcar. Marcar presente'} aria-pressed={status === 'present'} disabled={disabled || pending} onClick={() => mark(nextStatus)}>{status === 'present' ? <Check size={15}/> : <Circle size={15}/>}<span className="sm:inline">{status === 'present' ? 'Presente' : status === 'absent' ? 'Ausente' : status === 'justified' ? 'Justificada' : 'Sin marcar'}</span></button>
    {!disabled ? <Menu label={`Más opciones de asistencia${studentName ? ` de ${studentName}` : ''}`} items={[{ label: 'Marcar justificada', onSelect: () => mark('justified') }, { label: 'Marcar ausente', onSelect: () => mark('absent') }, { label: 'Añadir comentario', onSelect: () => { setCommentState(null); setCommentOpen(true) } }]}/> : null}
    <DialogContent open={commentOpen} onOpenChange={setCommentOpen} title="Comentario de asistencia" description="Añade una nota para el equipo."><form action={saveComment} className="space-y-4 px-5 py-5 sm:px-6"><label className="grid gap-1.5 text-sm font-medium">Comentario<textarea name="comment" maxLength={300} placeholder="Escribe un comentario…" required className="min-h-24 rounded-xl border border-slate-300 px-3 py-2.5"/></label>{!status ? <p className="text-sm text-amber-800">Marca primero la asistencia para poder añadir un comentario sin cambiar el estado.</p> : null}{commentState ? <FormMessage tone={commentState.ok ? 'success' : 'error'}>{commentState.message}</FormMessage> : null}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={() => setCommentOpen(false)}>Cancelar</Button><Button type="submit" disabled={commentPending || !status}>{commentPending ? 'Guardando…' : 'Guardar comentario'}</Button></div></form></DialogContent>
  </div>
}
