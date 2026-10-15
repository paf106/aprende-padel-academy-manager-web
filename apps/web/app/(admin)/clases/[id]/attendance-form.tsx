'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check, Circle, MoreHorizontal } from 'lucide-react'
import { setAttendanceQuick, updateAttendance } from '../actions'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { Button } from '../../../../components/ui/button'
import { FormMessage } from '../../../../components/ui/form-message'

export function AttendanceForm({ sessionId, studentId, initialStatus, disabled = false }: { sessionId: string; studentId: string; initialStatus?: 'present' | 'absent' | 'justified'; disabled?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useOptimistic(initialStatus)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentState, setCommentState] = useState<{ ok: boolean; message: string } | null>(null)
  const [commentPending, startComment] = useTransition()
  const nextStatus = status === 'present' ? 'absent' : 'present'
  function mark(value: 'present' | 'absent' | 'justified') {
    startTransition(async () => { setStatus(value); const data = new FormData(); data.set('sessionId', sessionId); data.set('studentId', studentId); data.set('status', value); await setAttendanceQuick(null, data) })
  }
  function saveComment(data: FormData) {
    data.set('sessionId', sessionId); data.set('studentId', studentId)
    if (status) data.set('status', status)
    startComment(async () => { const result = await updateAttendance(null, data); setCommentState(result); if (result.ok) setCommentOpen(false) })
  }
  return <div className="flex items-center gap-1">
    <button type="button" className={`inline-flex min-h-9 min-w-10 items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold sm:min-w-28 ${status === 'present' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}`} aria-label={status === 'present' ? 'Presente. Marcar ausente' : status === 'absent' ? 'Ausente. Marcar presente' : status === 'justified' ? 'Falta justificada. Marcar presente' : 'Sin marcar. Marcar presente'} aria-pressed={status === 'present'} disabled={disabled || pending} onClick={() => mark(nextStatus)}>{status === 'present' ? <Check size={15}/> : <Circle size={15}/>}<span className="sm:inline">{status === 'present' ? 'Presente' : status === 'absent' ? 'Ausente' : status === 'justified' ? 'Justificada' : 'Sin marcar'}</span></button>
    {!disabled ? <details className="relative"><summary aria-label="Más opciones de asistencia" className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-slate-500 hover:bg-slate-100"><MoreHorizontal size={18}/></summary><div className="absolute right-0 top-10 z-20 min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl"><button type="button" className="block min-h-9 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-50" onClick={() => mark('justified')}>Marcar justificada</button><button type="button" className="block min-h-9 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-50" onClick={() => mark('absent')}>Marcar ausente</button><button type="button" className="block min-h-9 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-50" onClick={() => { setCommentState(null); setCommentOpen(true) }}>Añadir comentario</button></div></details> : null}
    <DialogContent open={commentOpen} onOpenChange={setCommentOpen} title="Comentario de asistencia" description="Añade una nota para el equipo."><form action={saveComment} className="space-y-4 px-5 py-5 sm:px-6"><label className="grid gap-1.5 text-sm font-medium">Comentario<textarea name="comment" maxLength={300} placeholder="Escribe un comentario…" required className="min-h-24 rounded-xl border border-slate-300 px-3 py-2.5"/></label>{!status ? <p className="text-sm text-amber-800">Marca primero la asistencia para poder añadir un comentario sin cambiar el estado.</p> : null}{commentState ? <FormMessage tone={commentState.ok ? 'success' : 'error'}>{commentState.message}</FormMessage> : null}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={() => setCommentOpen(false)}>Cancelar</Button><Button disabled={commentPending || !status}>{commentPending ? 'Guardando…' : 'Guardar comentario'}</Button></div></form></DialogContent>
  </div>
}
