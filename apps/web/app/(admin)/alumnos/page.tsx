import { getSupabaseServer } from '@aprende-padel/db/server'
import { StudentForm } from './student-form'
import { deactivateStudent } from './actions'
import { StudentEditForm } from './student-edit-form'
import { StudentTariffForm } from './tariff-form'
import { DeactivateAction } from '../../../components/deactivate-action'

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const db = await getSupabaseServer()
  let studentQuery = db.schema('core').from('students').select('id,first_name,last_name,category,level,club_id,active,email,phone').eq('active', true).order('last_name')
  const safeQuery = q.trim().replace(/[(),]/g, ' ')
  if (safeQuery) studentQuery = studentQuery.or(`first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%`)
  const [{ data: students, error }, { data: clubs }, { data: tariffs }, { data: assignments }] = await Promise.all([
    studentQuery,
    db.schema('core').from('clubs').select('id,name').eq('active', true).order('name'),
    db.schema('payments').from('tariffs').select('id,name,category,monthly_amount_cents').eq('active', true).order('name'),
    db.schema('payments').from('student_tariffs').select('student_id,tariff_id').is('ends_on', null),
  ])
  if (error) throw new Error('No se pudo cargar el alumnado')
  const clubMap = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  const currentTariff = new Map((assignments ?? []).map((assignment) => [assignment.student_id, assignment.tariff_id]))
  const rows = students ?? []
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-8">
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-3xl font-semibold tracking-tight">Alumnos</h1><p className="mt-2 text-sm text-slate-500">{rows.length} alumnos activos</p></div><StudentForm clubs={clubs ?? []} tariffs={tariffs ?? []}/></header>
    <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Buscar por nombre o apellido…" className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400"/><button className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Buscar</button></form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{rows.map((student) => <article className="grid gap-3 border-b border-slate-100 p-4 last:border-0 sm:grid-cols-[1.1fr_1fr_auto] sm:items-center" key={student.id}><div><strong className="text-sm">{student.first_name} {student.last_name}</strong><p className="mt-1 text-xs text-slate-500">{clubMap.get(student.club_id) ?? 'Club'} · {student.category === 'adult' ? 'Adultos' : 'Infantil'} · {student.level}</p></div><p className="text-xs text-slate-500">{student.email || student.phone || 'Sin datos de contacto'}</p><div className="flex flex-wrap gap-2"><StudentEditForm student={student}/><StudentTariffForm studentId={student.id} category={student.category} tariffs={tariffs ?? []} current={currentTariff.get(student.id)}/><DeactivateAction label="este alumno" action={async () => { 'use server'; return deactivateStudent(student.id) }}/></div></article>)}{!rows.length ? <p className="p-8 text-center text-sm text-slate-500">{q ? 'No hay alumnos para esa búsqueda.' : 'Todavía no hay alumnos activos.'}</p> : null}</section>
  </main>
}
