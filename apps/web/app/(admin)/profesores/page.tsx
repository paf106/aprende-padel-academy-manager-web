import { getSupabaseServer } from '@aprende-padel/db/server'
import { PageHeader } from '../../../components/ui/page-header'
import { TeacherForm } from './teacher-form'
import { TeacherEditForm } from './teacher-edit-form'
import { TeacherActiveAction } from './teacher-active-action'

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
    db.schema('core').from('clubs').select('id,name,active').order('name'),
  ])
  if (error) throw new Error('No se pudo cargar el equipo docente')
  const rows = teachers ?? []
  const teacherClubs = new Map(
    rows.map((teacher) => [
      teacher.id,
      (assignments ?? []).filter((item) => item.teacher_id === teacher.id).map((item) => item.club_id),
    ]),
  )
  const clubNames = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  const editClubOptions = (clubs ?? []).map((club) => ({ id: club.id, name: club.name, active: club.active }))
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Profesores"
        description={`${new Intl.NumberFormat('es-ES').format(rows.length)} ${rows.length === 1 ? 'profesor' : 'profesores'}`}
        actions={
          <TeacherForm
            clubs={(clubs ?? []).filter((club) => club.active).map(({ id, name }) => ({ id, name }))}
          />
        }
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
          const ids = teacherClubs.get(teacher.id) ?? []
          const assignmentsForTeacher = ids.map((id) => ({
            id,
            name: clubNames.get(id) ?? 'Club no disponible',
          }))
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
                {assignmentsForTeacher.map((club) => (
                  <span
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-800"
                    key={club.id}
                  >
                    {club.name}
                  </span>
                ))}
                {!assignmentsForTeacher.length ? (
                  <span className="text-xs text-slate-500">Sin clubes asignados</span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <TeacherEditForm teacher={{ ...teacher, club_ids: ids }} clubs={editClubOptions} />
                <TeacherActiveAction id={teacher.id} name={teacher.full_name} active={teacher.active} />
              </div>
            </article>
          )
        })}
        {!rows.length ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-800">Aún no hay profesores registrados</p>
            <p className="mt-1 text-sm text-slate-600">
              Añade al equipo docente para asignar clases y grupos.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  )
}
