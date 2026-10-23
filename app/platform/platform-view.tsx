'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/core/money'
import { moduleLabels } from '@/lib/core/labels'
import { type ModuleId } from '@/lib/core/types'
import { Badge } from '@/components/ds/badge'
import { Card } from '@/components/ds/card'
import { PageContainer, PageHeader } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'

type Org = { id: string; name: string; clubCount: number; modules: Record<ModuleId, boolean>; paid: boolean }
const price: Record<ModuleId, number> = { classes: 4900, payments: 3900, courts: 2900, inventory: 1900 }

export function PlatformView() {
  const toast = useToast()
  const [orgs, setOrgs] = useState<Org[]>([
    {
      id: 'aprende',
      name: 'AprendePadel Academy',
      clubCount: 4,
      modules: { classes: true, payments: true, courts: false, inventory: false },
      paid: true,
    },
    {
      id: 'club-norte',
      name: 'Club Pádel Norte',
      clubCount: 1,
      modules: { classes: true, payments: false, courts: true, inventory: false },
      paid: false,
    },
  ])
  const monthly = (org: Org) =>
    (Object.keys(org.modules) as ModuleId[]).reduce((s, m) => s + (org.modules[m] ? price[m] : 0), 0)

  return (
    <PageContainer>
      <PageHeader title="Plataforma" description="Organizaciones, módulos contratados y facturación manual" />
      <div className="grid gap-4">
        {orgs.map((org) => (
          <Card key={org.id} className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{org.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {org.clubCount} sedes · {formatMoney(monthly(org))}/mes
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrgs((list) => list.map((o) => (o.id === org.id ? { ...o, paid: !o.paid } : o)))
                  toast('Factura del mes actualizada.')
                }}
                className="cursor-pointer"
                aria-label={`Marcar factura de ${org.name}`}
              >
                <Badge tone={org.paid ? 'brand' : 'danger'}>
                  {org.paid ? 'Factura pagada' : 'Factura pendiente'}
                </Badge>
              </button>
            </div>
            <ul className="flex flex-wrap gap-2">
              {(Object.keys(org.modules) as ModuleId[]).map((module) => (
                <li key={module}>
                  <button
                    type="button"
                    aria-pressed={org.modules[module]}
                    onClick={() =>
                      setOrgs((list) =>
                        list.map((o) =>
                          o.id === org.id
                            ? { ...o, modules: { ...o.modules, [module]: !o.modules[module] } }
                            : o,
                        ),
                      )
                    }
                    className={`h-9 cursor-pointer rounded-full border px-4 text-sm font-medium ${org.modules[module] ? 'border-brand bg-brand-soft text-brand' : 'border-border bg-card text-muted-foreground'}`}
                  >
                    {moduleLabels[module]} · {formatMoney(price[module])}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Vista de demostración: la activación real de módulos se hará con funciones SQL protegidas.
      </p>
    </PageContainer>
  )
}
