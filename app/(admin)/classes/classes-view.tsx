'use client'

import { UserCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cancellationReasonLabels, classStatusLabels } from '@/lib/core/labels'
import { type CalendarView } from '@/lib/core/dates'
import {
  cancellationReasons,
  classStatuses,
  type CancellationReason,
  type StudentLevel,
} from '@/lib/core/types'
import {
  Calendar,
  type CalendarDraft,
  type CalendarEvent,
  type CalendarTone,
} from '@/components/calendar/calendar'
import { ClassStatusBadge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { Drawer } from '@/components/ds/drawer'
import { Dropdown } from '@/components/ds/dropdown'
import { FilterBar, type FilterDef } from '@/components/ds/filter-bar'
import { Badge } from '@/components/ds/badge'
import { Label } from '@/components/ds/input'
import { PageContainer, PageToolbar } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import type { SessionInput } from '@/lib/classes/session-schema'
import { useDemo } from '@/lib/demo/use-demo'
import { AddGuestPanel } from './add-guest-panel'
import { CancelSessionDrawer } from './cancel-session-drawer'
import { SessionFormDrawer } from './session-form-drawer'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { formatMoney } from '@/lib/core/money'
import { fullName, teacherName, type Session } from '@/lib/demo/data'
import { dropInPrice } from '@/lib/payments/extras'

type Attendance = 'unmarked' | 'present' | 'absent'
type SessionState = Session & {
  level?: StudentLevel
  attendance: Record<string, Attendance>
  cancelReason?: string
}

const clubTone: Record<string, CalendarTone> = {
  brand: 'brand',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
}
const defaultFilters = { club: '', teacher: '', status: '', category: '' }

export function ClassesView({ today }: { today: string }) {
  const toast = useToast()
  const {
    teachers,
    teacherLabel,
    sessions: storedSessions,
    activeClubs,
    clubById,
    groups,
    groupById,
    studentById,
    courses,
    extras,
    actions,
  } = useDemo()
  const sessions = useMemo<SessionState[]>(
    () =>
      storedSessions.map((s) => ({
        ...s,
        attendance:
          s.attendance ??
          Object.fromEntries(
            s.studentIds.map((id) => [id, s.status === 'completed' ? 'present' : 'unmarked']),
          ),
      })),
    [storedSessions],
  )
  const [date, setDate] = useState(today)
  const [view, setView] = useState<CalendarView>('week')
  const [filterValues, setFilterValues] = useState(defaultFilters)
  const { club, teacher, status, category } = filterValues
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [massOpen, setMassOpen] = useState(false)
  const [reason, setReason] = useState<CancellationReason>('rain')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [massClub, setMassClub] = useState(activeClubs[0]?.id ?? '')
  const [massDate, setMassDate] = useState(today)
  const [newSlot, setNewSlot] = useState<{ date: string; start: string; duration: 60 | 90 } | null>(null)
  const [draft, setDraft] = useState<CalendarDraft | null>(null)

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
  const sessionTitle = (s: Session) =>
    s.kind === 'private'
      ? 'Clase particular'
      : s.courseId
        ? (courses.find((c) => c.id === s.courseId)?.name ?? 'Curso')
        : (groupById(s.groupId)?.name ?? 'Clase libre')
  const events: CalendarEvent[] = filtered.map((s) => {
    const end = new Date(`${s.date}T${s.start}:00+02:00`)
    const start = new Date(end)
    end.setMinutes(end.getMinutes() + s.duration)
    return {
      id: s.id,
      title: sessionTitle(s),
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
      options: activeClubs.map((c) => ({ value: c.id, label: c.name })),
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

  const update = (id: string, patch: Partial<SessionState>) => actions.updateSession(id, patch)

  const massCancel = () => {
    const targets = sessions.filter(
      (s) => s.clubId === massClub && s.date === massDate && s.status === 'pending',
    )
    actions.cancelSessions(
      targets.map((target) => target.id),
      reason,
    )
    setMassOpen(false)
    toast(
      targets.length
        ? `${targets.length} clases canceladas. Los descuentos y la liquidación se recalculan.`
        : 'No hay clases pendientes en esa sede y día.',
    )
  }

  const openMass = (day: string, clubId?: string) => {
    setMassDate(day)
    setMassClub(clubId || club || (activeClubs[0]?.id ?? ''))
    setMassOpen(true)
  }

  const openNew = (day: string, start: string | null, duration: 60 | 90 = 60) => {
    setSelectedId(null)
    setNewSlot({ date: day, start: start ?? '19:00', duration })
  }

  const closeNew = () => {
    setNewSlot(null)
    setDraft(null)
  }

  const createSession = (input: SessionInput) => {
    actions.addSession({
      id: `${input.groupId || 'free'}-${input.date}-${input.start}-${sessions.length}`,
      groupId: input.groupId,
      kind: input.kind,
      clubId: input.clubId,
      teacherId: input.teacherId,
      date: input.date,
      start: input.start,
      duration: input.duration,
      category: input.category,
      level: input.level,
      status: 'pending',
      studentIds: input.studentIds,
      attendance: Object.fromEntries(input.studentIds.map((studentId) => [studentId, 'unmarked'])),
    })
    closeNew()
    toast(
      input.kind === 'private'
        ? 'Clase particular creada. El importe se suma al cobro de cada alumno.'
        : 'Clase creada.',
    )
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
        draft={draft}
        onSlotSelect={(slot) => openNew(slot.date, slot.start, slot.duration)}
        onDaySelect={(day) => openNew(day, null)}
      />

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected ? sessionTitle(selected) : ''}
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
              <Button variant="secondary" onClick={() => setCancelling(selected.id)}>
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
                  {levelLabels[selected.level ?? groupById(selected.groupId)?.level ?? 'starter']}
                </dd>
              </div>
              {selected.cancelReason ? (
                <div>
                  <dt className="text-muted-foreground">Motivo</dt>
                  <dd className="mt-1 font-medium">
                    {cancellationReasonLabels[selected.cancelReason as CancellationReason] ??
                      selected.cancelReason}
                  </dd>
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
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{student ? fullName(student) : id}</span>
                        {selected.guests?.[id] === 'recovery' ? (
                          <Badge tone="info">Recuperación</Badge>
                        ) : null}
                        {selected.guests?.[id] === 'drop_in' ? (
                          <Badge tone="warning">
                            Suelta · {formatMoney(dropInPrice(extras, selected.duration))}
                          </Badge>
                        ) : null}
                      </span>
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
                Las faltas del alumno se cobran; solo las cancelaciones con descuento se restan de la cuota.
              </p>
            </div>
            {selected.status === 'pending' ? <AddGuestPanel session={selected} /> : null}
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
              options={activeClubs.map((c) => ({ value: c.id, label: c.name }))}
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
            <Dropdown
              aria-label="Motivo"
              value={reason}
              onChange={(v) => setReason(v as CancellationReason)}
              options={cancellationReasons.map((r) => ({ value: r, label: cancellationReasonLabels[r] }))}
            />
          </div>
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
            Según el motivo, los alumnos reciben un descuento en su cuota. Las clases canceladas no se pagan
            al profesor.
          </p>
        </div>
      </Drawer>
      {cancelling ? (
        <CancelSessionDrawer
          studentIds={sessions.find((s) => s.id === cancelling)?.studentIds ?? []}
          onClose={() => setCancelling(null)}
          onConfirm={(cancelReason, credited) => {
            actions.cancelSessions([cancelling], cancelReason, credited)
            setCancelling(null)
            toast('Clase cancelada. No se paga al profesor y los descuentos se recalculan.')
          }}
        />
      ) : null}
      {newSlot ? (
        <SessionFormDrawer
          initial={newSlot}
          defaultClubId={club}
          existing={sessions}
          onDraftChange={setDraft}
          onCreate={createSession}
          onClose={closeNew}
        />
      ) : null}
    </PageContainer>
  )
}
