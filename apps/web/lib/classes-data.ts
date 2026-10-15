import { getSupabaseServer } from '@aprende-padel/db/server'

export async function getClassReferenceData() {
  const supabase = await getSupabaseServer()
  const [clubsResult, teachersResult] = await Promise.all([
    supabase.schema('core').from('clubs').select('id,name,municipality').eq('active', true).order('name'),
    supabase.schema('core').from('profiles').select('id,full_name,club_teachers(club_id)').eq('role', 'teacher').eq('active', true).order('full_name'),
  ])
  const failure = [clubsResult, teachersResult].find((result) => result.error)
  if (failure?.error) throw new Error(failure.error.message)
  const teachers=(teachersResult.data??[]).map(teacher=>({id:teacher.id,full_name:teacher.full_name,club_ids:teacher.club_teachers.map(assignment=>assignment.club_id)}))
  return { clubs: clubsResult.data ?? [], teachers }
}

export async function getSessions(start?: string, end?: string, limit = 100, filters?: { clubId?: string; teacherId?: string; status?: 'pending' | 'completed' | 'cancelled' }) {
  const supabase = await getSupabaseServer()
  let query = supabase.schema('classes').from('sessions').select('id,starts_at,ends_at,status,club_id,teacher_id,group_id,category,groups(name,capacity),session_students(count)').order('starts_at').limit(limit)
  if (start) query = query.gte('starts_at', start)
  if (end) query = query.lt('starts_at', end)
  if (filters?.clubId) query = query.eq('club_id', filters.clubId)
  if (filters?.teacherId) query = query.eq('teacher_id', filters.teacherId)
  if (filters?.status) query = query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const sessions = data ?? []
  const clubIds = [...new Set(sessions.map((session) => session.club_id))]
  const teacherIds = [...new Set(sessions.map((session) => session.teacher_id))]
  const [clubsResult, teachersResult] = await Promise.all([
    clubIds.length ? supabase.schema('core').from('clubs').select('id,name,municipality,timezone').in('id', clubIds) : Promise.resolve({ data: [], error: null }),
    teacherIds.length ? supabase.schema('core').from('profiles').select('id,full_name').in('id', teacherIds) : Promise.resolve({ data: [], error: null }),
  ])
  const secondaryFailure = [clubsResult, teachersResult].find((result) => result.error)
  if (secondaryFailure?.error) throw new Error(secondaryFailure.error.message)
  const clubs = new Map((clubsResult.data ?? []).map((club) => [club.id, club]))
  const teachers = new Map((teachersResult.data ?? []).map((teacher) => [teacher.id, teacher]))
  return sessions.map((session) => ({ ...session, club: clubs.get(session.club_id) ?? null, teacher: teachers.get(session.teacher_id) ?? null, studentCount: session.session_students?.[0]?.count ?? 0, capacity: session.group_id ? session.groups?.capacity ?? 16 : 16, groupName: session.group_id ? session.groups?.name ?? null : null, allDay: false }))
}
