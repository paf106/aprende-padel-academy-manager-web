'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { localTodayInTimeZone } from '@aprende-padel/core'
import { getAdminUser } from '../../lib/auth'
import type { ActionResult } from '../clases/actions'

const schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(100),
  birthDate: z.iso.date(),
  category: z.enum(['adult', 'child']),
  gender: z.enum(['female', 'male', 'other', 'unspecified']),
  level: z.enum(['iniciacion', 'principiante', 'medio', 'avanzado', 'competicion']),
  clubId: z.uuid(),
  email: z.email().or(z.literal('')).optional(),
  phone: z.string().max(40).optional(),
  tariffId: z.uuid(),
})

export async function saveStudent(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Revisa los datos obligatorios del alumno.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const organizationId = user.app_metadata?.organization_id
  if (typeof organizationId !== 'string') return { ok: false, message: 'Organización no disponible.' }
  const supabase = await getSupabaseServer()
  const input = parsed.data
  const { error } = await supabase.schema('payments').rpc('create_student_with_tariff', {
    p_club_id: input.clubId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_birth_date: input.birthDate,
    p_category: input.category,
    p_gender: input.gender,
    p_level: input.level,
    p_email: input.email || null,
    p_phone: input.phone || null,
    p_tariff_id: input.tariffId,
    p_starts_on: localTodayInTimeZone('Europe/Madrid'),
  })
  if (error) return { ok: false, message: 'No se pudo guardar el alumno con su tarifa. Revisa club y tarifa.' }
  revalidatePath('/alumnos')
  return { ok: true, message: 'Alumno creado y tarifa asignada.' }
}

export async function deactivateStudent(id: string): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return { ok: false, message: 'Alumno no válido.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.schema('core').from('students').update({ active: false }).eq('id', parsed.data).select('id').maybeSingle()
  if (error || !data) return { ok: false, message: 'No se pudo desactivar el alumno.' }
  revalidatePath('/alumnos')
  return { ok: true, message: 'Alumno desactivado.' }
}

export async function updateStudent(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = z.object({
    id: z.uuid(),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(100),
    email: z.email().or(z.literal('')).optional(),
    phone: z.string().max(40).optional(),
    level: z.enum(['iniciacion', 'principiante', 'medio', 'avanzado', 'competicion']),
  }).safeParse(Object.fromEntries(formData))
  if (!input.success) return { ok: false, message: 'Revisa los campos del alumno.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.schema('core').from('students').update({
    first_name: input.data.firstName,
    last_name: input.data.lastName,
    email: input.data.email || null,
    phone: input.data.phone || null,
    level: input.data.level,
  }).eq('id', input.data.id).select('id').maybeSingle()
  if (error || !data) return { ok: false, message: 'No se pudo actualizar el alumno.' }
  revalidatePath('/alumnos')
  revalidatePath('/grupos')
  return { ok: true, message: 'Alumno actualizado.' }
}

export async function changeStudentTariff(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const input = z.object({ studentId: z.uuid(), tariffId: z.uuid(), startsOn: z.iso.date() }).safeParse(Object.fromEntries(formData))
  if (!input.success) return { ok: false, message: 'Selecciona una tarifa y una fecha válida.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const db = await getSupabaseServer()
  const { error } = await db.schema('payments').rpc('change_student_tariff', {
    p_student_id: input.data.studentId,
    p_tariff_id: input.data.tariffId,
    p_starts_on: input.data.startsOn,
  })
  if (error) return { ok: false, message: 'No se pudo asignar la tarifa. Revisa categoría y fechas.' }
  revalidatePath('/alumnos')
  revalidatePath('/pagos')
  return { ok: true, message: 'Tarifa asignada.' }
}
