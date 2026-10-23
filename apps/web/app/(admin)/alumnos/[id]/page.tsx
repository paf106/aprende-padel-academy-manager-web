import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { localTodayInTimeZone, money } from '@aprende-padel/core'
import { Badge, PaymentStatusBadge } from '../../../../components/ds/badge'
import { BentoCard, BentoGrid, Stat } from '../../../../components/ds/card'
import { PageContainer, PageHeader } from '../../../../components/ds/page-header'
import { buildCharges } from '../../../../lib/demo-billing'
import {
  accountById,
  categoryLabels,
  clubById,
  fullName,
  groups,
  levelLabels,
  studentById,
  teacherById,
} from '../../../../lib/demo-data'

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const student = studentById(id)
  if (!student) notFound()
  const today = localTodayInTimeZone('Europe/Madrid')
  const account = accountById(student.accountId)
  const charge = buildCharges(today).find((c) => c.account.id === student.accountId)
  const mine = groups.filter((g) => g.studentIds.includes(student.id))
  const years = Math.floor((Date.parse(today) - Date.parse(student.birthDate)) / (365.25 * 86400000))

  return (
    <PageContainer>
      <Link
        href="/alumnos"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Alumnos
      </Link>
      <PageHeader
        title={fullName(student)}
        description={`${categoryLabels[student.category]} · ${levelLabels[student.level]} · ${years} años`}
        actions={
          <Badge tone={student.active ? 'brand' : 'neutral'}>{student.active ? 'Activo' : 'Baja'}</Badge>
        }
      />
      <BentoGrid>
        <BentoCard span="md" title="Datos">
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Nacimiento</dt>
              <dd>{student.birthDate.split('-').reverse().join('/')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sede habitual</dt>
              <dd>{clubById(student.clubId)?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Nivel</dt>
              <dd>{levelLabels[student.level]}</dd>
            </div>
          </dl>
        </BentoCard>
        <BentoCard span="md" title="Cuenta de cobro">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{account?.name}</p>
              <p className="text-xs text-muted-foreground">
                {account?.kind === 'individual'
                  ? 'Individual'
                  : account?.kind === 'couple'
                    ? 'Pareja'
                    : 'Familia'}
              </p>
            </div>
            {charge ? <PaymentStatusBadge status={charge.status} /> : null}
          </div>
          {charge ? (
            <Stat
              value={money(charge.balanceCents)}
              label="Pendiente este mes"
              hint={
                charge.debtCents > charge.balanceCents ? `Deuda total ${money(charge.debtCents)}` : undefined
              }
            />
          ) : null}
        </BentoCard>
        <BentoCard span="md" title="Tutor legal">
          {student.category === 'child' ? (
            <div className="grid gap-2 text-sm">
              <p className="font-medium">{student.guardian}</p>
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
                    {clubById(g.clubId)?.name} · {DAYS[g.weekday]} {g.start} · {g.duration} min ·{' '}
                    {teacherById(g.teacherId)?.name}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </BentoGrid>
    </PageContainer>
  )
}
