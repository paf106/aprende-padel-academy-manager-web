'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid, Stat } from '@/components/ds/card'
import { EmptyState } from '@/components/ds/empty-state'
import { EntityHeader, PageContainer } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import { categoryLabels, levelLabels } from '@/lib/core/labels'
import { formatMoney } from '@/lib/core/money'
import { buildSettlements } from '@/lib/data/billing'
import { teacherName } from '@/lib/data/types'
import { useAppData } from '@/lib/data/provider'
import { TeacherFormDrawer } from '../teacher-form-drawer'

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function TeacherProfile({ id, today }: { id: string; today: string }) {
  const toast = useToast()
  const demo = useAppData()
  const { teacherById, clubLabel, groups, actions } = demo
  const settlement = buildSettlements(demo, today).find((s) => s.teacherId === id) ?? null
  const paid = demo.teacherSettlements.find((s) => s.teacherId === id && s.month === today.slice(0, 7))
  const [editing, setEditing] = useState(false)
  const teacher = teacherById(id)

  if (!teacher) {
    return (
      <PageContainer>
        <EmptyState
          icon={ArrowLeft}
          title="No encontramos este profesor"
          description="Puede que se haya eliminado."
          action={
            <Link href="/teachers" className="text-sm font-semibold text-brand">
              Volver a profesores
            </Link>
          }
        />
      </PageContainer>
    )
  }

  const mine = groups.filter((g) => g.teacherId === teacher.id)

  return (
    <PageContainer>
      <EntityHeader
        back={
          <Link
            href="/teachers"
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Profesores
          </Link>
        }
        title={teacherName(teacher)}
        subtitle={teacher.clubIds.map((clubId) => clubLabel(clubId)).join(' · ')}
        badge={
          <Badge tone={teacher.active ? 'brand' : 'neutral'}>{teacher.active ? 'Activo' : 'Baja'}</Badge>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                actions.setTeacherActive(teacher.id, !teacher.active)
                if (!teacher.active) toast('Profesor reactivado.')
                else if (mine.length > 0)
                  toast('Profesor dado de baja. Reasigna sus grupos para que no queden sin profesor.')
                else toast('Profesor dado de baja.')
              }}
            >
              {teacher.active ? 'Dar de baja' : 'Reactivar'}
            </Button>
          </>
        }
      />
      <BentoGrid>
        <BentoCard span="md" title="Contacto">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{teacher.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Teléfono</dt>
              <dd>{teacher.phone}</dd>
            </div>
          </dl>
        </BentoCard>
        <BentoCard span="md" title="Liquidación del mes">
          <Stat
            value={formatMoney(settlement?.totalCents ?? 0)}
            label="A liquidar"
            hint={`${settlement?.sessions ?? 0} clases terminadas · ${settlement?.hours ?? 0} h`}
          />
          <p className="text-xs text-muted-foreground">
            {paid
              ? `Pagada el ${paid.paidOn.split('-').reverse().join('/')} · ${formatMoney(paid.amountCents)}`
              : 'Pendiente de pago'}
          </p>
        </BentoCard>
        <BentoCard span="md" title="Sedes">
          <ul className="flex flex-wrap gap-1.5">
            {teacher.clubIds.map((clubId) => (
              <li key={clubId} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                {clubLabel(clubId)}
              </li>
            ))}
          </ul>
        </BentoCard>
        <BentoCard span="full" title="Grupos que imparte">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no imparte ningún grupo.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {mine.map((g) => (
                <li key={g.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {clubLabel(g.clubId)} · {DAYS[g.weekday]} {g.start} · {g.duration} min ·{' '}
                    {categoryLabels[g.category]} · {levelLabels[g.level]}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </BentoGrid>
      {editing ? <TeacherFormDrawer teacher={teacher} onClose={() => setEditing(false)} /> : null}
    </PageContainer>
  )
}
