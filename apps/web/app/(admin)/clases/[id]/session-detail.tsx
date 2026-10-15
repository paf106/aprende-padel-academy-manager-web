'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MoreHorizontal, UserPlus } from 'lucide-react'
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
import { DeleteSessionButton } from './delete-session'
import { SessionStatusForm } from './status-form'
import { setSessionStatus, updateSessionRoster } from '../actions'
import type { ActionResult } from '../actions'

type DetailData = {
  session: { id: string; starts_at: string; ends_at: string; status: 'pending' | 'completed' | 'cancelled'; notes: string | null; cancellation_reason: string | null; club_id: string; teacher_id: string; category: 'adult' | 'child'; group_id: string | null }
  club: { name: string; municipality: string; timezone: string } | null
  teacher: { full_name: string } | null
  students: { id: string; first_name: string; last_name: string; attendance: { status: 'present' | 'absent' | 'justified'; comment: string | null } | null }[]
  studentIds: string[]; capacity: number; group: { name: string; capacity: number; level: string } | null; timeZone: string
}

export function SessionDetail({ detail, backHref, loadCandidates }: { detail: DetailData; backHref: string; loadCandidates: () => Promise<{ id: string; first_name: string; last_name: string }[]> }) {
  const { session, club, teacher, students, studentIds, capacity, group, timeZone } = detail
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unmarked'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [candidates, setCandidates] = useState<{ id: string; first_name: string; last_name: string }[] | null>(null)
  const [selected, setSelected] = useState<string[]>(studentIds)
  const [busy, startTransition] = useTransition()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelState, setCancelState] = useState<ActionResult | null>(null)
  const [cancelBusy, startCancel] = useTransition()
  const present = students.filter((student) => student.attendance?.status === 'present').length
  const absent = students.filter((student) => student.attendance?.status === 'absent').length
  const justified = students.filter((student) => student.attendance?.status === 'justified').length
  const visibleStudents = useMemo(() => filter === 'unmarked' ? students.filter((student) => !student.attendance) : students, [filter, students])
  const duration = Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000)
  const dateLabel = format(new Date(`${localDateInTimeZone(session.starts_at, timeZone)}T12:00:00`), 'EEEE d MMMM yyyy', { locale: es })
  async function openAdd() { setShowAdd(true); if (!candidates) setCandidates(await loadCandidates()) }
  function saveRoster() { startTransition(async () => { const form = new FormData(); form.set('sessionId', session.id); selected.forEach((id) => form.append('studentIds', id)); const result = await updateSessionRoster(null, form); if (result.ok) { setShowAdd(false); router.refresh() } }) }
  function submitCancel(formData: FormData) { formData.set('sessionId', session.id); formData.set('status', session.status === 'cancelled' ? 'pending' : 'cancelled'); startCancel(async () => { const result = await setSessionStatus(null, formData); setCancelState(result); if (result.ok) { setCancelOpen(false); router.refresh() } }) }

  return <div className="mx-auto w-full max-w-[1200px] px-4 pb-12 pt-5 sm:px-8">
    <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">← Volver al calendario</Link>
    <header className="mt-5 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center">
      <div className="min-w-0"><p className="mb-1 text-sm font-medium text-blue-700">{group ? `Grupo · ${group.name}` : 'Clase suelta'}</p><h1 className="text-3xl font-normal tracking-tight text-slate-900">{club?.name ?? 'Clase'}</h1><p className="mt-2 text-sm capitalize text-slate-600">{dateLabel} · {formatInClubTime(session.starts_at, timeZone, { timeOnly: true })}–{formatInClubTime(session.ends_at, timeZone, { timeOnly: true })} · {duration} min</p></div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge status={session.status}/>{session.status !== 'cancelled' ? <><SessionStatusForm sessionId={session.id} initialStatus={session.status}/><SessionEditForm sessionId={session.id} startsAt={session.starts_at} endsAt={session.ends_at} notes={session.notes ?? ''} timeZone={timeZone}/></> : null}<Menu items={[
        ...(session.status === 'pending' ? [{ label: 'Cancelar clase', onSelect: () => { setCancelState(null); setCancelOpen(true) } }] : []),
        ...(session.status === 'cancelled' ? [{ label: 'Reabrir clase', onSelect: () => { setCancelState(null); setCancelOpen(true) } }] : []),
      ]}><button type="button" onClick={() => router.push(backHref)} className="block min-h-9 w-full rounded-lg px-3 text-left text-sm hover:bg-slate-100">Volver al calendario</button><DeleteSessionButton sessionId={session.id} compact returnTo={backHref}/></Menu></div>
    </header>

    <section className="my-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4">
      <article className="grid gap-1 border-b border-slate-100 p-4 sm:border-r lg:border-b-0"><span className="text-xs text-slate-500">Profesor</span><strong className="text-sm font-medium">{teacher?.full_name ?? 'Sin asignar'}</strong></article>
      <article className="grid gap-1 border-b border-slate-100 p-4 lg:border-b-0 lg:border-r"><span className="text-xs text-slate-500">Club</span><strong className="text-sm font-medium">{club?.name ?? 'Sin asignar'}</strong><small className="text-xs text-slate-500">{club?.municipality}</small></article>
      <article className="grid gap-1 border-b border-slate-100 p-4 sm:border-r lg:border-b-0"><span className="text-xs text-slate-500">Categoría</span><strong className="text-sm font-medium">{session.category === 'adult' ? 'Adultos' : 'Infantil'}{group?.level ? ` · ${group.level}` : ''}</strong>{group ? <Link href="/grupos" className="text-xs font-medium text-blue-700">Grupo: {group.name}</Link> : null}</article>
      <article className="grid content-center gap-2 p-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">Ocupación</span><strong className="text-sm tabular-nums">{students.length}/{capacity}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Ocupación de la clase" aria-valuenow={students.length} aria-valuemin={0} aria-valuemax={capacity}><span className="block h-full rounded-full bg-blue-700" style={{ width: `${Math.min(100, students.length / capacity * 100)}%` }}/></div></article>
    </section>
    {session.cancellation_reason ? <aside className="mb-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><strong>Clase cancelada</strong><span>{session.cancellation_reason}</span></aside> : null}
    {session.notes ? <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4"><h2 className="font-semibold">Notas</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{session.notes}</p></section> : null}

    <section id="attendance" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:px-5"><div><h2 className="text-lg font-semibold">Alumnos</h2><p className="mt-1 text-xs text-slate-500">{present} presentes · {absent} ausentes · {justified} justificadas · {students.length - present - absent - justified} sin marcar</p></div>{session.status !== 'cancelled' ? <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" size="sm" onClick={openAdd}><UserPlus size={15}/> Añadir alumnos</Button><MarkAllPresentButton sessionId={session.id}/></div> : null}</div>
      <div className="flex gap-1 border-b border-slate-100 px-4 py-2"><button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === 'all' ? 'bg-blue-50 text-blue-800' : 'text-slate-500 hover:bg-slate-50'}`}>Todos ({students.length})</button><button type="button" aria-pressed={filter === 'unmarked'} onClick={() => setFilter('unmarked')} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === 'unmarked' ? 'bg-blue-50 text-blue-800' : 'text-slate-500 hover:bg-slate-50'}`}>Sin marcar ({students.length - present - absent - justified})</button></div>
      <div>{visibleStudents.map((student) => <article className="flex min-h-[68px] items-center gap-3 border-b border-slate-100 px-4 py-2 last:border-0 sm:px-5" key={student.id}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold uppercase text-slate-600">{student.first_name.slice(0,1)}{student.last_name.slice(0,1)}</span><div className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium">{student.first_name} {student.last_name}</strong><span className="text-xs text-slate-500">{student.attendance ? attendanceLabels[student.attendance.status] : 'Sin marcar'}</span>{student.attendance?.comment ? <small className="ml-2 text-xs text-slate-500">{student.attendance.comment}</small> : null}</div><AttendanceForm sessionId={session.id} studentId={student.id} initialStatus={student.attendance?.status} disabled={session.status === 'cancelled'}/></article>)}{!visibleStudents.length ? <p className="p-8 text-center text-sm text-slate-500">{students.length ? 'Todos los alumnos tienen la asistencia marcada.' : 'Aún no hay alumnos inscritos.'}</p> : null}</div>
    </section>
    <DialogContent open={showAdd} onOpenChange={setShowAdd} title="Añadir alumnos" description={`Selecciona alumnos. Aforo ${students.length}/${capacity}.`} footer={<><Button variant="secondary" onClick={() => setShowAdd(false)}>Cancelar</Button><Button disabled={busy || !candidates} onClick={saveRoster}>{busy ? 'Guardando…' : 'Guardar inscripciones'}</Button></>}>
      {candidates ? <StudentPicker students={[...students, ...candidates]} selected={selected} onChange={setSelected} capacity={capacity}/> : <p className="text-sm text-slate-500">Cargando alumnos…</p>}
    </DialogContent>
    <DialogContent open={cancelOpen} onOpenChange={setCancelOpen} title={session.status === 'cancelled' ? 'Reabrir clase' : 'Cancelar clase'} description={session.status === 'cancelled' ? 'La clase volverá al estado pendiente.' : 'Indica el motivo de cancelación.'}>
      <form action={submitCancel} className="space-y-4 px-5 py-5 sm:px-6">{session.status !== 'cancelled' ? <label className="block space-y-1.5 text-sm font-medium">Motivo<textarea name="reason" maxLength={300} required placeholder="Escribe el motivo…" className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label> : null}{cancelState ? <FormMessage tone={cancelState.ok ? 'success' : 'error'}>{cancelState.message}</FormMessage> : null}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={() => setCancelOpen(false)}>Volver</Button><Button variant={session.status === 'cancelled' ? 'default' : 'destructive'} disabled={cancelBusy}>{cancelBusy ? 'Guardando…' : session.status === 'cancelled' ? 'Reabrir clase' : 'Confirmar cancelación'}</Button></div></form>
    </DialogContent>
  </div>
}
