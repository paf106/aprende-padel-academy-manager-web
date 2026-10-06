import { getSupabaseServer } from '@aprende-padel/db/server'

export async function getClassReferenceData() {
  const supabase = await getSupabaseServer()
  const [clubsResult, teachersResult, studentsResult, groupsResult] = await Promise.all([
    supabase.schema('core').from('clubs').select('id,name,municipality').eq('active', true).order('name'),
    supabase.schema('core').from('profiles').select('id,full_name').eq('role', 'teacher').eq('active', true).order('full_name'),
    supabase.schema('core').from('students').select('id,first_name,last_name,club_id,category,active').eq('active', true).order('last_name'),
    supabase.schema('classes').from('groups').select('id,name,club_id,teacher_id,weekday,start_time,duration_minutes,capacity,level,category,active').eq('active', true).order('name'),
  ])
  const failure = [clubsResult, teachersResult, studentsResult, groupsResult].find((result) => result.error)
  if (failure?.error) throw new Error(failure.error.message)
  return { clubs: clubsResult.data ?? [], teachers: teachersResult.data ?? [], students: studentsResult.data ?? [], groups: groupsResult.data ?? [] }
}

export async function getSessions(start?: string, end?: string, limit = 100, filters?: { clubId?: string; teacherId?: string; status?: 'pending' | 'completed' | 'cancelled' }) {
  const supabase = await getSupabaseServer()
  let query = supabase.schema('classes').from('sessions').select('id,starts_at,status,club_id,teacher_id,group_id').order('starts_at').limit(limit)
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
  const sessionIds = sessions.map((session) => session.id)
  const [clubsResult, teachersResult, studentsResult] = await Promise.all([
    clubIds.length ? supabase.schema('core').from('clubs').select('id,name,municipality').in('id', clubIds) : Promise.resolve({ data: [], error: null }),
    teacherIds.length ? supabase.schema('core').from('profiles').select('id,full_name').in('id', teacherIds) : Promise.resolve({ data: [], error: null }),
    sessionIds.length ? supabase.schema('classes').from('session_students').select('session_id').in('session_id', sessionIds) : Promise.resolve({ data: [], error: null }),
  ])
  const secondaryFailure = [clubsResult, teachersResult, studentsResult].find((result) => result.error)
  if (secondaryFailure?.error) throw new Error(secondaryFailure.error.message)
  const clubs = new Map((clubsResult.data ?? []).map((club) => [club.id, club]))
  const teachers = new Map((teachersResult.data ?? []).map((teacher) => [teacher.id, teacher]))
  const counts = new Map<string, number>()
  for (const student of studentsResult.data ?? []) counts.set(student.session_id, (counts.get(student.session_id) ?? 0) + 1)
  return sessions.map((session) => ({ ...session, club: clubs.get(session.club_id) ?? null, teacher: teachers.get(session.teacher_id) ?? null, studentCount: counts.get(session.id) ?? 0 }))
}
