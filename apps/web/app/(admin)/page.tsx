import Link from 'next/link'
import { ArrowRight, CheckCircle2, CircleAlert } from 'lucide-react'
import { freeSpots, localTodayInTimeZone, money } from '@aprende-padel/core'
import { BentoCard, BentoGrid, Stat } from '../../components/ds/card'
import { ClassStatusBadge } from '../../components/ds/badge'
import { PageContainer, PageHeader } from '../../components/ds/page-header'
import { buildCharges, buildSettlements, groupProfitability, monthSessions } from '../../lib/demo-billing'
import {
  clubs,
  generateSessions,
  groupById,
  groups,
  students,
  teacherById,
  categoryLabels,
} from '../../lib/demo-data'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V']

export default function DashboardPage() {
  const today = localTodayInTimeZone('Europe/Madrid')
  const charges = buildCharges(today)
  const settlements = buildSettlements(today)
  const sessions = monthSessions(today)
  const upcoming = generateSessions(today)
    .filter((s) => s.date >= today && s.status === 'pending')
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
    .slice(0, 5)
  const due = charges.reduce((s, c) => s + c.dueCents, 0)
  const paid = charges.reduce((s, c) => s + c.paidCents, 0)
  const teacherCost = settlements.reduce((s, t) => s + t.totalCents, 0)
  const profit = groupProfitability(today).sort((a, b) => b.marginCents - a.marginCents)
  const unpaid = charges.filter((c) => c.status !== 'paid' && c.status !== 'none')
  const underused = groups.filter((g) => g.studentIds.length < 2)
  const tasks = [
    { label: 'Cobros pendientes este mes', count: unpaid.length, href: '/pagos' },
    {
      label: 'Cuentas con deuda de meses anteriores',
      count: charges.filter((c) => c.monthsOverdue > 0).length,
      href: '/pagos',
    },
    { label: 'Grupos infrautilizados (menos de 2 alumnos)', count: underused.length, href: '/grupos' },
    {
      label: 'Liquidaciones de profesores por pagar',
      count: settlements.filter((s) => s.totalCents > 0).length,
      href: '/pagos?vista=profesores',
    },
  ]
  const slots = clubs.map((club) => ({
    club,
    days: WEEKDAYS.map((_, day) => {
      const mine = groups.filter((g) => g.clubId === club.id && g.weekday === day + 1)
      return mine.reduce((sum, g) => sum + freeSpots(g.category, g.studentIds.length), 0)
    }),
  }))

  return (
    <PageContainer>
      <PageHeader title="Resumen" description="Estado de la academia este mes" />
      <BentoGrid>
        <BentoCard span="sm">
          <Stat
            value={students.filter((s) => s.active).length}
            label="Alumnos activos"
            hint={`${groups.length} grupos en ${clubs.length} sedes`}
          />
        </BentoCard>
        <BentoCard span="sm">
          <Stat
            value={sessions.filter((s) => s.status === 'completed').length}
            label="Clases terminadas"
            hint={`${sessions.filter((s) => s.status === 'cancelled').length} canceladas`}
          />
        </BentoCard>
        <BentoCard span="sm">
          <Stat value={money(paid)} label="Cobrado" hint={`de ${money(due)} previstos`} />
        </BentoCard>
        <BentoCard span="sm">
          <Stat
            value={money(paid - teacherCost)}
            label="Margen estimado"
            hint={`${money(teacherCost)} en profesores`}
          />
        </BentoCard>

        <BentoCard span="xl" title="Tareas pendientes">
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.label}>
                <Link
                  href={task.href}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:text-brand"
                >
                  <span className="flex items-center gap-3">
                    {task.count > 0 ? (
                      <CircleAlert size={18} aria-hidden="true" className="text-warning" />
                    ) : (
                      <CheckCircle2 size={18} aria-hidden="true" className="text-success" />
                    )}
                    {task.label}
                  </span>
                  <span className="flex items-center gap-2 font-semibold tabular-nums">
                    {task.count}
                    <ArrowRight size={14} aria-hidden="true" className="text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </BentoCard>
        <BentoCard span="md" title="Próximas clases">
          <ul className="grid gap-3">
            {upcoming.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{groupById(s.groupId)?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.date.slice(8)}/{s.date.slice(5, 7)} · {s.start} · {teacherById(s.teacherId)?.name}
                  </p>
                </div>
                <ClassStatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </BentoCard>

        <BentoCard span="lg" title="Plazas libres por sede y día">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-1 text-left font-medium">Sede</th>
                {WEEKDAYS.map((d) => (
                  <th key={d} className="py-1 font-medium">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map(({ club, days }) => (
                <tr key={club.id}>
                  <td className="py-1 pr-3 text-muted-foreground">{club.name}</td>
                  {days.map((free, i) => (
                    <td key={i} className="p-0.5 text-center">
                      <span
                        className={`grid h-8 place-items-center rounded-lg text-xs font-semibold tabular-nums ${free === 0 ? 'bg-muted text-muted-foreground' : free < 4 ? 'bg-brand-soft text-brand' : 'bg-brand text-brand-foreground'}`}
                      >
                        {free}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </BentoCard>
        <BentoCard
          span="lg"
          title="Rentabilidad por grupo"
          action={
            <Link href="/pagos?vista=rentabilidad" className="text-xs font-medium text-brand">
              Ver detalle
            </Link>
          }
        >
          <ul className="grid gap-2.5">
            {profit.slice(0, 5).map(({ group, marginCents }) => (
              <li key={group.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  {group.name}{' '}
                  <span className="text-xs text-muted-foreground">· {categoryLabels[group.category]}</span>
                </span>
                <span className={`font-semibold tabular-nums ${marginCents < 0 ? 'text-danger' : ''}`}>
                  {money(marginCents)}
                </span>
              </li>
            ))}
          </ul>
        </BentoCard>
      </BentoGrid>
    </PageContainer>
  )
}
