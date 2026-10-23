'use client'

import { CloudRain, Plus, UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { statusLabels, type CalendarView, type ClassStatus } from '@aprende-padel/core'
import { Calendar, type CalendarEvent, type CalendarTone } from '../../../components/calendar/calendar'
import { ClassStatusBadge } from '../../../components/ds/badge'
import { Button } from '../../../components/ds/button'
import { Drawer } from '../../../components/ds/drawer'
import { Dropdown, FilterChips } from '../../../components/ds/dropdown'
import { Label } from '../../../components/ds/input'
import { PageContainer, PageHeader } from '../../../components/ds/page-header'
import { useToast } from '../../../components/ui/toast'
import {
  categoryLabels,
  clubById,
  clubs,
  fullName,
  groupById,
  levelLabels,
  studentById,
  teacherById,
  teachers,
  type Session,
} from '../../../lib/demo-data'

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

export function ClassesView({ today, initialSessions }: { today: string; initialSessions: Session[] }) {
  const toast = useToast()
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
  const [club, setClub] = useState('')
  const [teacher, setTeacher] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [massOpen, setMassOpen] = useState(false)
  const [reason, setReason] = useState('rain')
  const [massClub, setMassClub] = useState(clubs[0].id)
  const [massDate, setMassDate] = useState(today)

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
      subtitle: `${clubById(s.clubId)?.name} · ${teacherById(s.teacherId)?.name}`,
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

  return (
    <PageContainer>
      <PageHeader
        title="Clases"
        description="Calendario de todas las sedes"
        actions={
          <>
            <Button variant="secondary" onClick={() => setMassOpen(true)}>
              <CloudRain size={16} aria-hidden="true" />
              Cancelar por lluvia
            </Button>
            <Button onClick={() => toast('La creación de clases llega con las acciones de datos.')}>
              <Plus size={16} aria-hidden="true" />
              Nueva clase
            </Button>
          </>
        }
      />
      <Calendar
        events={events}
        date={date}
        today={today}
        view={view}
        onDateChange={setDate}
        onViewChange={setView}
        selectedId={selectedId}
        onEventClick={(event) => setSelectedId(event.id)}
        filters={
          <>
            <Dropdown
              aria-label="Sede"
              className="w-44"
              allLabel="Todas las sedes"
              value={club}
              onChange={setClub}
              options={clubs.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Dropdown
              aria-label="Profesor"
              className="w-44"
              allLabel="Todos los profesores"
              searchable
              value={teacher}
              onChange={setTeacher}
              options={teachers.map((t) => ({ value: t.id, label: t.name }))}
            />
            <FilterChips
              label="Estado"
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'Todos' },
                ...(['pending', 'completed', 'cancelled'] as ClassStatus[]).map((s) => ({
                  value: s,
                  label: statusLabels[s],
                })),
              ]}
            />
            <FilterChips
              label="Categoría"
              value={category}
              onChange={setCategory}
              options={[
                { value: '', label: 'Todas' },
                { value: 'adult', label: 'Adultos' },
                { value: 'child', label: 'Niños' },
              ]}
            />
          </>
        }
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
                  {levelLabels[groupById(selected.groupId)?.level ?? 'iniciacion']}
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
                options={teachers.map((t) => ({ value: t.id, label: t.name }))}
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
    </PageContainer>
  )
}
