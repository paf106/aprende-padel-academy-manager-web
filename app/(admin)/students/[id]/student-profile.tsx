'use client'

import { ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge, PaymentStatusBadge } from '@/components/ds/badge'
import { Button } from '@/components/ds/button'
import { BentoCard, BentoGrid, Stat } from '@/components/ds/card'
import { EmptyState } from '@/components/ds/empty-state'
import { EntityHeader, PageContainer } from '@/components/ds/page-header'
import { useToast } from '@/components/ds/toast'
import { categoryLabels, genderLabels, levelLabels } from '@/lib/core/labels'
import { formatMoney } from '@/lib/core/money'
import type { Charge } from '@/lib/demo/billing'
import { accountById, fullName } from '@/lib/demo/data'
import { useDemo } from '@/lib/demo/use-demo'
import { StudentFormDrawer } from '../student-form-drawer'

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function StudentProfile({ id, today, charge }: { id: string; today: string; charge: Charge | null }) {
  const toast = useToast()
  const { studentById, teacherLabel, clubLabel, groups, actions } = useDemo()
  const [editing, setEditing] = useState(false)
  const student = studentById(id)

  if (!student) {
    return (
      <PageContainer>
        <EmptyState
          icon={ArrowLeft}
          title="No encontramos este alumno"
          description="Puede que se haya eliminado."
          action={
            <Link href="/students" className="text-sm font-semibold text-brand">
              Volver a alumnos
            </Link>
          }
        />
      </PageContainer>
    )
  }

  const account = accountById(student.accountId)
  const mine = groups.filter((g) => g.studentIds.includes(student.id))
  const years = Math.floor((Date.parse(today) - Date.parse(student.birthDate)) / (365.25 * 86400000))
  const otherClubs = student.extraClubIds.map((clubId) => clubLabel(clubId)).filter(Boolean)

  return (
    <PageContainer>
      <EntityHeader
        back={
          <Link
            href="/students"
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Alumnos
          </Link>
        }
        title={fullName(student)}
        subtitle={`${categoryLabels[student.category]} · ${levelLabels[student.level]} · ${years} años`}
        badge={
          <Badge tone={student.active ? 'brand' : 'neutral'}>{student.active ? 'Activo' : 'Baja'}</Badge>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                actions.setStudentActive(student.id, !student.active)
                toast(student.active ? 'Alumno dado de baja.' : 'Alumno reactivado.')
              }}
            >
              {student.active ? 'Dar de baja' : 'Reactivar'}
            </Button>
          </>
        }
      />
      <BentoGrid>
        <BentoCard span="md" title="Datos">
          <dl className="grid gap-3 text-sm">
            <Row label="Nacimiento" value={student.birthDate.split('-').reverse().join('/')} />
            <Row label="Género" value={genderLabels[student.gender]} />
            <Row label="Sede habitual" value={clubLabel(student.clubId) ?? '—'} />
            {otherClubs.length ? <Row label="Otras sedes" value={otherClubs.join(', ')} /> : null}
            <Row label="Email" value={student.email || '—'} />
            <Row label="Teléfono" value={student.phone || '—'} />
          </dl>
        </BentoCard>
        <BentoCard span="md" title="Cuenta de cobro">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{account?.name ?? 'Sin cuenta de cobro'}</p>
              <p className="text-xs text-muted-foreground">
                {account?.kind === 'individual'
                  ? 'Individual'
                  : account?.kind === 'couple'
                    ? 'Pareja'
                    : account
                      ? 'Familia'
                      : ''}
              </p>
            </div>
            {charge ? <PaymentStatusBadge status={charge.status} /> : null}
          </div>
          {charge ? (
            <Stat
              value={formatMoney(charge.balanceCents)}
              label="Pendiente este mes"
              hint={
                charge.debtCents > charge.balanceCents
                  ? `Deuda total ${formatMoney(charge.debtCents)}`
                  : undefined
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">Aún no tiene cobros este mes.</p>
          )}
        </BentoCard>
        <BentoCard span="md" title="Tutor legal">
          {student.category === 'child' ? (
            <div className="grid gap-2 text-sm">
              <p className="font-medium">{student.guardianName || 'Sin tutor'}</p>
              {student.guardianPhone ? (
                <p className="text-muted-foreground">{student.guardianPhone}</p>
              ) : null}
              <p className="flex items-center gap-2 text-success">
                <ShieldCheck size={16} aria-hidden="true" /> RGPD aceptado
              </p>
              <p className="text-muted-foreground">Autorización de imagen: sí</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No aplica: alumno adulto.</p>
          )}
        </BentoCard>
        <BentoCard span="full" title="Grupos">
          {mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no pertenece a ningún grupo.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {mine.map((g) => (
                <li key={g.id} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {clubLabel(g.clubId)} · {DAYS[g.weekday]} {g.start} · {g.duration} min ·{' '}
                    {teacherLabel(g.teacherId)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </BentoGrid>
      {editing ? <StudentFormDrawer student={student} onClose={() => setEditing(false)} /> : null}
    </PageContainer>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}
