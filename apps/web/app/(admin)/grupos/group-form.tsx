'use client'

import { useMemo, useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { StudentPicker } from '../../../components/ui/student-picker'
import { FormMessage } from '../../../components/ui/form-message'
import { useToast } from '../../../components/ui/toast'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { createGroup } from './actions'
import type { ActionResult } from '../clases/actions'

type Props = { clubs: { id: string; name: string }[]; teachers: { id: string; full_name: string; clubs: string[] }[]; students: { id: string; first_name: string; last_name: string; club_id: string; category: 'adult' | 'child' }[] }
export function GroupForm({ clubs, teachers, students }: Props) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [busy, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [clubId, setClubId] = useState('')
  const [category, setCategory] = useState<'adult' | 'child'>('adult')
  const [selected, setSelected] = useState<string[]>([])
  const showToast = useToast()
  const teacherChoices = teachers.filter((teacher) => teacher.clubs.includes(clubId))
  const studentChoices = useMemo(() => students.filter((student) => student.club_id === clubId && student.category === category), [students, clubId, category])
  async function submit(form: FormData) { start(async () => { const result = await createGroup(null, form); setState(result); if (result.ok) { showToast(result.message); setOpen(false); setSelected([]) } }) }
  return <>
    <Button onClick={() => { setOpen(true); setState(null) }}>Nuevo grupo</Button>
    <DialogContent open={open} onOpenChange={setOpen} title="Crear grupo" description="Define el horario semanal y el alumnado inscrito.">
      <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">Nombre<input name="name" required maxLength={100} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-slate-700">Club<select name="clubId" required value={clubId} onChange={(event) => { setClubId(event.target.value); setSelected([]) }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Selecciona un club</option>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Categoría<select name="category" value={category} onChange={(event) => { setCategory(event.target.value as 'adult' | 'child'); setSelected([]) }} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="adult">Adultos</option><option value="child">Infantil</option></select></label></div>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">Profesor<select name="teacherId" required defaultValue="" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="">Selecciona un profesor</option>{teacherChoices.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-slate-700">Nivel<select name="level" defaultValue="iniciacion" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{[['iniciacion','Iniciación'],['principiante','Principiante'],['medio','Medio'],['avanzado','Avanzado'],['competicion','Competición']].map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Día<select name="weekday" defaultValue="1" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label></div>
        <div className="grid gap-3 sm:grid-cols-3"><label className="space-y-1.5 text-sm font-medium text-slate-700">Hora<input name="startTime" type="time" required defaultValue="18:00" className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Duración<select name="duration" defaultValue="60" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Aforo<input name="capacity" type="number" min="1" max="16" defaultValue="8" required className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-slate-700">Desde<input name="startsOn" type="date" required className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Hasta (opcional)<input name="endsOn" type="date" className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label></div>
        {clubId ? <StudentPicker students={studentChoices} selected={selected} onChange={setSelected}/> : <p className="text-sm text-slate-500">Selecciona un club para ver alumnos disponibles.</p>}
        {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Crear grupo'}</Button></div>
      </form>
    </DialogContent>
  </>
}
