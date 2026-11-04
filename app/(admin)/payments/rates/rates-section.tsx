'use client'

import { useState } from 'react'
import { MoneyInput } from '@/components/ds/money-input'
import { useToast } from '@/components/ds/toast'
import { useDemo } from '@/lib/demo/use-demo'
import { SectionCard } from './section-card'

const MAX_FREQUENCY = 7

export function RatesSection() {
  const toast = useToast()
  const { catalog, billing, actions } = useDemo()
  const [extra, setExtra] = useState<number[]>([])
  const frequencies = [...new Set([1, 2, ...catalog.rates.map((r) => r.classesPerWeek), ...extra])].sort(
    (a, b) => a - b,
  )
  const next = Math.max(...frequencies) + 1

  const setRate = (segmentId: string, classesPerWeek: number, cents: number | null) => {
    const others = catalog.rates.filter(
      (r) => !(r.segmentId === segmentId && r.classesPerWeek === classesPerWeek),
    )
    actions.setCatalog({
      ...catalog,
      rates: cents === null ? others : [...others, { segmentId, classesPerWeek, monthlyCents: cents }],
    })
    toast(cents === null ? 'Cuota eliminada.' : 'Cuota guardada.')
  }

  return (
    <SectionCard
      title="Cuotas individuales"
      description={`Precio mensual de cada persona según su tramo de edad y los días que viene por semana. Incluye ${billing.includedPerWeeklyClass} clases por cada día a la semana. Deja una casilla vacía si no existe esa cuota.`}
      actionLabel={next <= MAX_FREQUENCY ? `Añadir ${next} días por semana` : undefined}
      onAction={() => setExtra((list) => [...list, next])}
    >
      {catalog.segments.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Crea primero algún tramo de edad.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-3 font-medium">
                  Tramo de edad
                </th>
                {frequencies.map((frequency) => (
                  <th key={frequency} scope="col" className="px-3 py-3 text-right font-medium">
                    {frequency} {frequency === 1 ? 'día' : 'días'}/semana
                    <span className="block font-normal">
                      {frequency * billing.includedPerWeeklyClass} clases
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalog.segments.map((segment) => (
                <tr key={segment.id} className="border-b border-border/60 last:border-0">
                  <th scope="row" className="px-5 py-3 text-left font-medium">
                    {segment.name}
                  </th>
                  {frequencies.map((frequency) => (
                    <td key={frequency} className="px-3 py-2 text-right">
                      <MoneyInput
                        aria-label={`${segment.name}, ${frequency} ${frequency === 1 ? 'día' : 'días'} por semana`}
                        className="ml-auto w-28 text-right"
                        valueCents={
                          catalog.rates.find(
                            (r) => r.segmentId === segment.id && r.classesPerWeek === frequency,
                          )?.monthlyCents ?? null
                        }
                        onCommit={(cents) => setRate(segment.id, frequency, cents)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Los cambios se guardan al salir de cada casilla y se aplican a los cobros desde este mismo mes.
      </p>
    </SectionCard>
  )
}
