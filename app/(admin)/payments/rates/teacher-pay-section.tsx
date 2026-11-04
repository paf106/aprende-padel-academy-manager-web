'use client'

import { useState } from 'react'
import { Button } from '@/components/ds/button'
import { Field } from '@/components/ds/field'
import { Input } from '@/components/ds/input'
import { MoneyInput } from '@/components/ds/money-input'
import { useToast } from '@/components/ds/toast'
import { categoryLabels } from '@/lib/core/labels'
import { useAppData } from '@/lib/data/provider'
import type { TeacherRates } from '@/lib/payments/teacher-pay'
import { SectionCard } from './section-card'

export function TeacherPaySection() {
  const toast = useToast()
  const { teacherRates, actions } = useAppData()
  const [rates, setRates] = useState<TeacherRates>(teacherRates)

  return (
    <SectionCard
      title="Pago a profesores"
      description="Tarifa por hora según los alumnos inscritos en la clase. Solo se pagan las clases terminadas."
    >
      <div className="grid gap-6 p-5">
        {(['adult', 'child'] as const).map((category) => (
          <fieldset key={category} className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold">{categoryLabels[category]}</legend>
            <Field label="Alumnos para la tarifa alta">
              <Input
                type="number"
                min={1}
                aria-label={`Umbral de alumnos de ${categoryLabels[category]}`}
                value={rates[category].threshold}
                onChange={(e) =>
                  setRates((r) => ({
                    ...r,
                    [category]: { ...r[category], threshold: Number(e.target.value) },
                  }))
                }
              />
            </Field>
            <Field label="€/hora con menos alumnos">
              <MoneyInput
                aria-label={`Tarifa baja de ${categoryLabels[category]}`}
                valueCents={rates[category].belowCents}
                onCommit={(cents) =>
                  setRates((r) => ({ ...r, [category]: { ...r[category], belowCents: cents ?? 0 } }))
                }
              />
            </Field>
            <Field label="€/hora desde el umbral">
              <MoneyInput
                aria-label={`Tarifa alta de ${categoryLabels[category]}`}
                valueCents={rates[category].atOrAboveCents}
                onCommit={(cents) =>
                  setRates((r) => ({ ...r, [category]: { ...r[category], atOrAboveCents: cents ?? 0 } }))
                }
              />
            </Field>
          </fieldset>
        ))}
        <Button
          className="w-fit"
          onClick={() => {
            actions.setTeacherRates(rates)
            toast('Reglas de pago guardadas.')
          }}
        >
          Guardar reglas
        </Button>
      </div>
    </SectionCard>
  )
}
