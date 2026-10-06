'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useMemo, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createSession, generateFromGroup } from './actions'
import type { ActionResult } from './actions'

type RefData = {
  clubs: { id: string; name: string }[]
  teachers: { id: string; full_name: string }[]
  students: { id: string; first_name: string; last_name: string; club_id: string; category: 'adult' | 'child' }[]
  groups: { id: string; name: string; club_id: string; teacher_id: string; capacity: number; category: 'adult' | 'child' }[]
}
const initialActionState: ActionResult | null = null

export function ClassesClient({ refs }: { refs: RefData }) {
  const [createState, setCreateState] = useState<ActionResult|null>(initialActionState)
  const [generateState, setGenerateState] = useState<ActionResult|null>(initialActionState)
  const [createBusy,startCreate]=useTransition()
  const [generateBusy,startGenerate]=useTransition()
  const [clubId, setClubId] = useState('')
  const [category, setCategory] = useState<'adult' | 'child'>('adult')
  const [students, setStudents] = useState<string[]>([])
  const [sessionOpen, setSessionOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const availableStudents = useMemo(() => refs.students.filter((student) => student.club_id === clubId && student.category === category), [refs.students, clubId, category])
  const teachers = useMemo(() => refs.teachers, [refs.teachers])
  async function submitCreate(formData:FormData){startCreate(async()=>{const result=await createSession(null,formData);setCreateState(result);if(result.ok){setSessionOpen(false);setStudents([]);setClubId('')}})}
  async function submitGenerate(formData:FormData){startGenerate(async()=>{const result=await generateFromGroup(null,formData);setGenerateState(result);if(result.ok)setGroupOpen(false)})}

  return <div className="class-actions">
    <Dialog.Root open={sessionOpen} onOpenChange={setSessionOpen}>
      <Dialog.Trigger asChild><button className="primary-button">+ Nueva clase</button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="modal" aria-describedby="session-description">
        <div className="modal-head"><div><p className="eyebrow">Sesión puntual</p><Dialog.Title className="dialog-title">Nueva clase</Dialog.Title><Dialog.Description id="session-description" className="field-help">Asigna club, categoría, profesor y alumnos.</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Cerrar"><X size={18} /></button></Dialog.Close></div>
        <form action={submitCreate} className="form-stack">
          <label>Club<select name="clubId" required value={clubId} onChange={(event) => { setClubId(event.target.value); setStudents([]) }}><option value="">Selecciona un club</option>{refs.clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label>
          <label>Categoría<select name="category" value={category} onChange={(event) => { setCategory(event.target.value as 'adult' | 'child'); setStudents([]) }}><option value="adult">Adultos</option><option value="child">Infantil</option></select></label>
          <label>Profesor<select name="teacherId" required defaultValue=""><option value="">Selecciona un profesor</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></label>
          <div className="form-row"><label>Fecha<input name="date" type="date" required /></label><label>Hora<input name="time" type="time" required /></label><label>Duración<select name="duration" defaultValue="60"><option value="60">60 min</option><option value="90">90 min</option><option value="120">120 min</option></select></label></div>
          <fieldset className="student-fieldset"><legend>Alumnos <span className="field-help">({students.length})</span></legend><div className="student-picker">{availableStudents.map((student) => <label className="check-row" key={student.id}><input type="checkbox" name="studentIds" value={student.id} checked={students.includes(student.id)} onChange={(event) => setStudents((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} /><span>{student.first_name} {student.last_name}</span></label>)}</div>{clubId && availableStudents.length === 0 ? <span className="field-help">No hay alumnos de esta categoría en el club.</span> : null}</fieldset>
          <label>Notas<textarea name="notes" rows={3} maxLength={500} placeholder="Información útil para la clase" /></label>
          {createState ? <p className={createState.ok ? 'form-message success' : 'form-message error'} role="status">{createState.message}</p> : null}
          <div className="modal-actions"><Dialog.Close asChild><button type="button" className="secondary-button">Cancelar</button></Dialog.Close><button className="primary-button" disabled={createBusy}>{createBusy ? 'Creando…' : 'Crear clase'}</button></div>
        </form>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
    <Dialog.Root open={groupOpen} onOpenChange={setGroupOpen}>
      <Dialog.Trigger asChild><button className="secondary-button">Generar desde grupo</button></Dialog.Trigger>
      <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="modal" aria-describedby="group-description">
        <div className="modal-head"><div><p className="eyebrow">Calendario recurrente</p><Dialog.Title className="dialog-title">Generar sesiones</Dialog.Title><Dialog.Description id="group-description" className="field-help">Se crearán solo las fechas del día semanal del grupo, sin duplicar existentes.</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Cerrar"><X size={18} /></button></Dialog.Close></div>
        <form action={submitGenerate} className="form-stack"><label>Grupo<select name="groupId" required defaultValue=""><option value="">Selecciona un grupo</option>{refs.groups.map((group) => <option key={group.id} value={group.id}>{group.name} · {refs.clubs.find((club) => club.id === group.club_id)?.name}</option>)}</select></label><div className="form-row"><label>Desde<input name="start" type="date" required /></label><label>Hasta<input name="end" type="date" required /></label></div><p className="field-help">El rango máximo de generación es de 12 meses.</p>{generateState ? <p className={generateState.ok ? 'form-message success' : 'form-message error'} role="status">{generateState.message}</p> : null}<div className="modal-actions"><Dialog.Close asChild><button type="button" className="secondary-button">Cancelar</button></Dialog.Close><button className="primary-button" disabled={generateBusy}>{generateBusy ? 'Generando…' : 'Generar sesiones'}</button></div></form>
      </Dialog.Content></Dialog.Portal>
    </Dialog.Root>
  </div>
}
