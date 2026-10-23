'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { defaultCapacity } from '@aprende-padel/core'
import { Badge } from '../../../components/ds/badge'
import { Button } from '../../../components/ds/button'
import { BentoCard, BentoGrid } from '../../../components/ds/card'
import { Dropdown, FilterChips } from '../../../components/ds/dropdown'
import { SearchInput } from '../../../components/ds/input'
import { PageContainer, PageHeader } from '../../../components/ds/page-header'
import { useToast } from '../../../components/ui/toast'
import {
  categoryLabels,
  clubById,
  clubs,
  fullName,
  groups,
  levelLabels,
  studentById,
  teacherById,
} from '../../../lib/demo-data'

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function GroupsView() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [club, setClub] = useState('')
  const [category, setCategory] = useState('')
  const rows = useMemo(
    () =>
      groups.filter(
        (g) =>
          (!club || g.clubId === club) &&
          (!category || g.category === category) &&
          g.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, club, category],
  )
  return (
    <PageContainer>
      <PageHeader
        title="Grupos"
        description="Plantillas que generan las clases del calendario"
        actions={
          <Button onClick={() => toast('La creación de grupos se conectará con la base de datos.')}>
            <Plus size={16} aria-hidden="true" />
            Nuevo grupo
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          aria-label="Buscar grupo"
          placeholder="Buscar grupo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-64"
        />
        <Dropdown
          aria-label="Sede"
          className="w-44"
          allLabel="Todas las sedes"
          value={club}
          onChange={setClub}
          options={clubs.map((c) => ({ value: c.id, label: c.name }))}
        />
        <FilterChips
          label="Categoría"
          value={category}
          onChange={setCategory}
          options={[
            { value: '', label: 'Todos' },
            { value: 'adult', label: 'Adultos' },
            { value: 'child', label: 'Niños' },
          ]}
        />
      </div>
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
                {teacherById(g.teacherId)?.name}
              </p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {g.studentIds.map((id) => {
                  const s = studentById(id)
                  return (
                    <li key={id} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                      {s ? fullName(s) : id}
                    </li>
                  )
                })}
              </ul>
            </BentoCard>
          )
        })}
      </BentoGrid>
    </PageContainer>
  )
}
