import { getSupabaseServer } from '@aprende-padel/db/server'
import { TeacherForm } from './teacher-form'

export default async function TeachersPage() {
  const db = await getSupabaseServer()
  const [{ data: teachers, error }, { data: assignments }, { data: clubs }] = await Promise.all([
    db.schema('core').from('profiles').select('id,full_name,email,phone,active').eq('role', 'teacher').order('full_name'),
    db.schema('core').from('club_teachers').select('teacher_id,club_id'),
    db.schema('core').from('clubs').select('id,name').eq('active', true),
  ])
  if (error) throw new Error('No se pudo cargar el equipo docente')
  const names = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  return <main className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-8"><header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-medium text-emerald-800">Equipo</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Profesores</h1><p className="mt-2 text-sm text-slate-500">{teachers?.length ?? 0} profesores registrados</p></div><TeacherForm clubs={clubs ?? []}/></header><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{teachers?.map((teacher) => <article className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0" key={teacher.id}><div className="grid size-10 place-items-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900">{teacher.full_name.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><strong className="block text-sm">{teacher.full_name}</strong><span className="text-xs text-slate-500">{teacher.email}{teacher.phone ? ` · ${teacher.phone}` : ''}</span></div><div className="flex flex-wrap gap-1.5">{(assignments ?? []).filter((assignment) => assignment.teacher_id === teacher.id).map((assignment) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600" key={assignment.club_id}>{names.get(assignment.club_id)}</span>)}</div></article>)}</section></main>
}
