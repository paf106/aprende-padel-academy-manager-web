'use client'

import { MoneyInput } from '@/components/ds/money-input'
import { useToast } from '@/components/ds/toast'
import { useAppData } from '@/lib/data/provider'
import { SectionCard } from './section-card'

/** Closed price of a course for each age segment. Combined offers are edited in the offers section. */
export function CoursePricesSection() {
  const toast = useToast()
  const { catalog, coursePrices, actions } = useAppData()

  const setPrice = (segmentId: string, cents: number | null) => {
    const others = coursePrices.rates.filter((r) => r.segmentId !== segmentId)
    actions.setCoursePrices({
      ...coursePrices,
      rates: cents === null ? others : [...others, { segmentId, priceCents: cents }],
    })
    toast(cents === null ? 'Precio eliminado.' : 'Precio guardado.')
  }

  return (
    <SectionCard
      title="Precios de los cursos"
      description="Pago único por curso (por ejemplo el intensivo de verano) según el tramo de edad del alumno el primer día del curso. Se suma al cobro del mes en que empieza."
    >
      {catalog.segments.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Crea primero algún tramo de edad.</p>
      ) : (
        <ul className="divide-y divide-border">
          {catalog.segments.map((segment) => (
            <li key={segment.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span className="font-medium">{segment.name}</span>
              <MoneyInput
                aria-label={`Precio del curso: ${segment.name}`}
                className="w-28 text-right"
                valueCents={coursePrices.rates.find((r) => r.segmentId === segment.id)?.priceCents ?? null}
                onCommit={(cents) => setPrice(segment.id, cents)}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
