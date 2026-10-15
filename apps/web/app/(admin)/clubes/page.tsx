import { getSupabaseServer } from '@aprende-padel/db/server'
import { ClubForm } from './club-form'

export default async function ClubsPage() {
  const db = await getSupabaseServer()
  const { data, error } = await db.schema('core').from('clubs').select('id,name,municipality,address,timezone,active').order('name')
  if (error) throw new Error('No se pudieron cargar los clubes')
  return <main className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-8"><header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-medium text-emerald-800">Sedes</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Clubes</h1><p className="mt-2 text-sm text-slate-500">{data?.length ?? 0} clubes registrados</p></div><ClubForm/></header><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{data?.map((club) => <article className="flex items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0" key={club.id}><span className="size-3 rounded-full bg-emerald-600"/><div className="min-w-0 flex-1"><strong className="block text-sm">{club.name}</strong><span className="mt-1 block text-xs text-slate-500">{club.municipality}{club.address ? ` · ${club.address}` : ''}</span></div><span className="text-xs text-slate-500">{club.timezone}</span></article>)}{!data?.length ? <p className="p-8 text-center text-sm text-slate-500">Aún no hay clubes registrados.</p> : null}</section></main>
}
