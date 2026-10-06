'use client'
import { useActionState, useOptimistic } from 'react'
import { updateAttendance } from '../actions'
export function AttendanceForm({ sessionId, studentId, initialStatus }: { sessionId: string; studentId: string; initialStatus?: 'present' | 'absent' | 'justified' }) {
  const [result, action, pending] = useActionState(updateAttendance, null)
  const [status, setStatus] = useOptimistic(initialStatus)
  return <form action={action} className="attendance-actions"><input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="studentId" value={studentId} /><label className="attendance-comment"><span className="sr-only">Comentario de asistencia</span><input name="comment" placeholder="Comentario" maxLength={300}/></label>{(['present','absent','justified'] as const).map((value) => <button formAction={(formData) => { formData.set('status',value); setStatus(value); return action(formData) }} key={value} name="status" value={value} disabled={pending} aria-pressed={status===value} className={status===value?'attendance active':'attendance'}>{value==='present'?'Presente':value==='absent'?'Ausente':'Justificada'}</button>)}{result && !result.ok ? <span role="alert" className="field-help">{result.message}</span> : null}</form>
}
