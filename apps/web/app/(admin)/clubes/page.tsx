import { getSupabaseServer } from '@aprende-padel/db/server'
import { PageHeader } from '../../../components/ui/page-header'
import { ClubForm } from './club-form'

export default async function ClubsPage() {
  const db = await getSupabaseServer()
  const { data, error } = await db
    .schema('core')
    .from('clubs')
    .select('id,name,municipality,address,timezone,active')
    .order('name')
  if (error) throw new Error('No se pudieron cargar los clubes')
  const clubs = data ?? []
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Clubes"
        description={`${new Intl.NumberFormat('es-ES').format(clubs.length)} ${clubs.length === 1 ? 'club registrado' : 'clubes registrados'}`}
        actions={<ClubForm />}
      />
      <section
        role="list"
        aria-label="Clubes de la organización"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        {clubs.map((club) => (
          <article
            role="listitem"
            className="flex min-w-0 flex-wrap items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0"
            key={club.id}
          >
            <span
              aria-hidden="true"
              className={`size-3 shrink-0 rounded-full ${club.active ? 'bg-emerald-700' : 'bg-slate-500'}`}
            />
            <div className="min-w-0 flex-1">
              <strong className="block break-words text-sm">{club.name}</strong>
              <span className="mt-1 block break-words text-xs text-slate-600">
                {club.municipality}
                {club.address ? ` · ${club.address}` : ''}
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${club.active ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-800'}`}
            >
              {club.active ? 'Activo' : 'Inactivo'}
            </span>
            <span translate="no" className="max-w-full break-all text-xs text-slate-700">
              {club.timezone}
            </span>
          </article>
        ))}
        {!clubs.length ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-800">Aún no hay clubes registrados</p>
            <p className="mt-1 text-sm text-slate-600">
              Crea un club para organizar las clases y los alumnos.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  )
}
