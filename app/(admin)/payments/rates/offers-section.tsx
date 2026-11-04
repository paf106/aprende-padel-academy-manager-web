'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/crud/confirm-dialog'
import { FormDrawer } from '@/components/crud/form-drawer'
import { RowActionsMenu } from '@/components/crud/row-actions-menu'
import { Badge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { DataTable } from '@/components/ds/data-table'
import { Field, MultiSelectField, SelectField, TextField } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { MoneyInput } from '@/components/ds/money-input'
import { useToast } from '@/components/ds/toast'
import { formatMoney } from '@/lib/core/money'
import { validate } from '@/lib/core/validation'
import { useAppData } from '@/lib/data/provider'
import { courseCatalog } from '@/lib/payments/courses'
import {
  emptyOfferInput,
  offerIndividualTotal,
  offerSchema,
  type OfferInput,
} from '@/lib/payments/rate-schemas'
import { packSize, type PackOffer, type RateCatalog } from '@/lib/payments/rates'
import { SectionCard } from './section-card'

export type OfferScope = 'monthly' | 'course'

const frequencyOptions = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  value: String(n),
  label: `${n} ${n === 1 ? 'día' : 'días'} por semana`,
}))

function compositionText(catalog: RateCatalog, offer: Pick<PackOffer, 'composition'>) {
  return offer.composition
    .map((slot) => {
      const names = slot.segmentIds.map((id) => catalog.segments.find((s) => s.id === id)?.name ?? '?')
      return `${slot.count} × ${names.join(' o ')}`
    })
    .join(' + ')
}

/** Offers of the monthly fees, or of the closed-price courses, behind the same editing interface. */
function useOffers(scope: OfferScope) {
  const { catalog, coursePrices, actions } = useAppData()
  const isCourse = scope === 'course'
  return {
    isCourse,
    catalog: isCourse ? courseCatalog(catalog.segments, coursePrices) : catalog,
    offers: isCourse ? coursePrices.offers : catalog.offers,
    save: (offers: PackOffer[]) =>
      isCourse
        ? actions.setCoursePrices({ ...coursePrices, offers })
        : actions.setCatalog({ ...catalog, offers }),
  }
}

function OfferFormDrawer({
  offer,
  scope,
  onClose,
}: {
  offer?: PackOffer
  scope: OfferScope
  onClose: () => void
}) {
  const toast = useToast()
  const { isCourse, catalog, offers, save } = useOffers(scope)
  const [values, setValues] = useState<OfferInput>(
    offer
      ? {
          name: offer.name,
          classesPerWeek: offer.classesPerWeek,
          priceCents: offer.priceCents,
          composition: offer.composition,
          active: offer.active,
        }
      : emptyOfferInput(),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const segmentOptions = catalog.segments.map((s) => ({ value: s.id, label: s.name }))
  const individual = offerIndividualTotal(catalog, values)

  const submit = () => {
    const parsed = validate(offerSchema, values)
    if (!parsed.ok) {
      setErrors(parsed.errors)
      return
    }
    const saved: PackOffer = { id: offer?.id ?? crypto.randomUUID(), ...parsed.data }
    save(offer ? offers.map((o) => (o.id === offer.id ? saved : o)) : [...offers, saved])
    toast(offer ? 'Oferta actualizada.' : 'Oferta creada.')
    onClose()
  }

  const setSlot = (index: number, change: Partial<OfferInput['composition'][number]>) =>
    setValues((v) => ({
      ...v,
      composition: v.composition.map((slot, i) => (i === index ? { ...slot, ...change } : slot)),
    }))

  return (
    <FormDrawer
      open
      title={offer ? 'Editar oferta' : 'Nueva oferta combinada'}
      description="Un precio cerrado para un grupo de personas, por ejemplo una familia."
      submitLabel={offer ? 'Guardar cambios' : 'Crear oferta'}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        id="offer-name"
        label="Nombre"
        placeholder="Familia de 3 miembros"
        value={values.name}
        error={errors.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
      />
      <div className="grid grid-cols-2 gap-3">
        {isCourse ? (
          <span />
        ) : (
          <SelectField
            label="Días por semana"
            value={String(values.classesPerWeek)}
            onChange={(v) => setValues((x) => ({ ...x, classesPerWeek: Number(v) }))}
            options={frequencyOptions}
          />
        )}
        <Field label={isCourse ? 'Precio del curso (€)' : 'Precio al mes (€)'} error={errors.priceCents}>
          <MoneyInput
            aria-label="Precio"
            valueCents={values.priceCents}
            onCommit={(cents) => setValues((v) => ({ ...v, priceCents: cents ?? 0 }))}
          />
        </Field>
      </div>
      <fieldset className="grid gap-3 rounded-2xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Quién entra en la oferta</legend>
        {values.composition.map((slot, index) => (
          <div key={index} className="grid gap-2 rounded-xl bg-muted/50 p-3">
            <div className="flex items-end gap-2">
              <Field label="Personas" className="w-24">
                <Input
                  type="number"
                  min={1}
                  aria-label={`Personas de la fila ${index + 1}`}
                  value={slot.count}
                  onChange={(e) => setSlot(index, { count: Number(e.target.value) })}
                />
              </Field>
              {values.composition.length > 1 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar fila ${index + 1}`}
                  onClick={() =>
                    setValues((v) => ({ ...v, composition: v.composition.filter((_, i) => i !== index) }))
                  }
                >
                  <Trash2 size={16} aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <MultiSelectField
              label="De cualquiera de estos tramos"
              value={slot.segmentIds}
              onChange={(ids) => setSlot(index, { segmentIds: ids })}
              options={segmentOptions}
            />
          </div>
        ))}
        {errors.composition ? (
          <p role="alert" className="text-xs text-danger">
            {errors.composition}
          </p>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() =>
            setValues((v) => ({ ...v, composition: [...v.composition, { count: 1, segmentIds: [] }] }))
          }
        >
          <Plus size={14} aria-hidden="true" />
          Añadir fila
        </Button>
      </fieldset>
      <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
        {packSize(values)} personas · {compositionText(catalog, values) || 'sin tramos'}.{' '}
        {individual === null
          ? 'Faltan cuotas individuales para calcular el ahorro.'
          : values.priceCents < individual
            ? `Ahorro de ${formatMoney(individual - values.priceCents)} frente a pagar por separado (${formatMoney(individual)}).`
            : `No compensa: por separado costaría ${formatMoney(individual)}.`}
      </p>
    </FormDrawer>
  )
}

export function OffersSection({ scope = 'monthly' }: { scope?: OfferScope }) {
  const toast = useToast()
  const { isCourse, catalog, offers, save } = useOffers(scope)
  const [form, setForm] = useState<{ offer?: PackOffer } | null>(null)
  const [deleting, setDeleting] = useState<PackOffer | null>(null)

  const update = (id: string, change: Partial<PackOffer>) =>
    save(offers.map((o) => (o.id === id ? { ...o, ...change } : o)))

  return (
    <SectionCard
      title={isCourse ? 'Ofertas combinadas de cursos' : 'Ofertas combinadas'}
      description={
        isCourse
          ? 'Precio cerrado para familias o parejas que se inscriben juntas al mismo curso. Si falta alguien se cobran los precios individuales.'
          : 'Precio cerrado para familias o parejas. Solo se aplica cuando todos los miembros de la oferta vienen ese mes y los mismos días por semana. Si falta alguien, se cobra la mejor oferta que encaje o las cuotas individuales.'
      }
      actionLabel="Nueva oferta"
      onAction={() => setForm({})}
    >
      <DataTable
        rows={offers}
        rowKey={(o) => o.id}
        columns={[
          { key: 'name', header: 'Oferta', cell: (o) => <span className="font-medium">{o.name}</span> },
          ...(isCourse
            ? []
            : [
                {
                  key: 'freq',
                  header: 'Días/semana',
                  align: 'right' as const,
                  cell: (o: PackOffer) => o.classesPerWeek,
                },
              ]),
          {
            key: 'who',
            header: 'Quién entra',
            cell: (o) => <span className="text-muted-foreground">{compositionText(catalog, o)}</span>,
          },
          {
            key: 'price',
            header: 'Precio',
            align: 'right',
            cell: (o) => <span className="font-semibold">{formatMoney(o.priceCents)}</span>,
          },
          {
            key: 'saving',
            header: 'Ahorro',
            align: 'right',
            cell: (o) => {
              const total = offerIndividualTotal(catalog, o)
              if (total === null) return '—'
              return total > o.priceCents ? (
                formatMoney(total - o.priceCents)
              ) : (
                <Badge tone="warning">No compensa</Badge>
              )
            },
          },
          {
            key: 'state',
            header: 'Estado',
            cell: (o) => (
              <button
                type="button"
                aria-pressed={o.active}
                onClick={() => update(o.id, { active: !o.active })}
                className="cursor-pointer"
              >
                <Badge tone={o.active ? 'brand' : 'neutral'}>{o.active ? 'Activa' : 'Desactivada'}</Badge>
              </button>
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            className: 'w-12',
            cell: (o) => (
              <RowActionsMenu
                label={`Acciones de ${o.name}`}
                actions={[
                  { label: 'Editar', onSelect: () => setForm({ offer: o }) },
                  {
                    label: o.active ? 'Desactivar' : 'Activar',
                    onSelect: () => update(o.id, { active: !o.active }),
                  },
                  { label: 'Eliminar', tone: 'danger', onSelect: () => setDeleting(o) },
                ]}
              />
            ),
          },
        ]}
      />
      {form ? (
        <OfferFormDrawer
          key={form.offer?.id ?? 'new'}
          offer={form.offer}
          scope={scope}
          onClose={() => setForm(null)}
        />
      ) : null}
      {deleting ? (
        <ConfirmDialog
          open
          title={`Eliminar «${deleting.name}»`}
          description="Los cobros futuros dejarán de usar esta oferta. Los pagos ya registrados no cambian."
          confirmLabel="Eliminar"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            save(offers.filter((o) => o.id !== deleting.id))
            setDeleting(null)
            toast('Oferta eliminada.')
          }}
        />
      ) : null}
    </SectionCard>
  )
}
