'use client'

import { CalendarRange } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DeleteDialog } from '@/components/crud/delete-dialog'
import { EntityList } from '@/components/crud/entity-list'
import { Badge } from '@/components/ds/badge'
import type { FilterDef } from '@/components/ds/filter-bar'
import { useToast } from '@/components/ds/toast'
import { defaultCapacity } from '@/lib/classes/capacity'
import { courseDeletionBlockers } from '@/lib/classes/course-schema'
import { categoryLabels } from '@/lib/core/labels'
import { teacherName, type Club, type Course, type Teacher } from '@/lib/data/types'
import { useAppData } from '@/lib/data/provider'
import { WEEKDAY_OPTIONS } from '../groups/group-form-drawer'
import { CourseFormDrawer } from './course-form-drawer'

const defaultFilters = { club: '', teacher: '', state: 'active' }

const buildFilters = (clubs: readonly Club[], teachers: readonly Teacher[]): FilterDef[] => [
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
    key: 'state',
    label: 'Estado',
    allLabel: 'Todos los estados',
    options: [
      { value: 'active', label: 'Activos' },
      { value: 'inactive', label: 'De baja' },
    ],
  },
]

const dayNames = (weekdays: number[]) =>
  weekdays.map((d) => WEEKDAY_OPTIONS[d - 1]?.label.slice(0, 3)).join(', ')
const shortDate = (date: string) => date.split('-').reverse().slice(0, 2).join('/')

export function CoursesView() {
  const toast = useToast()
  const { courses, sessions, teachers, activeClubs, clubLabel, teacherLabel, actions } = useAppData()
  const [query, setQuery] = useState('')
  const [values, setValues] = useState(defaultFilters)
  const [form, setForm] = useState<{ course?: Course } | null>(null)
  const [deleting, setDeleting] = useState<Course | null>(null)
  const filters = buildFilters(activeClubs, teachers)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return courses.filter(
      (c) =>
        (!q || c.name.toLowerCase().includes(q)) &&
        (!values.club || c.clubId === values.club) &&
        (!values.teacher || c.teacherId === values.teacher) &&
        (!values.state || (values.state === 'active') === c.active),
    )
  }, [courses, query, values])

  return (
    <>
      <EntityList
        title="Cursos"
        singular="curso"
        icon={CalendarRange}
        emptyDescription="Prueba a quitar algún filtro o crea un curso intensivo."
        search={{ value: query, onChange: setQuery, placeholder: 'Buscar curso…', label: 'Buscar curso' }}
        filters={filters}
        filterValues={values}
        onFilterChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onClear={() => {
          setQuery('')
          setValues(defaultFilters)
        }}
        summary={`${rows.length} de ${courses.length}`}
        rows={rows}
        rowKey={(c) => c.id}
        onCreate={() => setForm({})}
        columns={[
          { key: 'name', header: 'Curso', cell: (c) => <span className="font-medium">{c.name}</span> },
          { key: 'club', header: 'Sede', cell: (c) => clubLabel(c.clubId) },
          {
            key: 'dates',
            header: 'Fechas',
            cell: (c) => `${shortDate(c.startsOn)} – ${shortDate(c.endsOn)} · ${dayNames(c.weekdays)}`,
          },
          { key: 'time', header: 'Horario', cell: (c) => `${c.start} · ${c.duration} min` },
          { key: 'teacher', header: 'Profesor', cell: (c) => teacherLabel(c.teacherId) },
          {
            key: 'students',
            header: 'Inscritos',
            align: 'right',
            cell: (c) => {
              const capacity = defaultCapacity[c.category]
              return (
                <Badge tone={c.studentIds.length >= capacity ? 'danger' : 'brand'}>
                  {c.studentIds.length}/{capacity} · {categoryLabels[c.category]}
                </Badge>
              )
            },
          },
          {
            key: 'status',
            header: 'Estado',
            cell: (c) => (
              <Badge tone={c.active ? 'brand' : 'neutral'}>{c.active ? 'Activo' : 'De baja'}</Badge>
            ),
          },
        ]}
        rowActions={(c) => [
          { label: 'Editar', onSelect: () => setForm({ course: c }) },
          {
            label: c.active ? 'Dar de baja' : 'Reactivar',
            onSelect: () => {
              actions.setCourseActive(c.id, !c.active)
              toast(
                c.active
                  ? 'Curso dado de baja. Se quitaron sus clases pendientes y sus cobros.'
                  : 'Curso reactivado.',
              )
            },
          },
          { label: 'Eliminar', tone: 'danger', onSelect: () => setDeleting(c) },
        ]}
      />
      {form ? (
        <CourseFormDrawer key={form.course?.id ?? 'new'} course={form.course} onClose={() => setForm(null)} />
      ) : null}
      {deleting ? (
        <DeleteDialog
          open
          name={deleting.name}
          blockers={courseDeletionBlockers({
            completedSessions: sessions.filter((s) => s.courseId === deleting.id && s.status === 'completed')
              .length,
          })}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            actions.deleteCourse(deleting.id)
            setDeleting(null)
            toast('Curso eliminado.')
          }}
          onDeactivate={() => {
            actions.setCourseActive(deleting.id, false)
            setDeleting(null)
            toast('Curso dado de baja.')
          }}
        />
      ) : null}
    </>
  )
}
