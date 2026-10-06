'use server'

import { getSupabaseServer } from '@aprende-padel/db/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const sessionSchema = z.object({
  clubId: z.uuid(), teacherId: z.uuid(), category: z.enum(['adult','child']), date: z.iso.date(), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.coerce.number().int().min(30).max(180), notes: z.string().max(500).optional()
})
const cancellationSchema = z.object({ sessionId: z.uuid(), reason: z.string().trim().min(1).max(300) })
const statusSchema = z.object({ sessionId: z.uuid(), status: z.enum(['pending','completed','cancelled']), reason: z.string().optional() })
export type ActionResult = { ok: boolean; message: string }

async function requireAdmin() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata.role !== 'admin') throw new Error('No autorizado')
  return { supabase, user }
}

export async function createSession(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const parsed = sessionSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { ok: false, message: 'Completa los campos obligatorios de la clase.' }
    const studentIdsResult = z.array(z.uuid()).max(16).safeParse(formData.getAll('studentIds'))
    if (!studentIdsResult.success) return { ok: false, message: 'Selecciona hasta 16 alumnos válidos.' }
    const { supabase, user } = await requireAdmin()
    const org = user.app_metadata.organization_id as string
    const studentIds = [...new Set(studentIdsResult.data)]
    const localStart = `${parsed.data.date}T${parsed.data.time}:00`
    const { error } = await supabase.schema('classes').rpc('create_session', { p_club_id: parsed.data.clubId, p_teacher_id: parsed.data.teacherId, p_category: parsed.data.category, p_starts_at: localStart, p_duration_minutes: parsed.data.duration, p_student_ids: studentIds, p_notes: parsed.data.notes || undefined })
    if (error) return { ok: false, message: 'No se ha podido crear la clase. Revisa profesor, club, categoría, aforo y horario.' }
    revalidatePath('/'); revalidatePath('/clases')
    return { ok: true, message: 'Clase creada correctamente.' }
  } catch { return { ok: false, message: 'No se ha podido crear la clase.' } }
}

export async function generateFromGroup(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const input = z.object({ groupId: z.uuid(), start: z.iso.date(), end: z.iso.date() }).safeParse(Object.fromEntries(formData))
    if (!input.success || input.data.end < input.data.start) return { ok: false, message: 'Indica un grupo y un intervalo válido.' }
    const { groupId, start, end } = input.data
    const { supabase } = await requireAdmin()
    const { data, error } = await supabase.schema('classes').rpc('generate_sessions', { target_group_id: groupId, range_start: start, range_end: end })
    if (error) return { ok: false, message: 'No se han podido generar las sesiones. Comprueba el grupo y el periodo.' }
    revalidatePath('/'); revalidatePath('/clases')
    return { ok: true, message: `${data ?? 0} sesiones nuevas generadas.` }
  } catch { return { ok: false, message: 'No se han podido generar las sesiones.' } }
}

export async function setSessionStatus(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || (parsed.data.status === 'cancelled' && !parsed.data.reason?.trim())) return { ok: false, message: 'La cancelación requiere un motivo.' }
  try {
    const { supabase } = await requireAdmin()
    const { error } = await supabase.schema('classes').rpc('set_session_status', { p_session_id: parsed.data.sessionId, p_status: parsed.data.status, p_reason: parsed.data.reason ?? undefined })
    if (error) return { ok: false, message: 'No se pudo actualizar el estado de la clase.' }
    revalidatePath('/'); revalidatePath('/clases'); revalidatePath(`/clases/${parsed.data.sessionId}`)
    return { ok: true, message: 'Estado actualizado.' }
  } catch { return { ok: false, message: 'No se pudo actualizar el estado de la clase.' } }
}

export async function updateAttendance(_: { ok: boolean; message: string } | null, formData: FormData): Promise<{ok:boolean;message:string}> {
  const parsed = z.object({ sessionId: z.uuid(), studentId: z.uuid(), status: z.enum(['present','absent','justified']), comment: z.string().trim().max(300).optional() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Datos de asistencia no válidos.' }
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata.role !== 'admin') return { ok: false, message: 'No autorizado.' }
  const { error } = await supabase.schema('classes').from('attendance').upsert({ session_id: parsed.data.sessionId, student_id: parsed.data.studentId, status: parsed.data.status, comment: parsed.data.comment||null, marked_by: user.id, marked_at: new Date().toISOString() })
  if (error) return { ok: false, message: 'No se pudo guardar la asistencia.' }
  revalidatePath(`/clases/${parsed.data.sessionId}`)
  return { ok: true, message: 'Asistencia guardada.' }
}

export async function markAllAttendance(sessionId:string):Promise<ActionResult>{const id=z.uuid().safeParse(sessionId);if(!id.success)return{ok:false,message:'Clase no válida.'};const db=await getSupabaseServer();const{data:{user}}=await db.auth.getUser();if(user?.app_metadata.role!=='admin')return{ok:false,message:'No autorizado.'};const{data:members,error:membersError}=await db.schema('classes').from('session_students').select('student_id').eq('session_id',sessionId);if(membersError)return{ok:false,message:'No se pudo leer el alumnado de la clase.'};if(!members?.length)return{ok:true,message:'No hay alumnos inscritos.'};const rows=members.map(member=>({session_id:sessionId,student_id:member.student_id,status:'present' as const,marked_by:user.id,marked_at:new Date().toISOString()}));const{error}=await db.schema('classes').from('attendance').upsert(rows);if(error)return{ok:false,message:'No se pudo guardar la asistencia.'};revalidatePath(`/clases/${sessionId}`);return{ok:true,message:`${rows.length} alumnos marcados como presentes.`}}

const editSessionSchema=z.object({sessionId:z.uuid(),localStart:z.string().regex(/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/),duration:z.coerce.number().int().min(30).max(180),notes:z.string().max(500).optional()})
export async function editSession(_:ActionResult|null,formData:FormData):Promise<ActionResult>{const parsed=editSessionSchema.safeParse(Object.fromEntries(formData));if(!parsed.success)return{ok:false,message:'Revisa fecha, hora y duración.'};const db=await getSupabaseServer();const{data:{user}}=await db.auth.getUser();if(user?.app_metadata.role!=='admin')return{ok:false,message:'No autorizado.'};const{error}=await db.schema('classes').rpc('reschedule_session',{p_session_id:parsed.data.sessionId,p_local_start:parsed.data.localStart,p_duration_minutes:parsed.data.duration,p_notes:parsed.data.notes||undefined});if(error)return{ok:false,message:'No se pudo actualizar la clase. Revisa solapes del profesor.'};revalidatePath('/clases');revalidatePath(`/clases/${parsed.data.sessionId}`);return{ok:true,message:'Clase actualizada.'}}
export async function deleteSession(id:string):Promise<ActionResult>{const valid=z.uuid().safeParse(id);if(!valid.success)return{ok:false,message:'Clase no válida.'};const db=await getSupabaseServer();const{data:{user}}=await db.auth.getUser();if(user?.app_metadata.role!=='admin')return{ok:false,message:'No autorizado.'};const{data:session}=await db.schema('classes').from('sessions').select('id').eq('id',id).maybeSingle();if(!session)return{ok:false,message:'Clase no encontrada.'};const{data:billed,error:billedError}=await db.schema('payments').from('teacher_settlement_lines').select('id').eq('session_id',id).limit(1);if(billedError)return{ok:false,message:'No se pudo verificar si la clase está liquidada.'};if(billed?.length)return{ok:false,message:'No se puede eliminar: esta clase ya está incluida en una liquidación.'};const{error}=await db.schema('classes').from('sessions').delete().eq('id',id);if(error)return{ok:false,message:'No se pudo eliminar la clase.'};revalidatePath('/clases');revalidatePath('/');return{ok:true,message:'Clase eliminada.'}}
export async function updateSessionRoster(_:ActionResult|null,formData:FormData):Promise<ActionResult>{const input=z.object({sessionId:z.uuid(),studentIds:z.array(z.uuid()).max(16)}).safeParse({sessionId:formData.get('sessionId'),studentIds:formData.getAll('studentIds')});if(!input.success)return{ok:false,message:'Alumnado o aforo no válido.'};const db=await getSupabaseServer();const{data:{user}}=await db.auth.getUser();if(user?.app_metadata.role!=='admin')return{ok:false,message:'No autorizado.'};const{error}=await db.schema('classes').rpc('update_session_roster',{p_session_id:input.data.sessionId,p_student_ids:[...new Set(input.data.studentIds)]});if(error)return{ok:false,message:'No se pudo actualizar el alumnado. Comprueba club, categoría y aforo.'};revalidatePath(`/clases/${input.data.sessionId}`);revalidatePath('/clases');return{ok:true,message:'Alumnado actualizado.'}}
