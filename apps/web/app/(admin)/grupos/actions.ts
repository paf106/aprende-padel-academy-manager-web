'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { getAdminUser, requireAdmin } from '../../lib/auth'
import type { ActionResult } from '../clases/actions'

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  clubId: z.uuid(),
  teacherId: z.uuid(),
  category: z.enum(['adult', 'child']),
  level: z.enum(['iniciacion', 'principiante', 'medio', 'avanzado', 'competicion']),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.coerce.number().int().min(30).max(180),
  capacity: z.coerce.number().int().min(1).max(16),
  startsOn: z.iso.date(),
  endsOn: z.preprocess((value) => value === '' ? undefined : value, z.iso.date().optional()),
  studentIds: z.array(z.uuid()).max(16),
})

const studentOptionsSchema = z.object({ clubId: z.uuid(), category: z.enum(['adult', 'child']) })

export async function getGroupStudentOptions(clubId: string, category: 'adult' | 'child') {
  const input = studentOptionsSchema.safeParse({ clubId, category })
  if (!input.success) return []
  await requireAdmin()
  const db = await getSupabaseServer()
  const { data, error } = await db.schema('core').from('students')
    .select('id,first_name,last_name,club_id,category').eq('active', true)
    .eq('club_id', input.data.clubId).eq('category', input.data.category).order('last_name').limit(1000)
  if (error) throw new Error('No se pudieron cargar los alumnos del grupo')
  return data ?? []
}

export async function createGroup(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), studentIds: formData.getAll('studentIds') })
  if (!parsed.success) return { ok: false, message: 'Revisa los campos del grupo y sus alumnos.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const organizationId = user.app_metadata?.organization_id
  if (typeof organizationId !== 'string') return { ok: false, message: 'Organización no disponible.' }
  const db = await getSupabaseServer()
  const input = parsed.data
  const { data: group, error } = await db.schema('classes').from('groups').insert({
    organization_id: organizationId,
    club_id: input.clubId,
    teacher_id: input.teacherId,
    name: input.name,
    category: input.category,
    level: input.level,
    weekday: input.weekday,
    start_time: input.startTime,
    duration_minutes: input.duration,
    capacity: input.capacity,
    starts_on: input.startsOn,
    ends_on: input.endsOn || null,
  }).select('id').single()
  if (error || !group) return { ok: false, message: 'No se pudo guardar el grupo. Revisa club y profesor asignado.' }
  if (input.studentIds.length) {
    const { error: memberError } = await db.schema('classes').from('group_members').insert(
      [...new Set(input.studentIds)].map((student_id) => ({ group_id: group.id, student_id, starts_on: input.startsOn })),
    )
    if (memberError) {
      await db.schema('classes').from('groups').delete().eq('id', group.id)
      return { ok: false, message: 'No se pudo asignar el alumnado: comprueba categoría, club y aforo.' }
    }
  }
  revalidatePath('/grupos')
  revalidatePath('/clases')
  return { ok: true, message: 'Grupo creado.' }
}

export async function deactivateGroup(id: string): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return { ok: false, message: 'Grupo no válido.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const db = await getSupabaseServer()
  const { data, error } = await db.schema('classes').from('groups').update({ active: false }).eq('id', parsed.data).select('id').maybeSingle()
  if (error || !data) return { ok: false, message: 'No se pudo desactivar el grupo.' }
  revalidatePath('/grupos')
  return { ok: true, message: 'Grupo desactivado.' }
}

export async function updateGroup(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = schema.extend({ groupId: z.uuid() }).safeParse({ ...Object.fromEntries(formData), studentIds: formData.getAll('studentIds') })
  if (!parsed.success) return { ok: false, message: 'Revisa los campos del grupo y sus alumnos.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const db = await getSupabaseServer()
  const input = parsed.data
  const { error } = await db.schema('classes').rpc('update_group', {
    p_group_id: input.groupId,
    p_name: input.name,
    p_teacher_id: input.teacherId,
    p_level: input.level,
    p_weekday: input.weekday,
    p_start_time: input.startTime,
    p_duration_minutes: input.duration,
    p_capacity: input.capacity,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn || undefined,
    p_student_ids: [...new Set(input.studentIds)],
  })
  if (error) return { ok: false, message: 'No se pudo actualizar el grupo. Comprueba aforo, categoría, club y profesor.' }
  revalidatePath('/grupos')
  revalidatePath('/clases')
  return { ok: true, message: 'Grupo actualizado.' }
}
