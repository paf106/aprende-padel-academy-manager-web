'use server'

import { getSupabaseServer } from '@aprende-padel/db/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const sessionSchema = z.object({
  clubId: z.uuid(), teacherId: z.uuid(), date: z.iso.date(), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.coerce.number().int().min(30).max(180), studentIds: z.string().optional(), notes: z.string().max(500).optional()
})

async function requireAdmin() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata.role !== 'admin') throw new Error('No autorizado')
  return { supabase, user }
}

export async function createSession(_: string | null, formData: FormData) {
  try {
    const parsed = sessionSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return 'Completa los campos obligatorios de la clase.'
    const { supabase, user } = await requireAdmin()
    const org = user.app_metadata.organization_id as string
    const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00+02:00`)
    const endsAt = new Date(startsAt.getTime() + parsed.data.duration * 60_000)
    const { data: session, error } = await supabase.schema('classes').from('sessions').insert({ organization_id: org, club_id: parsed.data.clubId, teacher_id: parsed.data.teacherId, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), notes: parsed.data.notes || null }).select('id').single()
    if (error || !session) return error?.message ?? 'No se ha podido crear la clase.'
    const studentIds = (parsed.data.studentIds ?? '').split(',').filter(Boolean)
    if (studentIds.length) {
      const { error: studentsError } = await supabase.schema('classes').from('session_students').insert(studentIds.map((studentId) => ({ session_id: session.id, student_id: studentId })))
      if (studentsError) return studentsError.message
    }
    revalidatePath('/'); revalidatePath('/clases')
    return 'Clase creada correctamente.'
  } catch (error) { return error instanceof Error ? error.message : 'No se ha podido crear la clase.' }
}

export async function generateFromGroup(_: string | null, formData: FormData) {
  try {
    const groupId = z.uuid().parse(formData.get('groupId'))
    const start = z.iso.date().parse(formData.get('start'))
    const end = z.iso.date().parse(formData.get('end'))
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase.rpc('generate_sessions' as never, { target_group_id: groupId, range_start: start, range_end: end } as never)
    if (error) return error.message
    revalidatePath('/'); revalidatePath('/clases')
    return `${data ?? 0} sesiones nuevas generadas.`
  } catch (error) { return error instanceof Error ? error.message : 'No se han podido generar las sesiones.' }
}

export async function updateAttendance(sessionId: string, studentId: string, status: 'present' | 'absent' | 'justified') {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.schema('classes').from('attendance').upsert({ session_id: sessionId, student_id: studentId, status, marked_by: user.id, marked_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  revalidatePath(`/clases/${sessionId}`)
}
