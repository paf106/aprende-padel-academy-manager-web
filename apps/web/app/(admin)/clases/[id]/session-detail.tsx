'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
import { formatInClubTime, statusLabels, attendanceLabels, localDateInTimeZone } from '@aprende-padel/core'
import { Button } from '../../../../components/ui/button'
import { StatusBadge } from '../../../../components/ui/status-badge'
import { FormMessage } from '../../../../components/ui/form-message'
import { StudentPicker } from '../../../../components/ui/student-picker'
import { DialogContent } from '../../../../components/ui/dialog-shell'
import { Menu } from '../../../../components/ui/menu'
import { AttendanceForm } from './attendance-form'
import { SessionEditForm } from './session-edit-form'
import { MarkAllPresentButton } from './mark-all-present'
import { SessionStatusForm } from './status-form'
import { deleteSession, setSessionStatus, updateSessionRoster } from '../actions'
import type { ActionResult } from '../../../lib/action-result'
import { useToast } from '../../../../components/ui/toast'
import { Textarea } from '../../../../components/ui/textarea'

const countLabel = (count: number, singular: string, plural: string) =>
  `${new Intl.NumberFormat('es-ES').format(count)} ${count === 1 ? singular : plural}`

type DetailData = {
  session: {
    id: string
    starts_at: string
    ends_at: string
    status: 'pending' | 'completed' | 'cancelled'
    notes: string | null
    cancellation_reason: string | null
    club_id: string
    teacher_id: string
    category: 'adult' | 'child'
    group_id: string | null
  }
  club: { name: string; municipality: string; timezone: string } | null
  teacher: { full_name: string } | null
  students: {
    id: string
    first_name: string
    last_name: string
    attendance: { status: 'present' | 'absent' | 'justified'; comment: string | null } | null
  }[]
  studentIds: string[]
  capacity: number
  group: { name: string; capacity: number; level: string } | null
  timeZone: string
  previousSessionId: string | null
  nextSessionId: string | null
}

export function SessionDetail({
  detail,
  backHref,
  loadCandidates,
}: {
  detail: DetailData
  backHref: string
  loadCandidates: () => Promise<{ id: string; first_name: string; last_name: string }[]>
}) {
  const {
    session,
    club,
    teacher,
    students,
    studentIds,
    capacity,
    group,
    timeZone,
    previousSessionId,
    nextSessionId,
  } = detail
  const router = useRouter()
  const showToast = useToast()
  const [filter, setFilter] = useState<'all' | 'unmarked'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [candidates, setCandidates] = useState<
    { id: string; first_name: string; last_name: string }[] | null
  >(null)
  const [candidateError, setCandidateError] = useState('')
  const [selected, setSelected] = useState<string[]>(studentIds)
  const [busy, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelState, setCancelState] = useState<ActionResult | null>(null)
  const [cancelBusy, startCancel] = useTransition()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteState, setDeleteState] = useState<ActionResult | null>(null)
  const [deleteBusy, startDelete] = useTransition()
  const present = students.filter((student) => student.attendance?.status === 'present').length
  const absent = students.filter((student) => student.attendance?.status === 'absent').length
  const justified = students.filter((student) => student.attendance?.status === 'justified').length
  const visibleStudents = useMemo(
    () => (filter === 'unmarked' ? students.filter((student) => !student.attendance) : students),
    [filter, students],
  )
  const duration = Math.round(
    (new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000,
  )
  const safeCapacity = Math.max(1, capacity)
  const dateLabel = format(
    new Date(`${localDateInTimeZone(session.starts_at, timeZone)}T12:00:00`),
    'EEEE d MMMM yyyy',
    { locale: es },
  )
  const detailHref = (id: string) =>
    `/clases/${id}${backHref.includes('?') ? `?${backHref.split('?')[1]}` : ''}`
  async function openAdd() {
    setShowAdd(true)
    setSelected(studentIds)
    setCandidates(null)
    setCandidateError('')
    try {
      setCandidates(await loadCandidates())
    } catch {
      setCandidateError(
        'No se pudo cargar el alumnado. Cierra y vuelve a abrir este diálogo para intentarlo de nuevo.',
      )
    }
  }
  function saveRoster() {
    startTransition(async () => {
      const form = new FormData()
      form.set('sessionId', session.id)
      selected.forEach((id) => form.append('studentIds', id))
      const result = await updateSessionRoster(null, form)
      if (result.ok) {
        showToast(result.message)
        setShowAdd(false)
        router.refresh()
      }
    })
  }
  function submitCancel(formData: FormData) {
    formData.set('sessionId', session.id)
    formData.set('status', session.status === 'cancelled' ? 'pending' : 'cancelled')
    startCancel(async () => {
      const result = await setSessionStatus(null, formData)
      setCancelState(result)
      if (result.ok) {
        showToast(result.message)
        setCancelOpen(false)
      }
    })
  }

  function confirmDelete() {
    startDelete(async () => {
      const result = await deleteSession(session.id)
      setDeleteState(result)
      if (result.ok) {
        showToast(result.message)
        setDeleteOpen(false)
        router.push(backHref)
        router.refresh()
      } else showToast(result.message, 'error')
    })
  }

  const rosterOptions = useMemo(() => {
    const unique = new Map<string, { id: string; first_name: string; last_name: string }>()
    for (const student of students) unique.set(student.id, student)
    for (const student of candidates ?? []) unique.set(student.id, student)
    return [...unique.values()]
  }, [students, candidates])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft size={17} aria-hidden="true" /> Volver al calendario
        </Link>
        <nav aria-label="Navegar entre clases del club" className="flex gap-1">
          {previousSessionId ? (
            <Link
              href={detailHref(previousSessionId)}
              aria-label="Clase anterior del club"
              title="Clase anterior"
              className="grid size-11 place-items-center rounded-full text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </Link>
          ) : null}
          {nextSessionId ? (
            <Link
              href={detailHref(nextSessionId)}
              aria-label="Siguiente clase del club"
              title="Siguiente clase"
              className="grid size-11 place-items-center rounded-full text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      </div>
      <header className="mt-5 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <h1 className="text-balance break-words text-3xl font-semibold tracking-tight text-slate-900">
            {group?.name ?? club?.name ?? 'Clase suelta'}
          </h1>
          <p className="mt-2 text-sm capitalize text-slate-700">
            {club?.name ? `${club.name} · ` : ''}
            {dateLabel} · {formatInClubTime(session.starts_at, timeZone, { timeOnly: true })} –
            {formatInClubTime(session.ends_at, timeZone, { timeOnly: true })} · {duration} min
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={session.status} />
          {session.status !== 'cancelled' ? (
            <>
              <SessionStatusForm sessionId={session.id} initialStatus={session.status} />
              <SessionEditForm
                sessionId={session.id}
                startsAt={session.starts_at}
                endsAt={session.ends_at}
                notes={session.notes ?? ''}
                timeZone={timeZone}
              />
            </>
          ) : null}
          <Menu
            label="Más acciones de la clase"
            items={[
              ...(session.status === 'pending'
                ? [
                    {
                      label: 'Cancelar clase',
                      onSelect: () => {
                        setCancelState(null)
                        setCancelOpen(true)
                      },
                    },
                  ]
                : []),
              ...(session.status === 'cancelled'
                ? [
                    {
                      label: 'Reabrir clase',
                      onSelect: () => {
                        setCancelState(null)
                        setCancelOpen(true)
                      },
                    },
                  ]
                : []),
              {
                label: 'Eliminar clase',
                destructive: true,
                onSelect: () => {
                  setDeleteState(null)
                  setDeleteOpen(true)
                },
              },
            ]}
          />
        </div>
      </header>

      <section className="my-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4">
        <article className="grid gap-1 border-b border-slate-100 p-4 sm:border-r lg:border-b-0">
          <span className="text-xs text-slate-500">Profesor</span>
          <strong className="text-sm font-medium">{teacher?.full_name ?? 'Sin asignar'}</strong>
        </article>
        <article className="grid gap-1 border-b border-slate-100 p-4 lg:border-b-0 lg:border-r">
          <span className="text-xs text-slate-500">Club</span>
          <strong className="text-sm font-medium">{club?.name ?? 'Sin asignar'}</strong>
          <small className="text-xs text-slate-500">{club?.municipality}</small>
        </article>
        <article className="grid gap-1 border-b border-slate-100 p-4 sm:border-r lg:border-b-0">
          <span className="text-xs text-slate-600">Categoría</span>
          <strong className="text-sm font-medium">
            {session.category === 'adult' ? 'Adultos' : 'Infantil'}
            {group?.level ? ` · ${group.level}` : ''}
          </strong>
          {group ? (
            <Link
              href={`/grupos#${session.group_id}`}
              className="text-xs font-medium text-brand hover:underline"
            >
              Grupo: {group.name}
            </Link>
          ) : null}
        </article>
        <article className="grid content-center gap-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">Ocupación</span>
            <strong className="text-sm tabular-nums">
              {students.length}/{capacity}
            </strong>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Ocupación de la clase"
            aria-valuenow={Math.min(students.length, safeCapacity)}
            aria-valuemin={0}
            aria-valuemax={safeCapacity}
          >
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, (students.length / safeCapacity) * 100)}%` }}
            />
          </div>
        </article>
      </section>
      {session.cancellation_reason ? (
        <aside
          role="status"
          className="mb-4 flex gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"
        >
          <strong className="shrink-0">Clase cancelada</strong>
          <span className="break-words">{session.cancellation_reason}</span>
        </aside>
      ) : null}
      {session.notes ? (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Notas</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{session.notes}</p>
        </section>
      ) : null}

      <section id="attendance" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:px-5">
          <div>
            <h2 className="text-lg font-semibold">Alumnos</h2>
            <p className="mt-1 text-xs text-slate-500">
              {countLabel(present, 'presente', 'presentes')} · {countLabel(absent, 'ausente', 'ausentes')} ·{' '}
              {countLabel(justified, 'justificada', 'justificadas')} ·{' '}
              {countLabel(students.length - present - absent - justified, 'sin marcar', 'sin marcar')}
            </p>
          </div>
          {session.status !== 'cancelled' ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={openAdd}>
                <UserPlus size={16} aria-hidden="true" /> Añadir alumnos
              </Button>
              <MarkAllPresentButton sessionId={session.id} />
            </div>
          ) : null}
        </div>
        <div className="flex gap-1 border-b border-slate-100 px-4 py-2">
          <button
            type="button"
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${filter === 'all' ? 'bg-emerald-50 text-brand' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Todos ({students.length})
          </button>
          <button
            type="button"
            aria-pressed={filter === 'unmarked'}
            onClick={() => setFilter('unmarked')}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium ${filter === 'unmarked' ? 'bg-emerald-50 text-brand' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Sin marcar ({students.length - present - absent - justified})
          </button>
        </div>
        <div>
          {visibleStudents.map((student) => (
            <article
              className="flex min-h-[68px] items-center gap-3 border-b border-slate-100 px-4 py-2 last:border-0 sm:px-5"
              key={student.id}
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold uppercase text-slate-700"
              >
                {student.first_name.slice(0, 1)}
                {student.last_name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-medium">
                  {student.first_name} {student.last_name}
                </strong>
                <span className="text-xs text-slate-600">
                  {student.attendance ? attendanceLabels[student.attendance.status] : 'Sin marcar'}
                </span>
                {student.attendance?.comment ? (
                  <small className="ml-2 break-words text-xs text-slate-700">
                    {student.attendance.comment}
                  </small>
                ) : null}
              </div>
              <AttendanceForm
                sessionId={session.id}
                studentId={student.id}
                studentName={`${student.first_name} ${student.last_name}`}
                initialStatus={student.attendance?.status}
                initialComment={student.attendance?.comment ?? ''}
                disabled={session.status === 'cancelled'}
              />
            </article>
          ))}
          {!visibleStudents.length ? (
            <p className="p-8 text-center text-sm text-slate-600">
              {students.length
                ? 'Todos los alumnos tienen la asistencia marcada.'
                : 'Aún no hay alumnos inscritos.'}
            </p>
          ) : null}
        </div>
      </section>
      <DialogContent
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open)
          if (!open) setSelected(studentIds)
        }}
        title="Añadir alumnos"
        description={`Selecciona alumnos. Aforo ${students.length}/${capacity}.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy || !candidates || Boolean(candidateError)}
              onClick={saveRoster}
            >
              {busy ? 'Guardando…' : 'Guardar inscripciones'}
            </Button>
          </>
        }
      >
        <div className="px-5 py-5 sm:px-6">
          {candidateError ? (
            <FormMessage>{candidateError}</FormMessage>
          ) : candidates ? (
            <StudentPicker
              students={rosterOptions}
              selected={selected}
              onChange={setSelected}
              capacity={capacity}
            />
          ) : (
            <p role="status" className="text-sm text-slate-600">
              Cargando alumnos…
            </p>
          )}
        </div>
      </DialogContent>
      <DialogContent
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar esta clase?"
        description="Se borrarán las inscripciones y asistencias. Las clases incluidas en liquidaciones no se pueden eliminar."
      >
        <div className="space-y-4 px-5 py-5 sm:px-6">
          {deleteState && !deleteState.ok ? <FormMessage>{deleteState.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" type="button" disabled={deleteBusy} onClick={confirmDelete}>
              {deleteBusy ? 'Eliminando…' : 'Eliminar clase'}
            </Button>
          </div>
        </div>
      </DialogContent>
      <DialogContent
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={session.status === 'cancelled' ? 'Reabrir clase' : 'Cancelar clase'}
        description={
          session.status === 'cancelled'
            ? 'La clase volverá al estado pendiente.'
            : 'Indica el motivo de cancelación.'
        }
      >
        <form action={submitCancel} className="space-y-4 px-5 py-5 sm:px-6">
          {session.status !== 'cancelled' ? (
            <label className="block space-y-1.5 text-sm font-medium">
              Motivo
              <Textarea name="reason" maxLength={300} required placeholder="Escribe el motivo…" />
            </label>
          ) : null}
          {cancelState ? (
            <FormMessage tone={cancelState.ok ? 'success' : 'error'}>{cancelState.message}</FormMessage>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCancelOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={session.status === 'cancelled' ? 'default' : 'destructive'}
              disabled={cancelBusy}
            >
              {cancelBusy
                ? 'Guardando…'
                : session.status === 'cancelled'
                  ? 'Reabrir clase'
                  : 'Confirmar cancelación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </div>
  )
}
