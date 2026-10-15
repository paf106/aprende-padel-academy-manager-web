import { getSupabaseServer } from '@aprende-padel/db/server'
import { GroupForm } from './group-form'
import { deactivateGroup } from './actions'
import { GroupEditForm } from './group-edit-form'
import { DeactivateAction } from '../../../components/deactivate-action'

export default async function GroupsPage() {
  const db = await getSupabaseServer()
  const [{ data: clubs }, { data: teachers }, { data: assignments }, { data: groups, error }] = await Promise.all([
    db.schema('core').from('clubs').select('id,name').eq('active', true).order('name'),
    db.schema('core').from('profiles').select('id,full_name').eq('role', 'teacher').eq('active', true).order('full_name'),
    db.schema('core').from('club_teachers').select('club_id,teacher_id'),
    db.schema('classes').from('groups').select('id,name,category,weekday,start_time,duration_minutes,capacity,club_id,teacher_id,active,level,starts_on,ends_on,group_members(student_id)').eq('active', true).order('name'),
  ])
  if (error) throw new Error('No se pudieron cargar los grupos')
  const clubMap = new Map((clubs ?? []).map((club) => [club.id, club.name]))
  const teacherMap = new Map((teachers ?? []).map((teacher) => [teacher.id, teacher.full_name]))
  const teacherChoices = (teachers ?? []).map((teacher) => ({ id: teacher.id, full_name: teacher.full_name, clubs: (assignments ?? []).filter((assignment) => assignment.teacher_id === teacher.id).map((assignment) => assignment.club_id) }))
  return <main className="mx-auto w-full max-w-[1450px] px-4 py-7 sm:px-8"><header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-medium text-emerald-800">Clases recurrentes</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Grupos</h1><p className="mt-2 text-sm text-slate-600">{groups?.length ?? 0} grupos activos</p></div><GroupForm clubs={clubs ?? []} teachers={teacherChoices}/></header><section aria-label="Grupos activos" className="overflow-hidden rounded-2xl border border-slate-300 bg-white">{groups?.map((group) => <article id={group.id} className="grid gap-3 border-b border-slate-200 p-4 last:border-0 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center" key={group.id}><div className="min-w-0"><strong className="block break-words text-sm">{group.name}</strong><p className="mt-1 break-words text-xs text-slate-600">{clubMap.get(group.club_id) ?? 'Club no disponible'} · {teacherMap.get(group.teacher_id) ?? 'Profesor no disponible'} · {group.category === 'adult' ? 'Adultos' : 'Infantil'}</p></div><span className="text-xs text-slate-700">{['dom','lun','mar','mié','jue','vie','sáb'][group.weekday]} · {group.start_time.slice(0,5)} · {group.duration_minutes} min</span><span className="text-xs text-slate-700">Aforo {group.group_members?.length ?? 0}/{group.capacity} · {group.level}</span><div className="flex flex-wrap gap-2"><GroupEditForm group={{ ...group, members: (group.group_members ?? []).map((member) => member.student_id) }} refs={{ clubs: clubs ?? [], teachers: teacherChoices }}/><DeactivateAction label="este grupo" action={async () => { 'use server'; return deactivateGroup(group.id) }}/></div></article>)}{!groups?.length ? <p className="p-8 text-center text-sm text-slate-600">Aún no hay grupos activos.</p> : null}</section></main>
}
