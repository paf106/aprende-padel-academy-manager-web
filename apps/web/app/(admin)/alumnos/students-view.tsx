'use client'

import { GraduationCap, Plus } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Badge } from '../../../components/ds/badge'
import { Button } from '../../../components/ds/button'
import { Card } from '../../../components/ds/card'
import { DataTable, type Column } from '../../../components/ds/data-table'
import { Dropdown, FilterChips } from '../../../components/ds/dropdown'
import { EmptyState } from '../../../components/ds/empty-state'
import { SearchInput } from '../../../components/ds/input'
import { PageContainer, PageHeader } from '../../../components/ds/page-header'
import { useToast } from '../../../components/ui/toast'
import {
  categoryLabels,
  clubById,
  clubs,
  fullName,
  levelLabels,
  students,
  type Student,
} from '../../../lib/demo-data'
import { studentLevels } from '@aprende-padel/core'

export function StudentsView() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [club, setClub] = useState('')
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [state, setState] = useState('active')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter(
      (s) =>
        (!q || fullName(s).toLowerCase().includes(q)) &&
        (!club || s.clubId === club) &&
        (!level || s.level === level) &&
        (!category || s.category === category) &&
        (state === 'all' || (state === 'active') === s.active),
    )
  }, [query, club, level, category, state])

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Alumno',
      cell: (s) => (
        <Link href={`/alumnos/${s.id}`} className="font-medium hover:text-brand">
          {fullName(s)}
        </Link>
      ),
    },
    { key: 'category', header: 'Categoría', cell: (s) => categoryLabels[s.category] },
    { key: 'level', header: 'Nivel', cell: (s) => levelLabels[s.level] },
    { key: 'club', header: 'Sede habitual', cell: (s) => clubById(s.clubId)?.name },
    {
      key: 'status',
      header: 'Estado',
      cell: (s) => <Badge tone={s.active ? 'brand' : 'neutral'}>{s.active ? 'Activo' : 'Baja'}</Badge>,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Alumnos"
        description={`${rows.length} de ${students.length} alumnos`}
        actions={
          <Button onClick={() => toast('El alta de alumnos se conectará con la base de datos.')}>
            <Plus size={16} aria-hidden="true" />
            Nuevo alumno
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          aria-label="Buscar alumno"
          placeholder="Buscar por nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72"
        />
        <Dropdown
          aria-label="Sede"
          className="w-44"
          allLabel="Todas las sedes"
          value={club}
          onChange={setClub}
          options={clubs.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Dropdown
          aria-label="Nivel"
          className="w-40"
          allLabel="Todos los niveles"
          value={level}
          onChange={setLevel}
          options={studentLevels.map((l) => ({ value: l, label: levelLabels[l] }))}
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
        <FilterChips
          label="Estado"
          value={state}
          onChange={setState}
          options={[
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Bajas' },
            { value: 'all', label: 'Todos' },
          ]}
        />
      </div>
      <Card>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          empty={
            <EmptyState
              icon={GraduationCap}
              title="Ningún alumno coincide"
              description="Prueba a quitar algún filtro o buscar por otro nombre."
            />
          }
        />
      </Card>
    </PageContainer>
  )
}
