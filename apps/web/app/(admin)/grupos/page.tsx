import { getSupabaseServer } from '@aprende-padel/db/server'
import { PageHeader } from '../../../components/ui/page-header'
import { GroupForm } from './group-form'
import { deactivateGroup } from './actions'
import { GroupEditForm } from './group-edit-form'
import { DeactivateAction } from '../../../components/deactivate-action'

const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export default async function GroupsPage() {
  const db = await getSupabaseServer()
  const [{ data: clubs }, { data: teachers }, { data: assignments }, { data: groups, error }] =
    await Promise.all([
      db.schema('core').from('clubs').select('id,name').eq('active', true).order('name'),
      db
        .schema('core')
        .from('profiles')
        .select('id,full_name')
        .eq('role', 'teacher')
        .eq('active', true)
        .order('full_name'),
      db.schema('core').from('club_teachers').select('club_id,teacher_id'),
      db
        .schema('classes')
        .from('groups')
        .select(
          'id,name,category,weekday,start_time,duration_minutes,capacity,club_id,teacher_id,active,level,starts_on,ends_on,group_members(student_id)',
        )
        .eq('active', true)
        .order('name'),
    ])
  if (error) throw new Error('No se pudieron cargar los grupos')
  const rows = groups ?? []
  const clubMap = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  const teacherMap = new Map((teachers ?? []).map((teacher) => [teacher.id, teacher.full_name]))
  const teacherChoices = (teachers ?? []).map((teacher) => ({
    id: teacher.id,
    full_name: teacher.full_name,
    clubs: (assignments ?? [])
      .filter((assignment) => assignment.teacher_id === teacher.id)
      .map((assignment) => assignment.club_id),
  }))
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-8">
      <PageHeader
        title="Grupos"
        description={`${new Intl.NumberFormat('es-ES').format(rows.length)} ${rows.length === 1 ? 'grupo activo' : 'grupos activos'}`}
        actions={<GroupForm clubs={clubs ?? []} teachers={teacherChoices} />}
      />
      <section
        role="list"
        aria-label="Grupos activos"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        {rows.map((group) => (
          <article
            role="listitem"
            id={group.id}
            className="grid min-w-0 gap-3 border-b border-slate-100 p-4 last:border-0 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center"
            key={group.id}
          >
            <div className="min-w-0">
              <strong className="block break-words text-sm">{group.name}</strong>
              <p className="mt-1 break-words text-xs text-slate-600">
                {clubMap.get(group.club_id) ?? 'Club no disponible'} ·{' '}
                {teacherMap.get(group.teacher_id) ?? 'Profesor no disponible'} ·{' '}
                {group.category === 'adult' ? 'Adultos' : 'Infantil'}
              </p>
            </div>
            <span className="text-sm text-slate-700">
              {weekdays[group.weekday] ?? 'Día no disponible'} · {group.start_time.slice(0, 5)} ·{' '}
              {group.duration_minutes} min
            </span>
            <span className="text-sm text-slate-700">
              Aforo {new Intl.NumberFormat('es-ES').format(group.group_members?.length ?? 0)}/{group.capacity}{' '}
              · {group.level}
            </span>
            <div className="flex flex-wrap gap-2">
              <GroupEditForm
                group={{ ...group, members: (group.group_members ?? []).map((member) => member.student_id) }}
                refs={{ clubs: clubs ?? [], teachers: teacherChoices }}
              />
              <DeactivateAction
                label={`el grupo ${group.name}`}
                action={async () => {
                  'use server'
                  return deactivateGroup(group.id)
                }}
              />
            </div>
          </article>
        ))}
        {!rows.length ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-800">Aún no hay grupos activos</p>
            <p className="mt-1 text-sm text-slate-600">Crea un grupo para programar clases recurrentes.</p>
          </div>
        ) : null}
      </section>
    </main>
  )
}
