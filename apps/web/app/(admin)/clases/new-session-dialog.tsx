'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X } from 'lucide-react'
import { createSession, generateFromGroup, getClassDialogData } from './actions'
import type { ActionResult } from './actions'
import { Button } from '../../../components/ui/button'
import { FormMessage } from '../../../components/ui/form-message'
import { StudentPicker } from '../../../components/ui/student-picker'

type RefData = { clubs: { id: string; name: string }[]; teachers: { id: string; full_name: string; club_ids: string[] }[] }
type DialogData = { students: { id: string; first_name: string; last_name: string; club_id: string; category: 'adult' | 'child' }[]; groups: { id: string; name: string; club_id: string; teacher_id: string; capacity: number; category: 'adult' | 'child' }[] }

function NativeDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; if (open && dialog && !dialog.open) dialog.showModal(); else if (!open && dialog?.open) dialog.close() }, [open])
  return <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose() }} className="m-auto max-h-[min(92dvh,850px)] w-[min(94vw,620px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40">
    <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4"><h2 className="text-lg font-semibold">{title}</h2><button type="button" aria-label="Cerrar" onClick={onClose} className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18}/></button></header>
    <div className="space-y-4 p-5">{children}</div>
  </dialog>
}

export function NewSessionDialog({ refs }: { refs: RefData }) {
  const router = useRouter()
  const search = useSearchParams()
  const [dialogData, setDialogData] = useState<DialogData | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [clubId, setClubId] = useState('')
  const [category, setCategory] = useState<'adult' | 'child'>('adult')
  const [students, setStudents] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [createResult, setCreateResult] = useState<ActionResult | null>(null)
  const [groupResult, setGroupResult] = useState<ActionResult | null>(null)
  const [createBusy, startCreate] = useTransition()
  const [groupBusy, startGroup] = useTransition()
  const slotKey = useRef('')
  const searchString = search.toString()
  const studentOptions = useMemo(() => (dialogData?.students ?? []).filter((student) => student.club_id === clubId && student.category === category), [dialogData, clubId, category])
  const teacherOptions = useMemo(() => refs.teachers.filter((teacher) => !clubId || teacher.club_ids.includes(clubId)), [refs.teachers, clubId])

  const loadData = useCallback(async () => { if (dialogData || loading) return; setLoading(true); try { setDialogData(await getClassDialogData()) } finally { setLoading(false) } }, [dialogData, loading])
  useEffect(() => {
    const params = new URLSearchParams(searchString)
    const requestedDate = params.get('newDate')
    const requestedTime = params.get('newTime')
    if (!requestedDate || !requestedTime) { slotKey.current = ''; return }
    const key = `${requestedDate}-${requestedTime}`
    if (key === slotKey.current) return
    const timer = window.setTimeout(() => { slotKey.current = key; setDate(requestedDate); setTime(requestedTime); setCreateResult(null); setOpen(true); void loadData() }, 0)
    return () => window.clearTimeout(timer)
  }, [searchString, loadData])
  const closeCreate = useCallback(() => { setOpen(false); slotKey.current = ''; const params = new URLSearchParams(searchString); params.delete('newDate'); params.delete('newTime'); const query = params.toString(); router.replace(query ? `/clases?${query}` : '/clases', { scroll: false }) }, [router, searchString])
  const submitCreate = useCallback((form: FormData) => { startCreate(async () => { const result = await createSession(null, form); setCreateResult(result); if (result.ok) closeCreate() }) }, [startCreate, closeCreate])
  const submitGroup = useCallback((form: FormData) => { startGroup(async () => { const result = await generateFromGroup(null, form); setGroupResult(result); if (result.ok) setGroupOpen(false) }) }, [startGroup])

  return <div className="relative flex items-center gap-2">
    <button type="button" onClick={() => { setDate(''); setTime('18:00'); setOpen(true); setCreateResult(null); void loadData() }} className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-700 px-5 text-sm font-medium text-white shadow-sm hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">+ Nueva clase</button>
    <button type="button" onClick={() => { setGroupOpen(true); setGroupResult(null); void loadData() }} className="hidden h-10 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:inline-flex">Generar desde grupo</button>
    <NativeDialog open={open} onClose={closeCreate} title="Nueva clase"><form action={submitCreate} className="space-y-4">
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Club<select name="clubId" required value={clubId} onChange={(event) => { setClubId(event.target.value); setStudents([]) }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Selecciona un club</option>{refs.clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Categoría<select name="category" value={category} onChange={(event) => { setCategory(event.target.value as 'adult' | 'child'); setStudents([]) }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="adult">Adultos</option><option value="child">Infantil</option></select></label>
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Profesor<select name="teacherId" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Selecciona un profesor</option>{teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-3"><label className="space-y-1.5 text-sm font-medium text-slate-700">Fecha<input name="date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Hora<input name="time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Duración<select name="duration" defaultValue="60" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label></div>
      {loading ? <p className="text-sm text-slate-500">Cargando alumnos…</p> : <StudentPicker students={studentOptions} selected={students} onChange={setStudents}/>}
      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Notas<textarea name="notes" rows={2} maxLength={500} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
      {createResult ? <FormMessage tone={createResult.ok ? 'success' : 'error'}>{createResult.message}</FormMessage> : null}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={closeCreate}>Cancelar</Button><Button disabled={createBusy}>{createBusy ? 'Creando…' : 'Crear clase'}</Button></div>
    </form></NativeDialog>
    <NativeDialog open={groupOpen} onClose={() => setGroupOpen(false)} title="Generar sesiones"><form action={submitGroup} className="space-y-4"><label className="block space-y-1.5 text-sm font-medium">Grupo<select name="groupId" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">{loading ? 'Cargando grupos…' : 'Selecciona un grupo'}</option>{(dialogData?.groups ?? []).map((group) => <option key={group.id} value={group.id}>{group.name} · {refs.clubs.find((club) => club.id === group.club_id)?.name}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Desde<input name="start" type="date" required className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="space-y-1.5 text-sm font-medium">Hasta<input name="end" type="date" required className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label></div><p className="text-xs text-slate-500">El rango máximo de generación es de 12 meses.</p>{groupResult ? <FormMessage tone={groupResult.ok ? 'success' : 'error'}>{groupResult.message}</FormMessage> : null}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button variant="secondary" type="button" onClick={() => setGroupOpen(false)}>Cancelar</Button><Button disabled={groupBusy || loading}>{groupBusy ? 'Generando…' : 'Generar sesiones'}</Button></div></form></NativeDialog>
  </div>
}
