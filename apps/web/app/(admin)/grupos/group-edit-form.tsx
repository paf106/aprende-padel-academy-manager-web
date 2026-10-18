'use client'

import { useState, useTransition } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { StudentPicker, type PickableStudent } from '../../../components/ui/student-picker'
import { FormMessage } from '../../../components/ui/form-message'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { useToast } from '../../../components/ui/toast'
import { getGroupStudentOptions, updateGroup } from './actions'
import type { ActionResult } from '../../lib/action-result'

type Group = {
  id: string
  name: string
  club_id: string
  teacher_id: string
  category: 'adult' | 'child'
  level: 'iniciacion' | 'principiante' | 'medio' | 'avanzado' | 'competicion'
  weekday: number
  start_time: string
  duration_minutes: number
  capacity: number
  starts_on: string
  ends_on: string | null
  members: string[]
}
type Refs = {
  clubs: { id: string; name: string }[]
  teachers: { id: string; full_name: string; clubs: string[] }[]
}

export function GroupEditForm({ group, refs }: { group: Group; refs: Refs }) {
  const [state, setState] = useState<ActionResult | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, start] = useTransition()
  const [selected, setSelected] = useState(group.members)
  const [capacity, setCapacity] = useState(group.capacity)
  const [students, setStudents] = useState<PickableStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const showToast = useToast()
  const teacherOptions = refs.teachers.filter((teacher) => teacher.clubs.includes(group.club_id))
  async function openDialog() {
    setState(null)
    setSelected(group.members)
    setCapacity(group.capacity)
    setOpen(true)
    setStudentsLoading(true)
    try {
      setStudents(await getGroupStudentOptions(group.club_id, group.category))
    } finally {
      setStudentsLoading(false)
    }
  }
  async function submit(form: FormData) {
    form.set('groupId', group.id)
    form.set('clubId', group.club_id)
    form.set('category', group.category)
    start(async () => {
      const result = await updateGroup(null, form)
      setState(result)
      if (result.ok) {
        showToast(result.message)
        setOpen(false)
      }
    })
  }
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          void openDialog()
        }}
      >
        Editar
      </Button>
      <DialogContent
        open={open}
        onOpenChange={setOpen}
        title="Editar grupo"
        description="Actualiza horario, aforo y alumnado del grupo."
      >
        <form action={submit} className="space-y-4 px-5 py-5 sm:px-6">
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Nombre
            <Input name="name" defaultValue={group.name} required maxLength={100} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Club
              <Select defaultValue={group.club_id} disabled>
                {refs.clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Categoría
              <Select defaultValue={group.category} disabled>
                <option value="adult">Adultos</option>
                <option value="child">Infantil</option>
              </Select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Profesor
            <Select name="teacherId" defaultValue={group.teacher_id} required>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Nivel
              <Select name="level" defaultValue={group.level}>
                {[
                  ['iniciacion', 'Iniciación'],
                  ['principiante', 'Principiante'],
                  ['medio', 'Medio'],
                  ['avanzado', 'Avanzado'],
                  ['competicion', 'Competición'],
                ].map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Día
              <Select name="weekday" defaultValue={String(group.weekday)}>
                {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(
                  (day, index) => (
                    <option value={index} key={day}>
                      {day}
                    </option>
                  ),
                )}
              </Select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Hora
              <Input name="startTime" type="time" defaultValue={group.start_time.slice(0, 5)} required />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Duración
              <Select name="duration" defaultValue={String(group.duration_minutes)}>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
              </Select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Aforo
              <Input
                name="capacity"
                type="number"
                min="1"
                max="16"
                value={capacity}
                onChange={(event) => setCapacity(Number(event.target.value))}
                required
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Desde
              <Input name="startsOn" type="date" defaultValue={group.starts_on} required />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Hasta (opcional)
              <Input name="endsOn" type="date" defaultValue={group.ends_on ?? ''} />
            </label>
          </div>
          {studentsLoading ? (
            <p role="status" className="text-sm text-slate-600">
              Cargando alumnos…
            </p>
          ) : (
            <StudentPicker
              students={students}
              selected={selected}
              onChange={setSelected}
              capacity={capacity}
            />
          )}
          {state ? <FormMessage tone={state.ok ? 'success' : 'error'}>{state.message}</FormMessage> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy || studentsLoading}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </>
  )
}
