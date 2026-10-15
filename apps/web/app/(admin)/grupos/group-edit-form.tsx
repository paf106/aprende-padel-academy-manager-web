'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { StudentPicker } from '../../../components/ui/student-picker'
import { FormMessage } from '../../../components/ui/form-message'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { useToast } from '../../../components/ui/toast'
import { updateGroup } from './actions'
import type { ActionResult } from '../clases/actions'

type Group = { id: string; name: string; club_id: string; teacher_id: string; category: 'adult' | 'child'; level: 'iniciacion' | 'principiante' | 'medio' | 'avanzado' | 'competicion'; weekday: number; start_time: string; duration_minutes: number; capacity: number; starts_on: string; ends_on: string | null; members: string[] }
type Refs = { clubs: { id: string; name: string }[]; teachers: { id: string; full_name: string; clubs: string[] }[]; students: { id: string; first_name: string; last_name: string; club_id: string; category: 'adult' | 'child' }[] }

export function GroupEditForm({ group, refs }: { group: Group; refs: Refs }) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, start] = useTransition()
  const [selected, setSelected] = useState(group.members)
  const showToast = useToast()
  const teacherOptions = refs.teachers.filter((teacher) => teacher.clubs.includes(group.club_id))
  const students = refs.students.filter((student) => student.club_id === group.club_id && student.category === group.category)
  async function submit(form: FormData) {
    form.set('groupId', group.id); form.set('clubId', group.club_id); form.set('category', group.category)
    start(async () => { const result = await updateGroup(null, form); setState(result); if (result.ok) { showToast(result.message); setOpen(false) } })
  }
  return <>
    <Button size="sm" variant="secondary" onClick={() => { setState(null); setSelected(group.members); setOpen(true) }}>Editar</Button>
    <DialogContent open={open} onOpenChange={setOpen} title="Editar grupo" description="Actualiza horario, aforo y alumnado del grupo.">
      <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">Nombre<input name="name" defaultValue={group.name} required maxLength={100} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-slate-700">Club<select defaultValue={group.club_id} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5">{refs.clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Categoría<select defaultValue={group.category} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5"><option value="adult">Adultos</option><option value="child">Infantil</option></select></label></div>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">Profesor<select name="teacherId" defaultValue={group.teacher_id} required className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{teacherOptions.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-slate-700">Nivel<select name="level" defaultValue={group.level} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{[['iniciacion','Iniciación'],['principiante','Principiante'],['medio','Medio'],['avanzado','Avanzado'],['competicion','Competición']].map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Día<select name="weekday" defaultValue={String(group.weekday)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((day,index)=><option value={index} key={day}>{day}</option>)}</select></label></div>
        <div className="grid gap-3 sm:grid-cols-3"><label className="space-y-1.5 text-sm font-medium text-slate-700">Hora<input name="startTime" type="time" defaultValue={group.start_time.slice(0,5)} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Duración<select name="duration" defaultValue={String(group.duration_minutes)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5"><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Aforo<input name="capacity" type="number" min="1" max="16" defaultValue={group.capacity} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium text-slate-700">Desde<input name="startsOn" type="date" defaultValue={group.starts_on} required className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="space-y-1.5 text-sm font-medium text-slate-700">Hasta (opcional)<input name="endsOn" type="date" defaultValue={group.ends_on ?? ''} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label></div>
        <StudentPicker students={students} selected={selected} onChange={setSelected} capacity={group.capacity}/>
        {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
      </form>
    </DialogContent>
  </>
}
