'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { defaultCapacity } from '@/lib/classes/capacity'
import { defaultTeacherRates } from '@/lib/payments/teacher-pay'
import { formatMoney } from '@/lib/core/money'
import { Button } from '@/components/ds/button'
import { Card } from '@/components/ds/card'
import { Input, Label } from '@/components/ds/input'
import { PageContainer } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import { useAppData } from '@/lib/data/provider'

const steps = ['Sedes', 'Pistas', 'Tarifas', 'Reglas de pago', 'Alumnos'] as const

export function OnboardingView() {
  const toast = useToast()
  const { clubs, catalog } = useAppData()
  const [step, setStep] = useState(0)
  const [sites, setSites] = useState(clubs.map((c) => c.name))
  const [courts, setCourts] = useState(Object.fromEntries(clubs.map((c) => [c.id, c.courts])))
  const last = step === steps.length - 1

  return (
    <PageContainer>
      <h1 className="sr-only">Configuración inicial</h1>
      <ol className="flex flex-wrap gap-2" aria-label="Pasos">
        {steps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              aria-current={index === step ? 'step' : undefined}
              onClick={() => setStep(index)}
              className={`flex h-9 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium ${index === step ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-card text-muted-foreground'}`}
            >
              {index < step ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <span className="tabular-nums">{index + 1}</span>
              )}
              {label}
            </button>
          </li>
        ))}
      </ol>
      <Card className="p-6">
        {step === 0 ? (
          <div className="grid max-w-md gap-3">
            <h2 className="text-lg font-semibold">Sedes o escuelas</h2>
            {sites.map((name, i) => (
              <Input
                key={i}
                aria-label={`Sede ${i + 1}`}
                value={name}
                onChange={(e) => setSites((s) => s.map((x, j) => (j === i ? e.target.value : x)))}
              />
            ))}
            <Button variant="secondary" className="w-fit" onClick={() => setSites((s) => [...s, ''])}>
              Añadir sede
            </Button>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="grid max-w-md gap-3">
            <h2 className="text-lg font-semibold">Pistas por sede</h2>
            {clubs.map((club) => (
              <div key={club.id} className="flex items-center justify-between gap-4">
                <Label htmlFor={`courts-${club.id}`}>{club.name}</Label>
                <Input
                  id={`courts-${club.id}`}
                  type="number"
                  min={1}
                  className="w-24"
                  value={courts[club.id]}
                  onChange={(e) => setCourts((c) => ({ ...c, [club.id]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        ) : null}
        {step === 2 ? (
          <div className="grid max-w-md gap-2">
            <h2 className="text-lg font-semibold">Cuotas mensuales</h2>
            {catalog.rates
              .filter((rate) => rate.classesPerWeek === 1)
              .map((rate) => (
                <p key={rate.segmentId} className="flex justify-between text-sm">
                  <span>{catalog.segments.find((s) => s.id === rate.segmentId)?.name}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(rate.monthlyCents)}</span>
                </p>
              ))}
            <p className="text-sm text-muted-foreground">
              {catalog.offers.filter((o) => o.active).length} ofertas combinadas activas.
            </p>
            <p className="text-sm text-muted-foreground">Podrás editarlas en Pagos → Tarifas.</p>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="grid max-w-md gap-2 text-sm">
            <h2 className="text-lg font-semibold">Reglas por defecto</h2>
            <p>
              Aforo: adultos {defaultCapacity.adult}, niños {defaultCapacity.child}.
            </p>
            <p>
              Profesor: {formatMoney(defaultTeacherRates.adult.belowCents)}/h con menos de{' '}
              {defaultTeacherRates.adult.threshold} alumnos y{' '}
              {formatMoney(defaultTeacherRates.adult.atOrAboveCents)}/h desde{' '}
              {defaultTeacherRates.adult.threshold}.
            </p>
            <p className="text-muted-foreground">Ajustables en Pagos → Tarifas.</p>
          </div>
        ) : null}
        {step === 4 ? (
          <div className="grid max-w-md gap-3 text-sm">
            <h2 className="text-lg font-semibold">Importa tus alumnos</h2>
            <p className="text-muted-foreground">
              Sube un CSV con tus alumnos actuales o empieza desde cero.
            </p>
            <Link
              href="/import"
              className="w-fit rounded-full border border-border px-4 py-2 font-medium hover:bg-muted"
            >
              Ir a importar
            </Link>
          </div>
        ) : null}
        <div className="mt-8 flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Atrás
          </Button>
          <Button
            onClick={() =>
              last
                ? toast(`Configuración completada: ${sites.filter(Boolean).length} sedes.`)
                : setStep((s) => s + 1)
            }
          >
            {last ? 'Terminar' : 'Siguiente'}
          </Button>
        </div>
      </Card>
    </PageContainer>
  )
}
