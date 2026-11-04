'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ds/tabs'
import { OffersSection } from './rates/offers-section'
import { OverridesSection } from './rates/overrides-section'
import { RatesSection } from './rates/rates-section'
import { SegmentsSection } from './rates/segments-section'
import { SimulatorSection } from './rates/simulator-section'
import { TeacherPaySection } from './rates/teacher-pay-section'

type Section = 'rates' | 'offers' | 'segments' | 'overrides' | 'teachers' | 'simulator'

export function RatesTab({ month }: { month: string }) {
  const [section, setSection] = useState<Section>('rates')
  return (
    <>
      <Tabs
        label="Tipo de tarifa"
        value={section}
        onChange={(v) => setSection(v as Section)}
        tabs={[
          { value: 'rates', label: 'Cuotas' },
          { value: 'offers', label: 'Ofertas' },
          { value: 'segments', label: 'Tramos de edad' },
          { value: 'overrides', label: 'Precios fijados' },
          { value: 'teachers', label: 'Pago a profesores' },
          { value: 'simulator', label: 'Simulador' },
        ]}
      />
      {section === 'rates' ? <RatesSection /> : null}
      {section === 'offers' ? <OffersSection /> : null}
      {section === 'segments' ? <SegmentsSection /> : null}
      {section === 'overrides' ? <OverridesSection month={month} /> : null}
      {section === 'teachers' ? <TeacherPaySection /> : null}
      {section === 'simulator' ? <SimulatorSection month={month} /> : null}
    </>
  )
}
