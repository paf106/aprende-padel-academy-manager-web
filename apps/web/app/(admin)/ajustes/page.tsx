import { defaultCapacity, moduleLabels, type ModuleId } from '@aprende-padel/core'
import { modules } from '@aprende-padel/module-kit'
import Link from 'next/link'
import { Badge } from '../../../components/ds/badge'
import { BentoCard, BentoGrid } from '../../../components/ds/card'
import { PageContainer, PageHeader } from '../../../components/ds/page-header'

export const metadata = { title: 'Ajustes | AprendePadel' }

export default function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader title="Ajustes" description="Módulos contratados y reglas de la organización" />
      <BentoGrid>
        <BentoCard span="lg" title="Módulos">
          <ul className="divide-y divide-border">
            {modules.map((module) => (
              <li key={module.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="font-medium">{moduleLabels[module.id as ModuleId]}</span>
                  <span className="block text-xs text-muted-foreground">{module.description}</span>
                </span>
                <Badge tone={module.status === 'active' ? 'brand' : 'neutral'}>
                  {module.status === 'active' ? 'Disponible' : 'Próximamente'}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            La contratación de módulos la gestiona el equipo de plataforma.
          </p>
        </BentoCard>
        <BentoCard span="lg" title="Reglas de clase">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Aforo adultos</dt>
              <dd className="font-semibold">{defaultCapacity.adult}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Aforo niños</dt>
              <dd className="font-semibold">{defaultCapacity.child}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Duración habitual</dt>
              <dd className="font-semibold">60 min (o 90 min)</dd>
            </div>
          </dl>
          <Link href="/pagos?vista=tarifas" className="text-sm font-medium text-brand">
            Editar tarifas y pago a profesores
          </Link>
        </BentoCard>
      </BentoGrid>
    </PageContainer>
  )
}
