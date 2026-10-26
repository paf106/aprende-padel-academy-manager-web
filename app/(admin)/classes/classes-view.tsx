'use client'

import { UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { classStatusLabels } from '@/lib/core/labels'
import { type CalendarView } from '@/lib/core/dates'
import { classStatuses } from '@/lib/core/types'
import { Calendar, type CalendarEvent, type CalendarTone } from '@/components/calendar/calendar'
import { ClassStatusBadge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { Drawer } from '@/components/ds/drawer'
import { Dropdown } from '@/components/ds/dropdown'
import { FilterBar, type FilterDef } from '@/components/ds/filter-bar'
import { Input, Label } from '@/components/ds/input'
import { PageContainer, PageToolbar } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import { slotsOverlap } from '@/lib/classes/sessions'
import { useDemo } from '@/lib/demo/use-demo'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import {
  clubById,
  clubs,
  fullName,
  groupById,
  groups,
  studentById,
  teacherName,
  type Session,
} from '@/lib/demo/data'

type Attendance = 'unmarked' | 'present' | 'absent'
type SessionState = Session & {
  attendance: Record<string, Attendance>
  cancelReason?: string
}

const clubTone: Record<string, CalendarTone> = {
  brand: 'brand',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
}
const reasons = [
  { value: 'rain', label: 'Lluvia' },
  { value: 'bad_weather', label: 'Mal tiempo' },
  { value: 'other', label: 'Otro motivo' },
]
const reasonLabel = Object.fromEntries(reasons.map((r) => [r.value, r.label]))
const defaultFilters = { club: '', teacher: '', status: '', category: '' }

export function ClassesView({ today, initialSessions }: { today: string; initialSessions: Session[] }) {
  const toast = useToast()
  const { teachers, teacherLabel } = useDemo()
  const [sessions, setSessions] = useState<SessionState[]>(() =>
    initialSessions.map((s) => ({
      ...s,
      attendance: Object.fromEntries(
        s.studentIds.map((id) => [id, s.status === 'completed' ? 'present' : 'unmarked']),
      ),
    })),
  )
  const [date, setDate] = useState(today)
  const [view, setView] = useState<CalendarView>('week')
  const [filterValues, setFilterValues] = useState(defaultFilters)
  const { club, teacher, status, category } = filterValues
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [massOpen, setMassOpen] = useState(false)
  const [reason, setReason] = useState('rain')
  const [massClub, setMassClub] = useState(clubs[0].id)
  const [massDate, setMassDate] = useState(today)
  const [newSlot, setNewSlot] = useState<{ date: string; time: string | null } | null>(null)
  const [newForm, setNewForm] = useState({ groupId: '', date: '', time: '19:00', duration: '60' })
  const [newError, setNewError] = useState('')

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          (!club || s.clubId === club) &&
          (!teacher || s.teacherId === teacher) &&
          (!status || s.status === status) &&
          (!category || s.category === category),
      ),
    [sessions, club, teacher, status, category],
  )
  const events: CalendarEvent[] = filtered.map((s) => {
    const group = groupById(s.groupId)
    const end = new Date(`${s.date}T${s.start}:00+02:00`)
    const start = new Date(end)
    end.setMinutes(end.getMinutes() + s.duration)
    return {
      id: s.id,
      title: group?.name ?? 'Clase',
      subtitle: `${clubById(s.clubId)?.name} · ${teacherLabel(s.teacherId)}`,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      tone:
        s.status === 'cancelled'
          ? 'danger'
          : s.status === 'completed'
            ? 'neutral'
            : clubTone[clubById(s.clubId)?.color ?? 'brand'],
      muted: s.status === 'cancelled',
    }
  })
  const selected = sessions.find((s) => s.id === selectedId) ?? null
  const filters: FilterDef[] = [
    {
      key: 'club',
      label: 'Sede',
      allLabel: 'Todas las sedes',
      options: clubs.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'teacher',
      label: 'Profesor',
      allLabel: 'Todos los profesores',
      className: 'w-52',
      options: teachers.filter((t) => t.active).map((t) => ({ value: t.id, label: teacherName(t) })),
    },
    {
      key: 'status',
      label: 'Estado',
      allLabel: 'Todos los estados',
      options: classStatuses.map((s) => ({ value: s, label: classStatusLabels[s] })),
    },
    {
      key: 'category',
      label: 'Categoría',
      allLabel: 'Todas las categorías',
      options: [
        { value: 'adult', label: categoryLabels.adult },
        { value: 'child', label: categoryLabels.child },
      ],
    },
  ]

  const update = (id: string, patch: Partial<SessionState>) =>
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const massCancel = () => {
    const targets = sessions.filter(
      (s) => s.clubId === massClub && s.date === massDate && s.status === 'pending',
    )
    setSessions((list) =>
      list.map((s) =>
        targets.some((t) => t.id === s.id) ? { ...s, status: 'cancelled', cancelReason: reason } : s,
      ),
    )
    setMassOpen(false)
    toast(
      targets.length
        ? `${targets.length} clases canceladas. El prorrateo y la liquidación se recalculan.`
        : 'No hay clases pendientes en esa sede y día.',
    )
  }

  const openMass = (day: string, clubId?: string) => {
    setMassDate(day)
    setMassClub(clubId || club || clubs[0].id)
    setMassOpen(true)
  }

  const openNew = (day: string, time: string | null) => {
    const firstGroup = groups.find((g) => !club || g.clubId === club)
    setNewForm({ groupId: firstGroup?.id ?? '', date: day, time: time ?? '19:00', duration: '60' })
    setNewError('')
    setNewSlot({ date: day, time })
  }

  const createSession = () => {
    const group = groupById(newForm.groupId)
    if (!group) {
      setNewError('Elige un grupo.')
      return
    }
    const duration = Number(newForm.duration) as 60 | 90
    const slot = { date: newForm.date, start: newForm.time, duration }
    const clash = sessions.find(
      (s) => s.teacherId === group.teacherId && s.status !== 'cancelled' && slotsOverlap(slot, s),
    )
    if (clash) {
      setNewError('El profesor ya tiene una clase a esa hora.')
      return
    }
    const id = `${group.id}-${newForm.date}-${newForm.time}`
    setSessions((list) => [
      ...list,
      {
        id,
        groupId: group.id,
        clubId: group.clubId,
        teacherId: group.teacherId,
        date: newForm.date,
        start: newForm.time,
        duration,
        category: group.category,
        status: 'pending',
        studentIds: group.studentIds,
        attendance: Object.fromEntries(group.studentIds.map((studentId) => [studentId, 'unmarked'])),
      },
    ])
    setNewSlot(null)
    toast('Clase creada.')
  }

  return (
    <PageContainer fill>
      <PageToolbar title="Clases">
        <FilterBar
          filters={filters}
          values={filterValues}
          onChange={(key, value) => setFilterValues((current) => ({ ...current, [key]: value }))}
          onClear={() => setFilterValues(defaultFilters)}
        />
      </PageToolbar>
      <Calendar
        events={events}
        date={date}
        today={today}
        view={view}
        onDateChange={setDate}
        onViewChange={setView}
        selectedId={selectedId}
        onEventClick={(event) => setSelectedId(event.id)}
        onSlotSelect={(slot) => openNew(slot.date, slot.start)}
        onDaySelect={(day) => openNew(day, null)}
        dayActions={(day) => [
          { label: 'Nueva clase aquí', onSelect: () => openNew(day, null) },
          { label: 'Cancelar clases del día…', onSelect: () => openMass(day) },
        ]}
      />

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? (groupById(selected.groupId)?.name ?? 'Clase') : ''}
        description={
          selected
            ? `${selected.date.split('-').reverse().join('/')} · ${selected.start} · ${selected.duration} min`
            : undefined
        }
        footer={
          selected && selected.status === 'pending' ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedId(null)
                  openMass(selected.date, selected.clubId)
                }}
              >
                Cancelar el día
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  update(selected.id, { status: 'cancelled', cancelReason: 'other' })
                  toast('Clase cancelada. No se cobrará a los alumnos.')
                }}
              >
                Cancelar clase
              </Button>
              <Button
                onClick={() => {
                  update(selected.id, { status: 'completed' })
                  toast('Clase marcada como terminada.')
                }}
              >
                Marcar terminada
              </Button>
            </>
          ) : undefined
        }
      >
        {selected ? (
          <div className="grid gap-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd className="mt-1">
                  <ClassStatusBadge status={selected.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sede</dt>
                <dd className="mt-1 font-medium">{clubById(selected.clubId)?.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Categoría</dt>
                <dd className="mt-1 font-medium">
                  {categoryLabels[selected.category]} ·{' '}
                  {levelLabels[groupById(selected.groupId)?.level ?? 'starter']}
                </dd>
              </div>
              {selected.cancelReason ? (
                <div>
                  <dt className="text-muted-foreground">Motivo</dt>
                  <dd className="mt-1 font-medium">{reasonLabel[selected.cancelReason]}</dd>
                </div>
              ) : null}
            </dl>
            <div>
              <Label>Profesor que imparte</Label>
              <Dropdown
                aria-label="Profesor que imparte"
                value={selected.teacherId}
                onChange={(value) => {
                  update(selected.id, { teacherId: value })
                  toast('Sustitución registrada: cobra quien imparte la clase.')
                }}
                options={teachers
                  .filter((t) => t.active)
                  .map((t) => ({ value: t.id, label: teacherName(t) }))}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Asistencia ({selected.studentIds.length})</h3>
                {selected.status !== 'cancelled' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      update(selected.id, {
                        attendance: Object.fromEntries(selected.studentIds.map((id) => [id, 'present'])),
                      })
                    }
                  >
                    <UserCheck size={14} aria-hidden="true" />
                    Todos asistieron
                  </Button>
                ) : null}
              </div>
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {selected.studentIds.map((id) => {
                  const student = studentById(id)
                  const value = selected.attendance[id]
                  return (
                    <li key={id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="truncate">{student ? fullName(student) : id}</span>
                      <div
                        role="group"
                        aria-label={`Asistencia de ${student?.firstName}`}
                        className="flex gap-1"
                      >
                        {(['present', 'absent'] as const).map((option) => (
                          <button
                            key={option}
                            type="button"
                            disabled={selected.status === 'cancelled'}
                            aria-pressed={value === option}
                            onClick={() =>
                              update(selected.id, { attendance: { ...selected.attendance, [id]: option } })
                            }
                            className={`h-8 cursor-pointer rounded-full px-3 text-xs font-medium disabled:opacity-40 ${value === option ? (option === 'present' ? 'bg-brand text-brand-foreground' : 'bg-danger text-white') : 'bg-muted text-muted-foreground'}`}
                          >
                            {option === 'present' ? 'Asiste' : 'Falta'}
                          </button>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Las faltas del alumno se cobran; solo las cancelaciones del club se descuentan.
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer
        open={massOpen}
        onClose={() => setMassOpen(false)}
        title="Cancelar por lluvia o mal tiempo"
        description="Cancela de una vez todas las clases pendientes de una sede en un día."
        footer={
          <>
            <Button variant="secondary" onClick={() => setMassOpen(false)}>
              Volver
            </Button>
            <Button variant="danger" onClick={massCancel}>
              Cancelar clases
            </Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div>
            <Label>Sede</Label>
            <Dropdown
              aria-label="Sede"
              value={massClub}
              onChange={setMassClub}
              options={clubs.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <Label htmlFor="mass-date">Día</Label>
            <input
              id="mass-date"
              type="date"
              value={massDate}
              onChange={(e) => setMassDate(e.target.value)}
              className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm"
            />
          </div>
          <div>
            <Label>Motivo</Label>
            <Dropdown aria-label="Motivo" value={reason} onChange={setReason} options={reasons} />
          </div>
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            Las clases canceladas no se cobran a los alumnos (prorrateo) ni se pagan al profesor.
          </p>
        </div>
      </Drawer>
      <Drawer
        open={newSlot !== null}
        onClose={() => setNewSlot(null)}
        title="Nueva clase"
        description="Crea una clase puntual a partir de un grupo."
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewSlot(null)}>
              Cancelar
            </Button>
            <Button onClick={createSession}>Crear clase</Button>
          </>
        }
      >
        <div className="grid gap-5">
          <div>
            <Label>Grupo</Label>
            <Dropdown
              aria-label="Grupo"
              searchable
              placeholder="Elige un grupo"
              value={newForm.groupId}
              onChange={(value) => setNewForm((f) => ({ ...f, groupId: value }))}
              options={groups
                .filter((g) => !club || g.clubId === club)
                .map((g) => ({ value: g.id, label: g.name, hint: clubById(g.clubId)?.name }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-date">Día</Label>
              <Input
                id="new-date"
                type="date"
                value={newForm.date}
                onChange={(e) => setNewForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="new-time">Hora</Label>
              <Input
                id="new-time"
                type="time"
                value={newForm.time}
                onChange={(e) => setNewForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Duración</Label>
            <Dropdown
              aria-label="Duración"
              value={newForm.duration}
              onChange={(value) => setNewForm((f) => ({ ...f, duration: value }))}
              options={[
                { value: '60', label: '60 minutos' },
                { value: '90', label: '90 minutos' },
              ]}
            />
          </div>
          {newError ? (
            <p role="alert" className="text-sm text-danger">
              {newError}
            </p>
          ) : null}
        </div>
      </Drawer>
    </PageContainer>
  )
}
