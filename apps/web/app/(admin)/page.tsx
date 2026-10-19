import Link from 'next/link'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { formatInClubTime, localDateInTimeZone } from '@aprende-padel/core'
import { getSessions } from '../../lib/classes-data'
import { requireAdmin } from '../lib/auth'
import { getEnabledModules } from '../lib/modules'
import { PageHeader } from '../../components/ui/page-header'
import { StatusBadge } from '../../components/ui/status-badge'

const countLabel = (count: number, singular: string, plural: string) =>
  `${new Intl.NumberFormat('es-ES').format(count)} ${count === 1 ? singular : plural}`

export default async function Dashboard() {
  const claims = await requireAdmin()
  const organizationId = claims.app_metadata?.organization_id
  if (typeof organizationId !== 'string') throw new Error('No se pudo identificar la organización')
  const enabled = await getEnabledModules(organizationId)
  const classesEnabled = enabled.includes('classes')
  const paymentsEnabled = enabled.includes('payments')
  const supabase = await getSupabaseServer()
  const now = new Date().toISOString()
  const today = localDateInTimeZone(now, 'Europe/Madrid')
  const month = today.slice(0, 7)
  const [
    { data: clubs },
    { count: studentCount },
    { data: profile },
    sessions,
    { data: metrics, error: metricsError },
  ] = await Promise.all([
    supabase.schema('core').from('clubs').select('id,name,municipality').eq('active', true).order('name'),
    supabase.schema('core').from('students').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.schema('core').from('profiles').select('full_name').eq('id', claims.sub).maybeSingle(),
    classesEnabled ? getSessions(now, undefined, 5, { status: 'pending' }) : Promise.resolve([]),
    classesEnabled
      ? supabase.schema('core').rpc('dashboard_action_metrics', { p_period: `${month}-01` })
      : Promise.resolve({ data: null, error: null }),
  ])
  if (metricsError) throw new Error('No se pudo cargar el resumen de tareas')
  const profileName = profile?.full_name ?? 'equipo'
  const initials = profileName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('es')
  const activeClubs = clubs ?? []
  const upcoming = sessions ?? []
  const summary = metrics?.[0]
  const tasks = [
    classesEnabled && (summary?.pending_attendance_sessions ?? 0) > 0
      ? {
          href: '/clases?status=completed',
          title: `${countLabel(summary!.pending_attendance_sessions, 'clase', 'clases')} sin pasar lista`,
          detail: 'Revisa la asistencia de las clases terminadas.',
          value: summary!.pending_attendance_sessions,
        }
      : null,
    paymentsEnabled && (summary?.students_without_tariff ?? 0) > 0
      ? {
          href: '/alumnos',
          title: `${countLabel(summary!.students_without_tariff, 'alumno', 'alumnos')} sin tarifa`,
          detail: 'Asigna una cuota para incluirlos en los próximos cobros.',
          value: summary!.students_without_tariff,
        }
      : null,
    paymentsEnabled && (summary?.unpaid_student_charges ?? 0) > 0
      ? {
          href: `/pagos?period=${month}&studentsStatus=pending`,
          title: `${countLabel(summary!.unpaid_student_charges, 'cobro pendiente', 'cobros pendientes')}`,
          detail: `${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((summary?.outstanding_student_cents ?? 0) / 100)} pendientes este mes.`,
          value: summary!.unpaid_student_charges,
        }
      : null,
  ].filter((task): task is NonNullable<typeof task> => task !== null)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 pb-24 sm:px-8 md:pb-7">
      <PageHeader
        title={`Hola, ${profileName}`}
        description={`${countLabel(studentCount ?? 0, 'alumno activo', 'alumnos activos')} · ${countLabel(activeClubs.length, 'club', 'clubes')}`}
        actions={
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-800 text-sm font-semibold text-white"
            >
              {initials}
            </div>
            <span className="hidden max-w-64 truncate text-sm text-slate-700 sm:inline">{claims.email}</span>
          </div>
        }
      />

      {enabled.length ? (
        <section
          aria-labelledby="tasks-title"
          className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <header className="border-b border-slate-100 px-5 py-4">
            <h2 id="tasks-title" className="font-semibold">
              Para revisar
            </h2>
          </header>
          {tasks.length ? (
            <ul className="m-0 list-none p-0">
              {tasks.map((task) => (
                <li key={task.href} className="border-b border-slate-100 last:border-0">
                  <Link
                    href={task.href}
                    className="flex min-h-16 items-center gap-4 px-5 py-3 text-slate-900 no-underline hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-50 text-sm font-semibold tabular-nums text-amber-950">
                      {task.value}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm font-semibold">{task.title}</strong>
                      <span className="block text-xs text-slate-600">{task.detail}</span>
                    </span>
                    <span className="text-sm font-semibold text-brand">Revisar</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-5 text-sm text-slate-600">Todo al día. No hay tareas pendientes.</p>
          )}
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {classesEnabled ? (
          <section
            aria-labelledby="upcoming-title"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="upcoming-title" className="font-semibold">
                Próximas clases
              </h2>
              <Link
                className="min-h-11 inline-flex items-center text-sm font-medium text-brand hover:underline"
                href="/clases"
              >
                Ver calendario
              </Link>
            </header>
            {upcoming.length ? (
              <ul className="m-0 list-none p-0">
                {upcoming.map((session) => {
                  const timezone = session.club?.timezone ?? 'Europe/Madrid'
                  const date = localDateInTimeZone(session.starts_at, timezone)
                  const params = new URLSearchParams({ date, view: 'week' })
                  return (
                    <li key={session.id} className="border-b border-slate-100 last:border-0">
                      <Link
                        href={`/clases/${session.id}?${params.toString()}`}
                        className="grid min-h-16 min-w-0 grid-cols-[minmax(96px,auto)_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 text-slate-900 no-underline hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700"
                      >
                        <time dateTime={session.starts_at} className="text-sm tabular-nums text-slate-700">
                          {formatInClubTime(session.starts_at, timezone)}
                        </time>
                        <span className="min-w-0">
                          <strong className="block truncate text-sm">
                            {session.groupName ?? session.club?.name ?? 'Clase suelta'}
                          </strong>
                          <span className="mt-1 block truncate text-xs text-slate-600">
                            {session.club?.name ?? 'Club sin asignar'} ·{' '}
                            {session.teacher?.full_name ?? 'Profesor sin asignar'} ·{' '}
                            {countLabel(session.studentCount, 'alumno', 'alumnos')}
                          </span>
                        </span>
                        <StatusBadge status={session.status} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="p-7 text-sm text-slate-600">No hay clases pendientes próximas.</p>
            )}
          </section>
        ) : null}
        {activeClubs.length ? (
          <section
            aria-labelledby="clubs-title"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="clubs-title" className="font-semibold">
                Tus clubes
              </h2>
              <span className="text-xs text-slate-600">
                {countLabel(activeClubs.length, 'activo', 'activos')}
              </span>
            </header>
            <ul className="m-0 list-none px-5 py-2">
              {activeClubs.map((club) => (
                <li
                  className="flex min-w-0 items-center gap-3 border-b border-slate-100 py-4 last:border-0"
                  key={club.id}
                >
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-emerald-700" />
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{club.name}</strong>
                    <span className="text-xs text-slate-600">{club.municipality}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </main>
  )
}
