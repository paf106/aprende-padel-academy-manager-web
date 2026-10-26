'use client'

import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DeleteDialog } from '@/components/crud/delete-dialog'
import { EntityList } from '@/components/crud/entity-list'
import { Badge } from '@/components/ds/badge'
import type { FilterDef } from '@/components/ds/filter-bar'
import { useToast } from '@/components/ds/toast'
import { studentDeletionBlockers } from '@/lib/classes/deletion'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { studentCategories, studentLevels } from '@/lib/core/types'
import { fullName, type Club, type Student } from '@/lib/demo/data'
import { studentUsage } from '@/lib/demo/store'
import { useDemo } from '@/lib/demo/use-demo'
import { StudentFormDrawer } from './student-form-drawer'

const defaultFilters = { club: '', level: '', category: '', state: 'active' }

const buildFilters = (clubs: readonly Club[]): FilterDef[] => [
  {
    key: 'club',
    label: 'Sede',
    allLabel: 'Todas las sedes',
    options: clubs.map((c) => ({ value: c.id, label: c.name })),
  },
  {
    key: 'level',
    label: 'Nivel',
    allLabel: 'Todos los niveles',
    className: 'w-44',
    options: studentLevels.map((l) => ({ value: l, label: levelLabels[l] })),
  },
  {
    key: 'category',
    label: 'Categoría',
    allLabel: 'Todas las categorías',
    options: studentCategories.map((c) => ({ value: c, label: categoryLabels[c] })),
  },
  {
    key: 'state',
    label: 'Estado',
    allLabel: 'Todos los estados',
    options: [
      { value: 'active', label: 'Activos' },
      { value: 'inactive', label: 'Bajas' },
    ],
  },
]

export function StudentsView() {
  const router = useRouter()
  const toast = useToast()
  const { students, groups, activeClubs, clubLabel, actions } = useDemo()
  const filters = buildFilters(activeClubs)
  const [query, setQuery] = useState('')
  const [values, setValues] = useState(defaultFilters)
  const [form, setForm] = useState<{ student?: Student } | null>(null)
  const [deleting, setDeleting] = useState<Student | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter(
      (s) =>
        (!q || fullName(s).toLowerCase().includes(q)) &&
        (!values.club || s.clubId === values.club) &&
        (!values.level || s.level === values.level) &&
        (!values.category || s.category === values.category) &&
        (!values.state || (values.state === 'active') === s.active),
    )
  }, [students, query, values])

  return (
    <>
      <EntityList
        title="Alumnos"
        singular="alumno"
        icon={GraduationCap}
        emptyDescription="Prueba a quitar algún filtro o buscar por otro nombre."
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Buscar por nombre…',
          label: 'Buscar alumno',
        }}
        filters={filters}
        filterValues={values}
        onFilterChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onClear={() => {
          setQuery('')
          setValues(defaultFilters)
        }}
        summary={`${rows.length} de ${students.length}`}
        rows={rows}
        rowKey={(s) => s.id}
        onCreate={() => setForm({})}
        onRowClick={(s) => router.push(`/students/${s.id}`)}
        columns={[
          {
            key: 'name',
            header: 'Alumno',
            cell: (s) => (
              <Link
                href={`/students/${s.id}`}
                className="font-medium hover:text-brand"
                onClick={(e) => e.stopPropagation()}
              >
                {fullName(s)}
              </Link>
            ),
          },
          { key: 'category', header: 'Categoría', cell: (s) => categoryLabels[s.category] },
          { key: 'level', header: 'Nivel', cell: (s) => levelLabels[s.level] },
          { key: 'club', header: 'Sede habitual', cell: (s) => clubLabel(s.clubId) },
          {
            key: 'status',
            header: 'Estado',
            cell: (s) => <Badge tone={s.active ? 'brand' : 'neutral'}>{s.active ? 'Activo' : 'Baja'}</Badge>,
          },
        ]}
        rowActions={(s) => [
          { label: 'Ver ficha', onSelect: () => router.push(`/students/${s.id}`) },
          { label: 'Editar', onSelect: () => setForm({ student: s }) },
          {
            label: s.active ? 'Dar de baja' : 'Reactivar',
            onSelect: () => {
              actions.setStudentActive(s.id, !s.active)
              toast(s.active ? 'Alumno dado de baja.' : 'Alumno reactivado.')
            },
          },
          { label: 'Eliminar', tone: 'danger', onSelect: () => setDeleting(s) },
        ]}
      />
      {form ? (
        <StudentFormDrawer
          key={form.student?.id ?? 'new'}
          student={form.student}
          onClose={() => setForm(null)}
        />
      ) : null}
      {deleting ? (
        <DeleteDialog
          open
          name={fullName(deleting)}
          blockers={studentDeletionBlockers(studentUsage(groups, deleting.id))}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            actions.deleteStudent(deleting.id)
            setDeleting(null)
            toast('Alumno eliminado.')
          }}
          onDeactivate={() => {
            actions.setStudentActive(deleting.id, false)
            setDeleting(null)
            toast('Alumno dado de baja.')
          }}
        />
      ) : null}
    </>
  )
}
