'use client'

import { CalendarOff, MapPin, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DeleteDialog } from '@/components/crud/delete-dialog'
import { EntityList } from '@/components/crud/entity-list'
import { Badge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { Card } from '@/components/ds/card'
import { clubColorClasses } from '@/components/ds/color-picker'
import { Dropdown } from '@/components/ds/dropdown'
import type { FilterDef } from '@/components/ds/filter-bar'
import { Input, Label } from '@/components/ds/input'
import { useToast } from '@/components/ds/toast'
import { clubDeletionBlockers } from '@/lib/classes/deletion'
import type { ClubColor } from '@/lib/classes/club-schema'
import { cn } from '@/lib/core/cn'
import type { Club } from '@/lib/data/types'
import { useAppData } from '@/lib/data/provider'
import { ClubFormDrawer } from './club-form-drawer'

const defaultFilters = { state: 'active' }
const filters: FilterDef[] = [
  {
    key: 'state',
    label: 'Estado',
    allLabel: 'Todos los estados',
    options: [
      { value: 'active', label: 'Activas' },
      { value: 'inactive', label: 'De baja' },
    ],
  },
]

export function ClubsView() {
  const toast = useToast()
  const { clubs, groups, students, teachers, closures, activeClubs, clubLabel, actions } = useAppData()
  const [query, setQuery] = useState('')
  const [values, setValues] = useState(defaultFilters)
  const [form, setForm] = useState<{ club?: Club } | null>(null)
  const [deleting, setDeleting] = useState<Club | null>(null)
  const [closure, setClosure] = useState({ clubId: '', from: '', to: '', reason: '' })

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clubs.filter(
      (c) =>
        (!q || `${c.name} ${c.address} ${c.city}`.toLowerCase().includes(q)) &&
        (!values.state || (values.state === 'active') === c.active),
    )
  }, [clubs, query, values])

  const addClosure = () => {
    if (!closure.from || !closure.to || !closure.reason.trim() || closure.to < closure.from) {
      toast('Indica un rango de fechas válido y el motivo.', 'error')
      return
    }
    actions.addClosure({ id: crypto.randomUUID(), ...closure, reason: closure.reason.trim() })
    setClosure({ clubId: '', from: '', to: '', reason: '' })
    toast('Cierre añadido. No se generarán clases esos días ni contarán en el prorrateo.')
  }

  return (
    <>
      <EntityList
        title="Sedes"
        singular="sede"
        icon={MapPin}
        layout="cards"
        emptyDescription="Prueba a cambiar el filtro o buscar por otro nombre."
        search={{ value: query, onChange: setQuery, placeholder: 'Buscar sede…', label: 'Buscar sede' }}
        filters={filters}
        filterValues={values}
        onFilterChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onClear={() => {
          setQuery('')
          setValues(defaultFilters)
        }}
        summary={`${rows.length} de ${clubs.length}`}
        rows={rows}
        rowKey={(c) => c.id}
        columns={[]}
        onCreate={() => setForm({})}
        rowActions={(c) => [
          { label: 'Editar', onSelect: () => setForm({ club: c }) },
          {
            label: c.active ? 'Dar de baja' : 'Reactivar',
            onSelect: () => {
              actions.setClubActive(c.id, !c.active)
              toast(c.active ? 'Sede dada de baja.' : 'Sede reactivada.')
            },
          },
          { label: 'Eliminar', tone: 'danger', onSelect: () => setDeleting(c) },
        ]}
        renderCard={(club, menu) => (
          <article
            className={cn(
              'overflow-hidden rounded-[var(--radius-card)] border border-border bg-card shadow-[var(--shadow-card)]',
              !club.active && 'opacity-70',
            )}
          >
            <div className="relative">
              {club.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={club.photo}
                  alt={`Foto de ${club.name}`}
                  className="aspect-[16/9] w-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className={cn(
                    'grid aspect-[16/9] w-full place-items-center text-5xl font-semibold text-white/90',
                    clubColorClasses[club.color as ClubColor] ?? 'bg-success',
                  )}
                >
                  {club.name.charAt(0)}
                </div>
              )}
              <div className="absolute right-2 top-2 rounded-full bg-card/90 backdrop-blur">{menu}</div>
            </div>
            <div className="grid gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{club.name}</h2>
                {club.active ? null : <Badge>De baja</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {club.address}, {club.postalCode} {club.city}
              </p>
              <p className="text-xs text-muted-foreground">
                {club.courts} {club.courts === 1 ? 'pista' : 'pistas'} ·{' '}
                {groups.filter((g) => g.clubId === club.id && g.active).length} grupos ·{' '}
                {students.filter((s) => s.clubId === club.id && s.active).length} alumnos
              </p>
            </div>
          </article>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Festivos y vacaciones</h2>
            <ul className="divide-y divide-border">
              {closures.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
                  <CalendarOff size={16} aria-hidden="true" className="text-muted-foreground" />
                  <span className="flex-1">
                    <span className="font-medium">{c.reason}</span>
                    <span className="ml-2 text-muted-foreground">
                      {c.clubId ? clubLabel(c.clubId) : 'Todas las sedes'}
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.from.split('-').reverse().join('/')}
                    {c.to !== c.from ? ` – ${c.to.split('-').reverse().join('/')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Añadir cierre</h2>
            <div className="grid gap-3">
              <Dropdown
                aria-label="Sede"
                allLabel="Todas las sedes"
                value={closure.clubId}
                onChange={(clubId) => setClosure((c) => ({ ...c, clubId }))}
                options={activeClubs.map((c) => ({ value: c.id, label: c.name }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="closure-from">Desde</Label>
                  <Input
                    id="closure-from"
                    type="date"
                    value={closure.from}
                    onChange={(e) => setClosure((c) => ({ ...c, from: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="closure-to">Hasta</Label>
                  <Input
                    id="closure-to"
                    type="date"
                    value={closure.to}
                    onChange={(e) => setClosure((c) => ({ ...c, to: e.target.value }))}
                  />
                </div>
              </div>
              <Input
                aria-label="Motivo"
                placeholder="Motivo (festivo, vacaciones…)"
                value={closure.reason}
                onChange={(e) => setClosure((c) => ({ ...c, reason: e.target.value }))}
              />
              <Button onClick={addClosure}>
                <Plus size={16} aria-hidden="true" />
                Añadir
              </Button>
            </div>
          </Card>
        </div>
      </EntityList>
      {form ? (
        <ClubFormDrawer key={form.club?.id ?? 'new'} club={form.club} onClose={() => setForm(null)} />
      ) : null}
      {deleting ? (
        <DeleteDialog
          open
          name={deleting.name}
          blockers={clubDeletionBlockers({
            groups: groups.filter((g) => g.clubId === deleting.id).length,
            students: students.filter((s) => s.clubId === deleting.id).length,
            teachers: teachers.filter((t) => t.clubIds.includes(deleting.id)).length,
          })}
          onClose={() => setDeleting(null)}
          onDelete={() => {
            actions.deleteClub(deleting.id)
            setDeleting(null)
            toast('Sede eliminada.')
          }}
          onDeactivate={() => {
            actions.setClubActive(deleting.id, false)
            setDeleting(null)
            toast('Sede dada de baja.')
          }}
        />
      ) : null}
    </>
  )
}
