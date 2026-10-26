'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { defaultCapacity } from '@/lib/classes/capacity'
import { Badge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid } from '@/components/ds/card'
import { FilterBar, type FilterDef } from '@/components/ds/filter-bar'
import { PageContainer, PageToolbar } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import { useDemo } from '@/lib/demo/use-demo'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { studentCategories } from '@/lib/core/types'
import { clubById, clubs, groups } from '@/lib/demo/data'

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const defaultFilters = { club: '', category: '' }
const filters: FilterDef[] = [
  {
    key: 'club',
    label: 'Sede',
    allLabel: 'Todas las sedes',
    options: clubs.map((c) => ({ value: c.id, label: c.name })),
  },
  {
    key: 'category',
    label: 'Categoría',
    allLabel: 'Todas las categorías',
    options: studentCategories.map((c) => ({ value: c, label: categoryLabels[c] })),
  },
]

export function GroupsView() {
  const toast = useToast()
  const { studentLabel, teacherLabel } = useDemo()
  const [query, setQuery] = useState('')
  const [values, setValues] = useState(defaultFilters)
  const rows = useMemo(
    () =>
      groups.filter(
        (g) =>
          (!values.club || g.clubId === values.club) &&
          (!values.category || g.category === values.category) &&
          g.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, values],
  )
  return (
    <PageContainer>
      <PageToolbar
        title="Grupos"
        actions={
          <Button onClick={() => toast('La creación de grupos se conectará con la base de datos.')}>
            <Plus size={16} aria-hidden="true" />
            Nuevo grupo
          </Button>
        }
      >
        <FilterBar
          search={{ value: query, onChange: setQuery, placeholder: 'Buscar grupo…', label: 'Buscar grupo' }}
          filters={filters}
          values={values}
          onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
          onClear={() => {
            setQuery('')
            setValues(defaultFilters)
          }}
          trailing={<span className="text-sm text-muted-foreground">{rows.length} grupos</span>}
        />
      </PageToolbar>
      <BentoGrid>
        {rows.map((g) => {
          const capacity = defaultCapacity[g.category]
          const full = g.studentIds.length >= capacity
          return (
            <BentoCard
              key={g.id}
              span="md"
              title={`${clubById(g.clubId)?.name} · ${DAYS[g.weekday]} ${g.start}`}
              action={
                <Badge tone={full ? 'danger' : 'brand'}>
                  {g.studentIds.length}/{capacity}
                </Badge>
              }
            >
              <h3 className="text-base font-semibold">{g.name}</h3>
              <p className="text-xs text-muted-foreground">
                {categoryLabels[g.category]} · {levelLabels[g.level]} · {g.duration} min ·{' '}
                {teacherLabel(g.teacherId)}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {g.studentIds.map((id) => (
                  <li key={id} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {studentLabel(id)}
                  </li>
                ))}
              </ul>
            </BentoCard>
          )
        })}
      </BentoGrid>
    </PageContainer>
  )
}
