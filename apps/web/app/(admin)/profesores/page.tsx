import { getSupabaseServer } from '@aprende-padel/db/server'
import { PageHeader } from '../../../components/ui/page-header'
import { TeacherForm } from './teacher-form'

export default async function TeachersPage() {
  const db = await getSupabaseServer()
  const [{ data: teachers, error }, { data: assignments }, { data: clubs }] = await Promise.all([
    db
      .schema('core')
      .from('profiles')
      .select('id,full_name,email,phone,active')
      .eq('role', 'teacher')
      .order('full_name'),
    db.schema('core').from('club_teachers').select('teacher_id,club_id'),
    db.schema('core').from('clubs').select('id,name').eq('active', true),
  ])
  if (error) throw new Error('No se pudo cargar el equipo docente')
  const names = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  const rows = teachers ?? []
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Profesores"
        description={`${new Intl.NumberFormat('es-ES').format(rows.length)} ${rows.length === 1 ? 'profesor registrado' : 'profesores registrados'}`}
        actions={<TeacherForm clubs={clubs ?? []} />}
      />
      <section
        role="list"
        aria-label="Profesores de la organización"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        {rows.map((teacher) => {
          const parts = teacher.full_name.trim().split(/\s+/).filter(Boolean)
          const initials =
            `${parts[0]?.[0] ?? ''}${parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''}`.toLocaleUpperCase(
              'es',
            )
          const teacherClubs = (assignments ?? []).filter(
            (assignment) => assignment.teacher_id === teacher.id,
          )
          return (
            <article
              role="listitem"
              className="flex min-w-0 flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0"
              key={teacher.id}
            >
              <div
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-950"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="block break-words text-sm">{teacher.full_name}</strong>
                <span className="block break-words text-xs text-slate-700">
                  {[teacher.email, teacher.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </span>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${teacher.active ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-800'}`}
                >
                  {teacher.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div aria-label="Clubes asignados" className="flex flex-wrap gap-1.5">
                {teacherClubs.map((assignment) => (
                  <span
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-800"
                    key={assignment.club_id}
                  >
                    {names.get(assignment.club_id) ?? 'Club no disponible'}
                  </span>
                ))}
              </div>
            </article>
          )
        })}
        {!rows.length ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-800">Aún no hay profesores registrados</p>
            <p className="mt-1 text-sm text-slate-600">Añade al equipo docente para poder asignar clases.</p>
          </div>
        ) : null}
      </section>
    </main>
  )
}
