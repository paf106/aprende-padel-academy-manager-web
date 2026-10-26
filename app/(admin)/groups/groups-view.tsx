'use client'

import { Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DeleteDialog } from '@/components/crud/delete-dialog'
import { EntityList } from '@/components/crud/entity-list'
import { Badge } from '@/components/ds/badge'
import type { FilterDef } from '@/components/ds/filter-bar'
import { useToast } from '@/components/ds/toast'
import { defaultCapacity } from '@/lib/classes/capacity'
import { groupDeletionBlockers } from '@/lib/classes/deletion'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { studentCategories, studentLevels } from '@/lib/core/types'
import type { Club, Group, Teacher } from '@/lib/demo/data'
import { teacherName } from '@/lib/demo/data'
import { useDemo } from '@/lib/demo/use-demo'
import { GroupFormDrawer, WEEKDAY_OPTIONS } from './group-form-drawer'

const defaultFilters = { club: '', teacher: '', category: '', level: '', state: 'active' }

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
    key: 'category',
    label: 'Categoría',
    allLabel: 'Todas las categorías',
    options: studentCategories.map((c) => ({ value: c, label: categoryLabels[c] })),
  },
  {
    key: 'level',
    label: 'Nivel',
    allLabel: 'Todos los niveles',
    className: 'w-44',
    options: studentLevels.map((l) => ({ value: l, label: levelLabels[l] })),
  },
  {
    key: 'state',
    label: 'Estado',
    allLabel: 'Todos los estados',
    options: [
      { value: 'active', label: 'Activos' },
      { value: 'inactive', label: 'Finalizados' },
    ],
  },
]

export function GroupsView() {
  const toast = useToast()
  const { groups, sessions, teachers, activeClubs, clubLabel, teacherLabel, actions } = useDemo()
  const [query, setQuery] = useState('')
  const [values, setValues] = useState(defaultFilters)
  const [form, setForm] = useState<{ group?: Group } | null>(null)
  const [deleting, setDeleting] = useState<Group | null>(null)
  const filters = buildFilters(activeClubs, teachers)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups.filter(
      (g) =>
        (!q || g.name.toLowerCase().includes(q)) &&
        (!values.club || g.clubId === values.club) &&
        (!values.teacher || g.teacherId === values.teacher) &&
        (!values.category || g.category === values.category) &&
        (!values.level || g.level === values.level) &&
        (!values.state || (values.state === 'active') === g.active),
    )
  }, [groups, query, values])

  return (
    <>
      <EntityList
        title="Grupos"
        singular="grupo"
        icon={Users}
        emptyDescription="Prueba a quitar algún filtro o buscar por otro nombre."
        search={{ value: query, onChange: setQuery, placeholder: 'Buscar grupo…', label: 'Buscar grupo' }}
        filters={filters}
        filterValues={values}
        onFilterChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onClear={() => {
          setQuery('')
          setValues(defaultFilters)
        }}
        summary={`${rows.length} de ${groups.length}`}
        rows={rows}
        rowKey={(g) => g.id}
        onCreate={() => setForm({})}
        columns={[
          { key: 'name', header: 'Grupo', cell: (g) => <span className="font-medium">{g.name}</span> },
          { key: 'club', header: 'Sede', cell: (g) => clubLabel(g.clubId) },
          {
            key: 'schedule',
            header: 'Horario',
            cell: (g) => `${WEEKDAY_OPTIONS[g.weekday - 1]?.label} ${g.start} · ${g.duration} min`,
          },
          { key: 'teacher', header: 'Profesor', cell: (g) => teacherLabel(g.teacherId) },
          {
            key: 'level',
            header: 'Categoría',
            cell: (g) => `${categoryLabels[g.category]} · ${levelLabels[g.level]}`,
          },
          {
            key: 'occupancy',
            header: 'Plazas',
            align: 'right',
            cell: (g) => {
              const capacity = defaultCapacity[g.category]
              return (
                <Badge tone={g.studentIds.length >= capacity ? 'danger' : 'brand'}>
                  {g.studentIds.length}/{capacity}
                </Badge>
              )
            },
          },
          {
            key: 'status',
            header: 'Estado',
            cell: (g) => (
              <Badge tone={g.active ? 'brand' : 'neutral'}>{g.active ? 'Activo' : 'Finalizado'}</Badge>
            ),
          },
        ]}
        rowActions={(g) => [
          { label: 'Editar', onSelect: () => setForm({ group: g }) },
          {
            label: g.active ? 'Dar de baja' : 'Reactivar',
            onSelect: () => {
              actions.setGroupActive(g.id, !g.active)
              toast(
                g.active
                  ? 'Grupo finalizado. Se quitaron sus clases pendientes.'
                  : 'Grupo reactivado. Sus clases vuelven al calendario.',
              )
            },
          },
          { label: 'Eliminar', tone: 'danger', onSelect: () => setDeleting(g) },
        ]}
      />
      {form ? (
        <GroupFormDrawer key={form.group?.id ?? 'new'} group={form.group} onClose={() => setForm(null)} />
      ) : null}
      {deleting ? (
        <DeleteDialog
          open
          name={deleting.name}
          blockers={groupDeletionBlockers({
            completedSessions: sessions.filter((s) => s.groupId === deleting.id && s.status === 'completed')
              .length,
          })}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            actions.deleteGroup(deleting.id)
            setDeleting(null)
            toast('Grupo eliminado.')
          }}
          onDeactivate={() => {
            actions.setGroupActive(deleting.id, false)
            setDeleting(null)
            toast('Grupo finalizado.')
          }}
        />
      ) : null}
    </>
  )
}
