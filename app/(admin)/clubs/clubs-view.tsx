'use client'

import { CalendarOff, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid } from '@/components/ds/card'
import { Dropdown } from '@/components/ds/dropdown'
import { Input, Label } from '@/components/ds/input'
import { PageContainer } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import type { Closure } from '@/lib/classes/closures'
import { clubs, groups, initialClosures, students } from '@/lib/demo/data'

export function ClubsView() {
  const toast = useToast()
  const [closures, setClosures] = useState<Closure[]>(initialClosures)
  const [clubId, setClubId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')

  const add = () => {
    if (!from || !to || !reason.trim() || to < from) {
      toast('Indica un rango de fechas válido y el motivo.', 'error')
      return
    }
    setClosures((list) => [...list, { id: Date.now(), clubId, from, to, reason: reason.trim() }])
    setFrom('')
    setTo('')
    setReason('')
    toast('Cierre añadido. No se generarán clases esos días ni contarán en el prorrateo.')
  }

  return (
    <PageContainer>
      <h1 className="sr-only">Sedes</h1>
      <BentoGrid>
        {clubs.map((club) => (
          <BentoCard key={club.id} span="md" title={`${club.courts} pistas`}>
            <h2 className="text-lg font-semibold">{club.name}</h2>
            <p className="text-sm text-muted-foreground">
              {groups.filter((g) => g.clubId === club.id).length} grupos ·{' '}
              {students.filter((s) => s.clubId === club.id && s.active).length} alumnos
            </p>
          </BentoCard>
        ))}
        <BentoCard span="xl" title="Festivos y vacaciones">
          <ul className="divide-y divide-border">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3 text-sm">
                <CalendarOff size={16} aria-hidden="true" className="text-muted-foreground" />
                <span className="flex-1">
                  <span className="font-medium">{c.reason}</span>
                  <span className="ml-2 text-muted-foreground">
                    {c.clubId ? clubs.find((x) => x.id === c.clubId)?.name : 'Todas las sedes'}
                  </span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {c.from.split('-').reverse().join('/')}
                  {c.to !== c.from ? ` – ${c.to.split('-').reverse().join('/')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </BentoCard>
        <BentoCard span="md" title="Añadir cierre">
          <div className="grid gap-3">
            <Dropdown
              aria-label="Sede"
              allLabel="Todas las sedes"
              value={clubId}
              onChange={setClubId}
              options={clubs.map((c) => ({ value: c.id, label: c.name }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="closure-from">Desde</Label>
                <Input id="closure-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="closure-to">Hasta</Label>
                <Input id="closure-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <Input
              aria-label="Motivo"
              placeholder="Motivo (festivo, vacaciones…)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button onClick={add}>
              <Plus size={16} aria-hidden="true" />
              Añadir
            </Button>
          </div>
        </BentoCard>
      </BentoGrid>
    </PageContainer>
  )
}
