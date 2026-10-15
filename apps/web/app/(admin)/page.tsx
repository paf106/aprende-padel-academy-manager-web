import Link from 'next/link'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { getSessions } from '../../lib/classes-data'
import { localDateInTimeZone, formatInClubTime } from '@aprende-padel/core'
import { requireAdmin } from '../lib/auth'
import { StatusBadge } from '../../components/ui/status-badge'

const countLabel = (count: number, singular: string, plural: string) => `${new Intl.NumberFormat('es-ES').format(count)} ${count === 1 ? singular : plural}`

export default async function Dashboard() {
  const claims = await requireAdmin()
  const supabase = await getSupabaseServer()
  const now = new Date().toISOString()
  const [{ data: clubs }, { count: studentCount }, sessions, { count: upcomingCount }, { data: profile }] = await Promise.all([
    supabase.schema('core').from('clubs').select('id,name,municipality').eq('active', true).order('name'),
    supabase.schema('core').from('students').select('id', { count: 'exact', head: true }).eq('active', true),
    getSessions(now, undefined, 5, { status: 'pending' }),
    supabase.schema('classes').from('sessions').select('id', { count: 'exact', head: true }).eq('status', 'pending').gte('starts_at', now),
    supabase.schema('core').from('profiles').select('full_name').eq('id', claims.sub).maybeSingle(),
  ])
  const profileName = profile?.full_name ?? 'equipo'
  const initials = profileName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('es')
  const typedClubs = clubs ?? []
  const typedSessions = sessions
  const today = localDateInTimeZone(new Date(), 'Europe/Madrid')
  const currentMonth = today.slice(0, 7)

  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-8">
    <header className="mb-8 flex items-start justify-between gap-5">
      <div className="min-w-0"><h1 className="text-balance break-words text-3xl font-semibold tracking-tight">Hola, {profileName}</h1><p className="mt-2 text-sm text-slate-600">Tu agenda y lo que requiere atención.</p></div>
      <div className="flex min-w-0 items-center gap-3"><div aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-800 text-sm font-semibold text-white">{initials}</div><span className="hidden max-w-64 truncate text-sm text-slate-700 sm:inline">{claims.email}</span></div>
    </header>
    <section aria-label="Resumen de actividad" className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-300 bg-white p-5"><div className="text-sm text-slate-600">Alumnos activos</div><div className="mt-4 text-3xl font-semibold tabular-nums">{new Intl.NumberFormat('es-ES').format(studentCount ?? 0)}</div><div className="mt-1 text-xs text-slate-600">En {countLabel(typedClubs.length, 'club', 'clubes')}</div></div>
      <Link className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 no-underline transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" href="/clases"><div className="text-sm text-slate-600">Próximas clases</div><div className="mt-4 text-3xl font-semibold tabular-nums">{new Intl.NumberFormat('es-ES').format(upcomingCount ?? 0)}</div><div className="mt-1 text-xs font-medium text-blue-800">Ver agenda</div></Link>
      <Link className="rounded-2xl border border-slate-300 bg-white p-5 text-slate-900 no-underline transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" href={`/pagos?period=${currentMonth}`}><div className="text-sm text-slate-600">Gestión de pagos</div><div className="mt-4 text-xl font-semibold">Abrir pagos</div><div className="mt-1 text-xs font-medium text-blue-800">Consultar cobros de {new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date())}</div></Link>
    </section>
    <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <section aria-labelledby="upcoming-title" className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 id="upcoming-title" className="font-semibold">Próximas clases</h2><Link className="text-sm font-medium text-blue-800 hover:underline" href="/clases">Ver calendario</Link></header>
        {typedSessions.length ? <ul className="m-0 list-none p-0">{typedSessions.map((session) => <li className="grid min-w-0 grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 px-5 py-4 last:border-0" key={session.id}><time dateTime={session.starts_at} className="text-sm tabular-nums">{formatInClubTime(session.starts_at, session.club?.timezone ?? 'Europe/Madrid', { timeOnly: true })}</time><div className="min-w-0"><div className="truncate text-sm font-semibold">{session.club?.name ?? 'Club sin asignar'}</div><div className="mt-1 truncate text-xs text-slate-600">{session.teacher?.full_name ?? 'Profesor sin asignar'} · {countLabel(session.studentCount, 'alumno', 'alumnos')}</div></div><StatusBadge status={session.status}/></li>)}</ul> : <p className="p-7 text-sm text-slate-600">No hay clases pendientes próximas.</p>}
      </section>
      <section aria-labelledby="clubs-title" className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 id="clubs-title" className="font-semibold">Tus clubes</h2><span className="text-xs text-slate-600">{countLabel(typedClubs.length, 'activo', 'activos')}</span></header>
        {typedClubs.length ? <ul className="m-0 list-none px-5 py-2">{typedClubs.map((club) => <li className="flex min-w-0 items-center gap-3 border-b border-slate-200 py-4 last:border-0" key={club.id}><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-emerald-700"/><div className="min-w-0"><strong className="block truncate text-sm">{club.name}</strong><span className="text-xs text-slate-600">{club.municipality}</span></div></li>)}</ul> : <p className="p-7 text-sm text-slate-600">Aún no hay clubes activos.</p>}
      </section>
    </section>
  </main>
}
