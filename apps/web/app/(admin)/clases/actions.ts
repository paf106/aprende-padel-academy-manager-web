'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { requireAdmin as requireAdminClaims } from '../../lib/auth'
import { requireModule } from '../../lib/modules'
import type { ActionResult } from '../../lib/action-result'

const sessionSchema = z.object({
  clubId: z.uuid(),
  teacherId: z.uuid(),
  category: z.enum(['adult', 'child']),
  date: z.iso.date(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.coerce.number().int().min(30).max(180),
  notes: z.string().max(500).optional(),
})
const cancellationSchema = z.object({ sessionId: z.uuid(), reason: z.string().trim().min(1).max(300) })
const statusSchema = z.object({
  sessionId: z.uuid(),
  status: z.enum(['pending', 'completed', 'cancelled']),
  reason: z.string().optional(),
})
async function requireAdmin() {
  await requireModule('classes')
  const claims = await requireAdminClaims()
  if (!claims.id || !claims.app_metadata) throw new Error('Sesión incompleta')
  const supabase = await getSupabaseServer()
  return { supabase, user: claims }
}

export async function getClassDialogData() {
  const { supabase } = await requireAdmin()
  const { data: groups, error } = await supabase
    .schema('classes')
    .from('groups')
    .select('id,name,club_id,teacher_id,capacity,category')
    .eq('active', true)
    .order('name')
  if (error) throw new Error('No se pudieron cargar los grupos')
  return { groups: groups ?? [] }
}

export async function getStudentsForSessionForm(clubId: string, category: 'adult' | 'child') {
  const input = z
    .object({ clubId: z.uuid(), category: z.enum(['adult', 'child']) })
    .safeParse({ clubId, category })
  if (!input.success) return []
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .schema('core')
    .from('students')
    .select('id,first_name,last_name,club_id,category')
    .eq('active', true)
    .eq('club_id', input.data.clubId)
    .eq('category', input.data.category)
    .order('last_name')
    .limit(1000)
  if (error) throw new Error('No se pudieron cargar los alumnos del club')
  return data ?? []
}

export async function getClassDetailData(id: string) {
  const validId = z.uuid().safeParse(id)
  if (!validId.success) return null
  const { supabase } = await requireAdmin()
  const [sessionResult, enrolledResult, attendanceResult] = await Promise.all([
    supabase
      .schema('classes')
      .from('sessions')
      .select(
        'id,starts_at,ends_at,status,notes,cancellation_reason,club_id,teacher_id,category,group_id,groups(name,capacity,level)',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase.schema('classes').from('session_students').select('student_id').eq('session_id', id),
    supabase.schema('classes').from('attendance').select('student_id,status,comment').eq('session_id', id),
  ])
  const { data: session, error } = sessionResult
  if (error || !session || enrolledResult.error || attendanceResult.error) return null
  const enrolled = enrolledResult.data
  const attendance = attendanceResult.data
  const studentIds = (enrolled ?? []).map((item) => item.student_id)
  const [{ data: club }, { data: teacher }, enrolledStudentsResult] = await Promise.all([
    supabase
      .schema('core')
      .from('clubs')
      .select('name,municipality,timezone')
      .eq('id', session.club_id)
      .maybeSingle(),
    supabase.schema('core').from('profiles').select('full_name').eq('id', session.teacher_id).maybeSingle(),
    studentIds.length
      ? supabase.schema('core').from('students').select('id,first_name,last_name').in('id', studentIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  const { data: enrolledStudents, error: studentError } = enrolledStudentsResult
  if (studentError) return null
  const attendanceMap = new Map((attendance ?? []).map((item) => [item.student_id, item]))
  return {
    session,
    club,
    teacher,
    students: (enrolledStudents ?? []).map((student) => ({
      ...student,
      attendance: attendanceMap.get(student.id) ?? null,
    })),
    studentIds,
    capacity: session.groups?.capacity ?? 16,
    group: session.groups,
    timeZone: club?.timezone ?? 'Europe/Madrid',
  }
}

export async function getAvailableStudentsForSession(id: string) {
  const validId = z.uuid().safeParse(id)
  if (!validId.success) return []
  const { supabase } = await requireAdmin()
  const { data: session } = await supabase
    .schema('classes')
    .from('sessions')
    .select('club_id,category')
    .eq('id', id)
    .maybeSingle()
  if (!session) return []
  const { data: enrolled } = await supabase
    .schema('classes')
    .from('session_students')
    .select('student_id')
    .eq('session_id', id)
  const enrolledIds = (enrolled ?? []).map((item) => item.student_id)
  let query = supabase
    .schema('core')
    .from('students')
    .select('id,first_name,last_name')
    .eq('club_id', session.club_id)
    .eq('category', session.category)
    .eq('active', true)
    .order('last_name')
  if (enrolledIds.length) query = query.not('id', 'in', `(${enrolledIds.join(',')})`)
  const { data } = await query
  return data ?? []
}

export async function createSession(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const parsed = sessionSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { ok: false, message: 'Completa los campos obligatorios de la clase.' }
    const studentIdsResult = z.array(z.uuid()).max(16).safeParse(formData.getAll('studentIds'))
    if (!studentIdsResult.success) return { ok: false, message: 'Selecciona hasta 16 alumnos válidos.' }
    const { supabase, user } = await requireAdmin()
    const org =
      typeof user.app_metadata?.organization_id === 'string' ? user.app_metadata.organization_id : null
    if (!org) return { ok: false, message: 'Organización no disponible.' }
    const studentIds = [...new Set(studentIdsResult.data)]
    const localStart = `${parsed.data.date}T${parsed.data.time}:00`
    const { error } = await supabase
      .schema('classes')
      .rpc('create_session', {
        p_club_id: parsed.data.clubId,
        p_teacher_id: parsed.data.teacherId,
        p_category: parsed.data.category,
        p_starts_at: localStart,
        p_duration_minutes: parsed.data.duration,
        p_student_ids: studentIds,
        p_notes: parsed.data.notes || undefined,
      })
    if (error)
      return {
        ok: false,
        message: 'No se ha podido crear la clase. Revisa profesor, club, categoría, aforo y horario.',
      }
    revalidatePath('/')
    revalidatePath('/clases')
    return { ok: true, message: 'Clase creada correctamente.' }
  } catch {
    return { ok: false, message: 'No se ha podido crear la clase.' }
  }
}

export async function generateFromGroup(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const input = z
      .object({ groupId: z.uuid(), start: z.iso.date(), end: z.iso.date() })
      .safeParse(Object.fromEntries(formData))
    if (!input.success || input.data.end < input.data.start)
      return { ok: false, message: 'Indica un grupo y un intervalo válido.' }
    const { groupId, start, end } = input.data
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase
      .schema('classes')
      .rpc('generate_sessions', { target_group_id: groupId, range_start: start, range_end: end })
    if (error)
      return { ok: false, message: 'No se han podido generar las sesiones. Comprueba el grupo y el periodo.' }
    revalidatePath('/')
    revalidatePath('/clases')
    return { ok: true, message: `${data ?? 0} sesiones nuevas generadas.` }
  } catch {
    return { ok: false, message: 'No se han podido generar las sesiones.' }
  }
}

export async function setSessionStatus(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || (parsed.data.status === 'cancelled' && !parsed.data.reason?.trim()))
    return { ok: false, message: 'La cancelación requiere un motivo.' }
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase
      .schema('classes')
      .rpc('set_session_status', {
        p_session_id: parsed.data.sessionId,
        p_status: parsed.data.status,
        p_reason: parsed.data.reason ?? undefined,
      })
    if (error) return { ok: false, message: 'No se pudo actualizar el estado de la clase.' }
    revalidatePath('/')
    revalidatePath('/clases')
    revalidatePath(`/clases/${parsed.data.sessionId}`)
    return { ok: true, message: 'Estado actualizado.' }
  } catch {
    return { ok: false, message: 'No se pudo actualizar el estado de la clase.' }
  }
}

export async function updateAttendance(
  _: { ok: boolean; message: string } | null,
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const parsed = z
    .object({ sessionId: z.uuid(), studentId: z.uuid(), comment: z.string().trim().min(1).max(300) })
    .safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Datos de asistencia no válidos.' }
  let auth
  try {
    auth = await requireAdmin()
  } catch {
    return { ok: false, message: 'No autorizado.' }
  }
  const { supabase, user } = auth
  const { data: existing, error: readError } = await supabase
    .schema('classes')
    .from('attendance')
    .select('status')
    .eq('session_id', parsed.data.sessionId)
    .eq('student_id', parsed.data.studentId)
    .maybeSingle()
  if (readError || !existing)
    return { ok: false, message: 'Marca primero la asistencia para poder añadir un comentario.' }
  const { error } = await supabase
    .schema('classes')
    .from('attendance')
    .upsert({
      session_id: parsed.data.sessionId,
      student_id: parsed.data.studentId,
      status: existing.status,
      comment: parsed.data.comment,
      marked_by: user.id,
      marked_at: new Date().toISOString(),
    })
  if (error) return { ok: false, message: 'No se pudo guardar la asistencia.' }
  revalidatePath(`/clases/${parsed.data.sessionId}`)
  return { ok: true, message: 'Asistencia guardada.' }
}

export async function markAllAttendance(sessionId: string): Promise<ActionResult> {
  const id = z.uuid().safeParse(sessionId)
  if (!id.success) return { ok: false, message: 'Clase no válida.' }
  let auth
  try {
    auth = await requireAdmin()
  } catch {
    return { ok: false, message: 'No autorizado.' }
  }
  const { data: members, error: membersError } = await auth.supabase
    .schema('classes')
    .from('session_students')
    .select('student_id')
    .eq('session_id', sessionId)
  if (membersError) return { ok: false, message: 'No se pudo leer el alumnado de la clase.' }
  if (!members?.length) return { ok: true, message: 'No hay alumnos inscritos.' }
  const rows = members.map((member) => ({
    session_id: sessionId,
    student_id: member.student_id,
    status: 'present' as const,
    marked_by: auth.user.id,
    marked_at: new Date().toISOString(),
  }))
  const { error } = await auth.supabase.schema('classes').from('attendance').upsert(rows)
  if (error) return { ok: false, message: 'No se pudo guardar la asistencia.' }
  revalidatePath(`/clases/${sessionId}`)
  return { ok: true, message: `${rows.length} alumnos marcados como presentes.` }
}

const editSessionSchema = z.object({
  sessionId: z.uuid(),
  localStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.coerce.number().int().min(30).max(180),
  notes: z.string().max(500).optional(),
})
export async function editSession(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = editSessionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Revisa fecha, hora y duración.' }
  let auth
  try {
    auth = await requireAdmin()
  } catch {
    return { ok: false, message: 'No autorizado.' }
  }
  const { error } = await auth.supabase
    .schema('classes')
    .rpc('reschedule_session', {
      p_session_id: parsed.data.sessionId,
      p_local_start: parsed.data.localStart,
      p_duration_minutes: parsed.data.duration,
      p_notes: parsed.data.notes || undefined,
    })
  if (error) return { ok: false, message: 'No se pudo actualizar la clase. Revisa solapes del profesor.' }
  revalidatePath('/clases')
  revalidatePath(`/clases/${parsed.data.sessionId}`)
  return { ok: true, message: 'Clase actualizada.' }
}
export async function deleteSession(id: string): Promise<ActionResult> {
  const valid = z.uuid().safeParse(id)
  if (!valid.success) return { ok: false, message: 'Clase no válida.' }
  let auth
  try {
    auth = await requireAdmin()
  } catch {
    return { ok: false, message: 'No autorizado.' }
  }
  const { data: session } = await auth.supabase
    .schema('classes')
    .from('sessions')
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (!session) return { ok: false, message: 'Clase no encontrada.' }
  const { data: billed, error: billedError } = await auth.supabase
    .schema('payments')
    .from('teacher_settlement_lines')
    .select('id')
    .eq('session_id', id)
    .limit(1)
  if (billedError) return { ok: false, message: 'No se pudo verificar si la clase está liquidada.' }
  if (billed?.length)
    return { ok: false, message: 'No se puede eliminar: esta clase ya está incluida en una liquidación.' }
  const { error } = await auth.supabase.schema('classes').from('sessions').delete().eq('id', id)
  if (error) return { ok: false, message: 'No se pudo eliminar la clase.' }
  revalidatePath('/clases')
  revalidatePath('/')
  return { ok: true, message: 'Clase eliminada.' }
}
export async function updateSessionRoster(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = z
    .object({ sessionId: z.uuid(), studentIds: z.array(z.uuid()).max(16) })
    .safeParse({ sessionId: formData.get('sessionId'), studentIds: formData.getAll('studentIds') })
  if (!input.success) return { ok: false, message: 'Alumnado o aforo no válido.' }
  let auth
  try {
    auth = await requireAdmin()
  } catch {
    return { ok: false, message: 'No autorizado.' }
  }
  const { error } = await auth.supabase
    .schema('classes')
    .rpc('update_session_roster', {
      p_session_id: input.data.sessionId,
      p_student_ids: [...new Set(input.data.studentIds)],
    })
  if (error)
    return { ok: false, message: 'No se pudo actualizar el alumnado. Comprueba club, categoría y aforo.' }
  revalidatePath(`/clases/${input.data.sessionId}`)
  revalidatePath('/clases')
  return { ok: true, message: 'Alumnado actualizado.' }
}

export async function setAttendanceQuick(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = z
    .object({ sessionId: z.uuid(), studentId: z.uuid(), status: z.enum(['present', 'absent', 'justified']) })
    .safeParse(Object.fromEntries(formData))
  if (!input.success) return { ok: false, message: 'No se pudo actualizar la asistencia.' }
  let auth
  try {
    auth = await requireAdmin()
  } catch {
    return { ok: false, message: 'No autorizado.' }
  }
  const { error } = await auth.supabase
    .schema('classes')
    .from('attendance')
    .upsert({
      session_id: input.data.sessionId,
      student_id: input.data.studentId,
      status: input.data.status,
      marked_by: auth.user.id,
      marked_at: new Date().toISOString(),
    })
  if (error) return { ok: false, message: 'No se pudo guardar la asistencia.' }
  revalidatePath(`/clases/${input.data.sessionId}`)
  return { ok: true, message: 'Asistencia guardada.' }
}
