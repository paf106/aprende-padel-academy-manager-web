'use client'

import { useState } from 'react'
import { BentoCard, BentoGrid } from '@/components/ds/card'
import { Button } from '@/components/ds/button'
import { Input, Label } from '@/components/ds/input'
import { useToast } from '@/components/ds/toast'
import { formatMoney } from '@/lib/core/money'
import { useDemo } from '@/lib/demo/use-demo'
import type { TeacherRates } from '@/lib/payments/teacher-pay'

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')
const toCents = (value: string) => Math.round(Number(value.replace(',', '.')) * 100) || 0

export function RatesTab() {
  const toast = useToast()
  const { catalog, teacherRates, actions } = useDemo()
  const [rates, setRates] = useState<TeacherRates>(teacherRates)

  return (
    <BentoGrid>
      <BentoCard span="lg" title="Cuotas mensuales de alumnos">
        <ul className="grid gap-2 text-sm">
          {catalog.rates.map((rate) => (
            <li key={`${rate.segmentId}-${rate.classesPerWeek}`} className="flex justify-between gap-3">
              <span>
                {catalog.segments.find((s) => s.id === rate.segmentId)?.name} · {rate.classesPerWeek}{' '}
                {rate.classesPerWeek === 1 ? 'día' : 'días'}/semana
              </span>
              <span className="font-semibold tabular-nums">{formatMoney(rate.monthlyCents)}</span>
            </li>
          ))}
        </ul>
      </BentoCard>
      <BentoCard span="lg" title="Pago a profesores (€/hora)">
        <div className="grid gap-4">
          {(['adult', 'child'] as const).map((category) => (
            <fieldset key={category} className="grid grid-cols-3 gap-3">
              <legend className="mb-2 text-sm font-medium">
                {category === 'adult' ? 'Adultos' : 'Niños'}
              </legend>
              <div>
                <Label>Umbral alumnos</Label>
                <Input
                  type="number"
                  min={1}
                  value={rates[category].threshold}
                  onChange={(e) =>
                    setRates((r) => ({
                      ...r,
                      [category]: { ...r[category], threshold: Number(e.target.value) },
                    }))
                  }
                />
              </div>
              <div>
                <Label>Menos del umbral</Label>
                <Input
                  inputMode="decimal"
                  defaultValue={euros(rates[category].belowCents)}
                  onChange={(e) =>
                    setRates((r) => ({
                      ...r,
                      [category]: { ...r[category], belowCents: toCents(e.target.value) },
                    }))
                  }
                />
              </div>
              <div>
                <Label>Desde el umbral</Label>
                <Input
                  inputMode="decimal"
                  defaultValue={euros(rates[category].atOrAboveCents)}
                  onChange={(e) =>
                    setRates((r) => ({
                      ...r,
                      [category]: { ...r[category], atOrAboveCents: toCents(e.target.value) },
                    }))
                  }
                />
              </div>
            </fieldset>
          ))}
        </div>
        <Button
          className="mt-2 self-start"
          onClick={() => {
            actions.setTeacherRates(rates)
            toast('Reglas de pago guardadas.')
          }}
        >
          Guardar reglas
        </Button>
      </BentoCard>
    </BentoGrid>
  )
}
