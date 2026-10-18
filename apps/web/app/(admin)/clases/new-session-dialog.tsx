'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createSession, generateFromGroup, getClassDialogData, getStudentsForSessionForm } from './actions'
import type { ActionResult } from '../../lib/action-result'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { FormMessage } from '../../../components/ui/form-message'
import { StudentPicker } from '../../../components/ui/student-picker'
import { DialogContent } from '../../../components/ui/dialog-shell'
import { useToast } from '../../../components/ui/toast'

type RefData = {
  clubs: { id: string; name: string }[]
  teachers: { id: string; full_name: string; club_ids: string[] }[]
}
type DialogData = {
  groups: {
    id: string
    name: string
    club_id: string
    teacher_id: string
    capacity: number
    category: 'adult' | 'child'
  }[]
}

export function NewSessionDialog({ refs }: { refs: RefData }) {
  const router = useRouter()
  const search = useSearchParams()
  const showToast = useToast()
  const [dialogData, setDialogData] = useState<DialogData | null>(null)
  const [loading, setLoading] = useState(false)
  const [studentOptions, setStudentOptions] = useState<
    { id: string; first_name: string; last_name: string }[]
  >([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [clubId, setClubId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [category, setCategory] = useState<'adult' | 'child'>('adult')
  const [students, setStudents] = useState<string[]>([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('18:00')
  const [createResult, setCreateResult] = useState<ActionResult | null>(null)
  const [groupResult, setGroupResult] = useState<ActionResult | null>(null)
  const [createBusy, startCreate] = useTransition()
  const [groupBusy, startGroup] = useTransition()
  const slotKey = useRef('')
  const studentRequest = useRef(0)
  const searchString = search.toString()
  const teacherOptions = useMemo(
    () => refs.teachers.filter((teacher) => !clubId || teacher.club_ids.includes(clubId)),
    [refs.teachers, clubId],
  )

  const loadData = useCallback(async () => {
    if (dialogData || loading) return
    setLoading(true)
    try {
      setDialogData(await getClassDialogData())
    } finally {
      setLoading(false)
    }
  }, [dialogData, loading])
  const loadStudentOptions = useCallback(async (nextClub: string, nextCategory: 'adult' | 'child') => {
    const requestId = ++studentRequest.current
    if (!nextClub) {
      setStudentOptions([])
      setStudentsLoading(false)
      return
    }
    setStudentsLoading(true)
    try {
      const options = await getStudentsForSessionForm(nextClub, nextCategory)
      if (requestId === studentRequest.current) setStudentOptions(options)
    } finally {
      if (requestId === studentRequest.current) setStudentsLoading(false)
    }
  }, [])
  useEffect(() => {
    const params = new URLSearchParams(searchString)
    const requestedDate = params.get('newDate')
    const requestedTime = params.get('newTime')
    if (!requestedDate || !requestedTime) {
      slotKey.current = ''
      return
    }
    const key = `${requestedDate}-${requestedTime}`
    if (key === slotKey.current) return
    const timer = window.setTimeout(() => {
      slotKey.current = key
      setDate(requestedDate)
      setTime(requestedTime)
      setCreateResult(null)
      setOpen(true)
      void loadData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [searchString, loadData])
  const closeCreate = useCallback(() => {
    setOpen(false)
    slotKey.current = ''
    const params = new URLSearchParams(searchString)
    params.delete('newDate')
    params.delete('newTime')
    const query = params.toString()
    router.replace(query ? `/clases?${query}` : '/clases', { scroll: false })
  }, [router, searchString])
  const submitCreate = useCallback(
    (form: FormData) => {
      startCreate(async () => {
        const result = await createSession(null, form)
        setCreateResult(result)
        if (result.ok) {
          showToast(result.message)
          closeCreate()
        }
      })
    },
    [startCreate, closeCreate, showToast],
  )
  const submitGroup = useCallback(
    (form: FormData) => {
      startGroup(async () => {
        const result = await generateFromGroup(null, form)
        setGroupResult(result)
        if (result.ok) {
          showToast(result.message)
          setGroupOpen(false)
        }
      })
    },
    [startGroup, showToast],
  )

  return (
    <div className="relative flex items-center gap-2">
      <Button
        type="button"
        onClick={() => {
          setDate('')
          setTime('18:00')
          setClubId('')
          setTeacherId('')
          setStudents([])
          setStudentOptions([])
          setOpen(true)
          setCreateResult(null)
          void loadData()
        }}
        className="rounded-full"
      >
        <Plus size={17} aria-hidden="true" /> Nueva clase
      </Button>
      <Button
        type="button"
        onClick={() => {
          setGroupOpen(true)
          setGroupResult(null)
          void loadData()
        }}
        className="rounded-full"
        variant="secondary"
      >
        Generar desde grupo
      </Button>
      <DialogContent
        open={open}
        onOpenChange={(value) => {
          if (!value) closeCreate()
        }}
        title="Nueva clase"
        description="Elige club, profesor, horario y alumnado."
      >
        <form action={submitCreate} className="space-y-4 px-5 py-5 sm:px-6">
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Club
            <Select
              name="clubId"
              required
              value={clubId}
              onChange={(event) => {
                const nextClub = event.target.value
                setClubId(nextClub)
                setTeacherId('')
                setStudents([])
                void loadStudentOptions(nextClub, category)
              }}
            >
              <option value="">Selecciona un club</option>
              {refs.clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Categoría
            <Select
              name="category"
              value={category}
              onChange={(event) => {
                const nextCategory = event.target.value as 'adult' | 'child'
                setCategory(nextCategory)
                setStudents([])
                void loadStudentOptions(clubId, nextCategory)
              }}
            >
              <option value="adult">Adultos</option>
              <option value="child">Infantil</option>
            </Select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Profesor
            <Select
              name="teacherId"
              required
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
            >
              <option value="">Selecciona un profesor</option>
              {teacherOptions.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Fecha
              <Input
                name="date"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Hora
              <Input
                name="time"
                type="time"
                required
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Duración
              <Input name="duration" type="number" min="30" max="180" step="15" defaultValue="60" required />
            </label>
          </div>
          {studentsLoading ? (
            <p role="status" className="text-sm text-slate-600">
              Cargando alumnos…
            </p>
          ) : clubId ? (
            <StudentPicker students={studentOptions} selected={students} onChange={setStudents} />
          ) : (
            <p className="text-sm text-slate-600">Selecciona un club para ver alumnos disponibles.</p>
          )}
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            Notas
            <Textarea name="notes" rows={2} maxLength={500} />
          </label>
          {createResult ? (
            <FormMessage tone={createResult.ok ? 'success' : 'error'}>{createResult.message}</FormMessage>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={closeCreate}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createBusy}>
              {createBusy ? 'Creando…' : 'Crear clase'}
            </Button>
          </div>
        </form>
      </DialogContent>
      <DialogContent
        open={groupOpen}
        onOpenChange={setGroupOpen}
        title="Generar sesiones"
        description="Crea sesiones recurrentes a partir de un grupo."
      >
        <form action={submitGroup} className="space-y-4 px-5 py-5 sm:px-6">
          <label className="block space-y-1.5 text-sm font-medium">
            Grupo
            <Select name="groupId" required defaultValue="">
              <option value="">{loading ? 'Cargando grupos…' : 'Selecciona un grupo'}</option>
              {(dialogData?.groups ?? []).map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} · {refs.clubs.find((club) => club.id === group.club_id)?.name ?? 'Club'}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Desde
              <Input name="start" type="date" required />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Hasta
              <Input name="end" type="date" required />
            </label>
          </div>
          <p className="text-xs text-slate-600">El rango máximo de generación es de 12 meses.</p>
          {groupResult ? (
            <FormMessage tone={groupResult.ok ? 'success' : 'error'}>{groupResult.message}</FormMessage>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" type="button" onClick={() => setGroupOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={groupBusy || loading}>
              {groupBusy ? 'Generando…' : 'Generar sesiones'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </div>
  )
}
