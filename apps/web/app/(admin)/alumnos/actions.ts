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
  const { data: tariff } = await supabase.schema('payments').from('tariffs').select('id')
    .eq('id', parsed.data.tariffId).eq('category', parsed.data.category).maybeSingle()
  if (!tariff) return { ok: false, message: 'Selecciona una tarifa activa de la misma categoría.' }

  const input = parsed.data
  const { data: student, error } = await supabase.schema('core').from('students').insert({
    organization_id: organizationId,
    club_id: input.clubId,
    first_name: input.firstName,
    last_name: input.lastName,
    birth_date: input.birthDate,
    category: input.category,
    gender: input.gender,
    level: input.level,
    email: input.email || null,
    phone: input.phone || null,
  }).select('id').single()
  if (error || !student) return { ok: false, message: 'No se pudo guardar el alumno.' }
  const { error: tariffError } = await supabase.schema('payments').from('student_tariffs').insert({
    student_id: student.id,
    tariff_id: input.tariffId,
    starts_on: localTodayInTimeZone('Europe/Madrid'),
  })
  if (tariffError) {
    await supabase.schema('core').from('students').update({ active: false }).eq('id', student.id)
    return { ok: false, message: 'Alumno creado sin asignar tarifa; revisa el catálogo de tarifas.' }
  }
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
  const [{ data: student }, { data: tariff }] = await Promise.all([
    db.schema('core').from('students').select('category').eq('id', input.data.studentId).maybeSingle(),
    db.schema('payments').from('tariffs').select('category').eq('id', input.data.tariffId).maybeSingle(),
  ])
  if (!student || !tariff || student.category !== tariff.category) return { ok: false, message: 'La categoría de la tarifa debe coincidir con la del alumno.' }
  const start = input.data.startsOn
  const { data: assignments, error } = await db.schema('payments').from('student_tariffs').select('id,starts_on,ends_on')
    .eq('student_id', input.data.studentId).is('ends_on', null).order('starts_on', { ascending: false }).limit(1)
  if (error) return { ok: false, message: 'No se pudo leer la tarifa anterior.' }
  const current = assignments?.[0]
  if (current && current.starts_on >= start) return { ok: false, message: 'La nueva tarifa debe empezar después de la tarifa actual.' }
  if (current) {
    const end = new Date(`${start}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() - 1)
    const { error: updateError } = await db.schema('payments').from('student_tariffs').update({ ends_on: end.toISOString().slice(0, 10) }).eq('id', current.id)
    if (updateError) return { ok: false, message: 'No se pudo cerrar la tarifa anterior.' }
  }
  const { error: insertError } = await db.schema('payments').from('student_tariffs').insert({ student_id: input.data.studentId, tariff_id: input.data.tariffId, starts_on: start })
  if (insertError) return { ok: false, message: 'No se pudo asignar la nueva tarifa.' }
  revalidatePath('/alumnos')
  revalidatePath('/pagos')
  return { ok: true, message: 'Tarifa asignada.' }
}
