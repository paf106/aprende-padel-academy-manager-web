'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { BadgeCheck, Check, UserRoundCheck, UserRoundX } from 'lucide-react'
import { setAttendanceQuick, updateAttendance } from '../actions'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { Button } from '../../../../components/ui/button'
import { FormMessage } from '../../../../components/ui/form-message'
import { Textarea } from '../../../../components/ui/textarea'
import { useToast } from '../../../../components/ui/toast'
import { Menu } from '../../../../components/ui/menu'

type Attendance = 'present' | 'absent' | 'justified'

export function AttendanceForm({
  sessionId,
  studentId,
  studentName,
  initialStatus,
  initialComment = '',
  disabled = false,
}: {
  sessionId: string
  studentId: string
  studentName: string
  initialStatus?: Attendance
  initialComment?: string
  disabled?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useOptimistic(initialStatus)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentState, setCommentState] = useState<{ ok: boolean; message: string } | null>(null)
  const [commentPending, startComment] = useTransition()
  const showToast = useToast()

  function mark(value: Attendance) {
    startTransition(async () => {
      setStatus(value)
      const data = new FormData()
      data.set('sessionId', sessionId)
      data.set('studentId', studentId)
      data.set('status', value)
      const result = await setAttendanceQuick(null, data)
      if (!result.ok) showToast(result.message, 'error')
      else showToast(result.message)
    })
  }

  function saveComment(data: FormData) {
    data.set('sessionId', sessionId)
    data.set('studentId', studentId)
    startComment(async () => {
      const result = await updateAttendance(null, data)
      setCommentState(result)
      if (result.ok) {
        showToast(result.message)
        setCommentOpen(false)
      }
    })
  }

  const options: { status: Attendance; label: string; icon: typeof Check; selected: string }[] = [
    {
      status: 'present',
      label: 'Presente',
      icon: UserRoundCheck,
      selected: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    },
    {
      status: 'absent',
      label: 'Ausente',
      icon: UserRoundX,
      selected: 'border-rose-300 bg-rose-50 text-rose-900',
    },
    {
      status: 'justified',
      label: 'Justificada',
      icon: BadgeCheck,
      selected: 'border-amber-300 bg-amber-50 text-amber-950',
    },
  ]

  return (
    <div className="flex min-w-0 items-center justify-end gap-1.5">
      <div
        role="group"
        aria-label={`Asistencia de ${studentName}`}
        className="flex flex-wrap justify-end gap-1"
      >
        {options.map(({ status: value, label, icon: Icon, selected }) => (
          <button
            key={value}
            type="button"
            aria-label={`Marcar a ${studentName} como ${label.toLocaleLowerCase('es')}`}
            aria-pressed={status === value}
            disabled={disabled || pending}
            onClick={() => mark(value)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50 sm:px-3 ${status === value ? selected : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <Icon size={15} aria-hidden="true" />
            <span className="hidden md:inline">{label}</span>
            {status === value ? <Check size={13} aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      {!disabled ? (
        <Menu
          label={`Opciones de comentario de ${studentName}`}
          items={[
            {
              label: initialComment ? 'Editar comentario' : 'Añadir comentario',
              onSelect: () => {
                setCommentState(null)
                setCommentOpen(true)
              },
              disabled: !status,
            },
          ]}
        />
      ) : null}
      <DialogContent
        open={commentOpen}
        onOpenChange={setCommentOpen}
        title={initialComment ? 'Editar comentario' : 'Comentario de asistencia'}
        description="El comentario se guarda en la asistencia actual."
      >
        <form action={saveComment} className="space-y-4 px-5 py-5 sm:px-6">
          <label
            htmlFor={`attendance-comment-${studentId}`}
            className="grid gap-1.5 text-sm font-medium text-slate-800"
          >
            Comentario{' '}
            <span className="text-xs font-normal text-slate-600">Opcional; déjalo vacío para quitarlo.</span>
          </label>
          <Textarea
            id={`attendance-comment-${studentId}`}
            name="comment"
            maxLength={300}
            defaultValue={initialComment}
            placeholder="Escribe un comentario…"
          />
          {commentState ? (
            <FormMessage tone={commentState.ok ? 'success' : 'error'}>{commentState.message}</FormMessage>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={() => setCommentOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={commentPending}>
              {commentPending ? 'Guardando…' : 'Guardar comentario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </div>
  )
}
