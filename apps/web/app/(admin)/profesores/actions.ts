'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@aprende-padel/db/types'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { requireAdmin } from '../../lib/auth'
import { requireModule } from '../../lib/modules'
import type { ActionResult } from '../../lib/action-result'

const schema = z.object({
  fullName: z.string().trim().min(2).max(140),
  email: z.email(),
  phone: z.string().max(40).optional(),
  clubIds: z.array(z.uuid()).min(1),
  password: z.string().min(10).max(100),
})

export async function createTeacher(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    clubIds: formData.getAll('clubIds'),
  })
  if (!parsed.success)
    return { ok: false, message: 'Revisa nombre, correo, contraseña (10 caracteres mínimo) y clubes.' }

  await requireModule('classes')
  const user = await requireAdmin()
  const organizationId = user.app_metadata.organization_id
  if (typeof organizationId !== 'string') return { ok: false, message: 'Organización no disponible.' }

  const db = await getSupabaseServer()
  const clubIds = [...new Set(parsed.data.clubIds)]
  const { data: ownedClubs, error: clubsReadError } = await db
    .schema('core')
    .from('clubs')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('active', true)
    .in('id', clubIds)
  if (clubsReadError || ownedClubs?.length !== clubIds.length) {
    return { ok: false, message: 'Selecciona únicamente clubes activos de tu organización.' }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) return { ok: false, message: 'No se pudo crear el acceso del profesor.' }

  // The secret key is used only for the Auth Admin API. Profile creation is
  // handled by the trusted auth trigger, and club assignments remain RLS-scoped.
  const authAdmin = createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await authAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
    app_metadata: { role: 'teacher', organization_id: organizationId },
  })
  if (error || !data.user) return { ok: false, message: 'No se pudo crear el acceso del profesor.' }

  const { error: assignmentError } = await db
    .schema('core')
    .from('club_teachers')
    .insert(clubIds.map((club_id) => ({ club_id, teacher_id: data.user.id })))
  if (assignmentError) {
    await authAdmin.auth.admin.deleteUser(data.user.id)
    return { ok: false, message: 'No se pudo asignar el profesor a los clubes.' }
  }

  revalidatePath('/profesores')
  revalidatePath('/clases')
  revalidatePath('/pagos/tarifas')
  return { ok: true, message: 'Profesor creado. Entrégale su contraseña inicial por un canal seguro.' }
}
