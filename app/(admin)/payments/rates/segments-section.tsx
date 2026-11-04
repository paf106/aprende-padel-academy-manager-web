'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/crud/confirm-dialog'
import { FormDrawer } from '@/components/crud/form-drawer'
import { RowActionsMenu } from '@/components/crud/row-actions-menu'
import { DataTable } from '@/components/ds/data-table'
import { TextField } from '@/components/ds/field'
import { useToast } from '@/components/ds/toast'
import { validate } from '@/lib/core/validation'
import { useAppData } from '@/lib/data/provider'
import { segmentDeletionBlockers, segmentOverlap, segmentSchema } from '@/lib/payments/rate-schemas'
import type { AgeSegment } from '@/lib/payments/rates'
import { SectionCard } from './section-card'

const ageText = (s: AgeSegment) =>
  s.maxAge === null ? `${s.minAge} años o más` : `De ${s.minAge} a ${s.maxAge} años`

function SegmentFormDrawer({ segment, onClose }: { segment?: AgeSegment; onClose: () => void }) {
  const toast = useToast()
  const { catalog, actions } = useAppData()
  const [name, setName] = useState(segment?.name ?? '')
  const [min, setMin] = useState(segment ? String(segment.minAge) : '')
  const [max, setMax] = useState(segment?.maxAge != null ? String(segment.maxAge) : '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    if (min.trim() === '') {
      setErrors({ minAge: 'Indica la edad mínima' })
      return
    }
    const input = { name, minAge: Number(min), maxAge: max.trim() === '' ? null : Number(max) }
    const parsed = validate(segmentSchema, input)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    const overlap = segmentOverlap(catalog.segments, parsed.data, segment?.id)
    if (overlap) {
      setErrors({ minAge: `Las edades se solapan con «${overlap.name}»` })
      return
    }
    const saved: AgeSegment = {
      id: segment?.id ?? crypto.randomUUID(),
      ...parsed.data,
      name: parsed.data.name,
    }
    actions.setCatalog({
      ...catalog,
      segments: segment
        ? catalog.segments.map((s) => (s.id === segment.id ? saved : s))
        : [...catalog.segments, saved].sort((a, b) => a.minAge - b.minAge),
    })
    toast(segment ? 'Tramo actualizado.' : 'Tramo creado.')
    onClose()
  }

  return (
    <FormDrawer
      open
      title={segment ? 'Editar tramo de edad' : 'Nuevo tramo de edad'}
      description="La edad se calcula cada mes, el día 1."
      submitLabel={segment ? 'Guardar cambios' : 'Crear tramo'}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        id="segment-name"
        label="Nombre"
        placeholder="Niños, Adultos, Mayores…"
        value={name}
        error={errors.name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          id="segment-min"
          type="number"
          min={0}
          label="Edad mínima"
          value={min}
          error={errors.minAge}
          onChange={(e) => setMin(e.target.value)}
        />
        <TextField
          id="segment-max"
          type="number"
          min={0}
          label="Edad máxima"
          hint="Vacío = sin límite"
          value={max}
          error={errors.maxAge}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
    </FormDrawer>
  )
}

export function SegmentsSection() {
  const toast = useToast()
  const { catalog, actions } = useAppData()
  const [form, setForm] = useState<{ segment?: AgeSegment } | null>(null)
  const [deleting, setDeleting] = useState<AgeSegment | null>(null)
  const blockers = deleting ? segmentDeletionBlockers(catalog, deleting.id) : []

  return (
    <SectionCard
      title="Tramos de edad"
      description="Cada alumno paga según el tramo que le corresponde por edad. Cambia automáticamente el mes siguiente a su cumpleaños."
      actionLabel="Nuevo tramo"
      onAction={() => setForm({})}
    >
      <DataTable
        rows={catalog.segments}
        rowKey={(s) => s.id}
        columns={[
          { key: 'name', header: 'Tramo', cell: (s) => <span className="font-medium">{s.name}</span> },
          { key: 'age', header: 'Edad', cell: ageText },
          {
            key: 'actions',
            header: '',
            align: 'right',
            className: 'w-12',
            cell: (s) => (
              <RowActionsMenu
                label={`Acciones de ${s.name}`}
                actions={[
                  { label: 'Editar', onSelect: () => setForm({ segment: s }) },
                  { label: 'Eliminar', tone: 'danger', onSelect: () => setDeleting(s) },
                ]}
              />
            ),
          },
        ]}
      />
      {form ? (
        <SegmentFormDrawer
          key={form.segment?.id ?? 'new'}
          segment={form.segment}
          onClose={() => setForm(null)}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          title={blockers.length ? `No se puede eliminar «${deleting.name}»` : `Eliminar «${deleting.name}»`}
          description={
            blockers.length
              ? 'Primero quítalo de las cuotas y ofertas que lo usan:'
              : 'Esta acción no se puede deshacer.'
          }
          confirmLabel={blockers.length ? 'Entendido' : 'Eliminar'}
          tone={blockers.length ? 'primary' : 'danger'}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            if (!blockers.length) {
              actions.setCatalog({
                ...catalog,
                segments: catalog.segments.filter((s) => s.id !== deleting.id),
              })
              toast('Tramo eliminado.')
            }
            setDeleting(null)
          }}
        >
          {blockers.length ? (
            <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </SectionCard>
  )
}
