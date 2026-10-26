'use client'

import { UserRound } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { DeleteDialog } from '@/components/crud/delete-dialog'
import { EntityList } from '@/components/crud/entity-list'
import { Badge } from '@/components/ds/badge'
import type { FilterDef } from '@/components/ds/filter-bar'
import { useToast } from '@/components/ds/toast'
import { teacherDeletionBlockers } from '@/lib/classes/deletion'
import { formatMoney } from '@/lib/core/money'
import type { TeacherSettlementRow } from '@/lib/demo/billing'
import { clubById, clubs, groups, teacherName, type Teacher } from '@/lib/demo/data'
import { teacherUsage } from '@/lib/demo/store'
import { useDemo } from '@/lib/demo/use-demo'
import { TeacherFormDrawer } from './teacher-form-drawer'

const defaultFilters = { club: '', state: 'active' }

const filters: FilterDef[] = [
  {
    key: 'club',
    label: 'Sede',
    allLabel: 'Todas las sedes',
    options: clubs.map((c) => ({ value: c.id, label: c.name })),
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

export function TeachersView({ settlements }: { settlements: TeacherSettlementRow[] }) {
  const router = useRouter()
  const toast = useToast()
  const { teachers, actions } = useDemo()
  const [query, setQuery] = useState('')
  const [values, setValues] = useState(defaultFilters)
  const [form, setForm] = useState<{ teacher?: Teacher } | null>(null)
  const [deleting, setDeleting] = useState<Teacher | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return teachers.filter(
      (t) =>
        (!q || teacherName(t).toLowerCase().includes(q)) &&
        (!values.club || t.clubIds.includes(values.club)) &&
        (!values.state || (values.state === 'active') === t.active),
    )
  }, [teachers, query, values])

  return (
    <>
      <EntityList
        title="Profesores"
        singular="profesor"
        icon={UserRound}
        emptyDescription="Prueba a quitar algún filtro o buscar por otro nombre."
        search={{
          value: query,
          onChange: setQuery,
          placeholder: 'Buscar por nombre…',
          label: 'Buscar profesor',
        }}
        filters={filters}
        filterValues={values}
        onFilterChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onClear={() => {
          setQuery('')
          setValues(defaultFilters)
        }}
        summary={`${rows.length} de ${teachers.length}`}
        rows={rows}
        rowKey={(t) => t.id}
        onCreate={() => setForm({})}
        onRowClick={(t) => router.push(`/teachers/${t.id}`)}
        columns={[
          {
            key: 'name',
            header: 'Profesor',
            cell: (t) => (
              <Link
                href={`/teachers/${t.id}`}
                className="font-medium hover:text-brand"
                onClick={(e) => e.stopPropagation()}
              >
                {teacherName(t)}
              </Link>
            ),
          },
          {
            key: 'clubs',
            header: 'Sedes',
            cell: (t) => t.clubIds.map((id) => clubById(id)?.name).join(', '),
          },
          {
            key: 'groups',
            header: 'Grupos',
            align: 'right',
            cell: (t) => groups.filter((g) => g.teacherId === t.id).length,
          },
          {
            key: 'month',
            header: 'Liquidación del mes',
            align: 'right',
            cell: (t) => formatMoney(settlements.find((s) => s.teacherId === t.id)?.totalCents ?? 0),
          },
          {
            key: 'status',
            header: 'Estado',
            cell: (t) => <Badge tone={t.active ? 'brand' : 'neutral'}>{t.active ? 'Activo' : 'Baja'}</Badge>,
          },
        ]}
        rowActions={(t) => [
          { label: 'Ver ficha', onSelect: () => router.push(`/teachers/${t.id}`) },
          { label: 'Editar', onSelect: () => setForm({ teacher: t }) },
          {
            label: t.active ? 'Dar de baja' : 'Reactivar',
            onSelect: () => {
              actions.setTeacherActive(t.id, !t.active)
              toast(t.active ? 'Profesor dado de baja.' : 'Profesor reactivado.')
            },
          },
          { label: 'Eliminar', tone: 'danger', onSelect: () => setDeleting(t) },
        ]}
      />
      {form ? (
        <TeacherFormDrawer
          key={form.teacher?.id ?? 'new'}
          teacher={form.teacher}
          onClose={() => setForm(null)}
        />
      ) : null}
      {deleting ? (
        <DeleteDialog
          open
          name={teacherName(deleting)}
          blockers={teacherDeletionBlockers(teacherUsage(deleting.id))}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            actions.deleteTeacher(deleting.id)
            setDeleting(null)
            toast('Profesor eliminado.')
          }}
          onDeactivate={() => {
            actions.setTeacherActive(deleting.id, false)
            setDeleting(null)
            toast('Profesor dado de baja.')
          }}
        />
      ) : null}
    </>
  )
}
