'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { getAdminUser } from '../../lib/auth'
import type { ActionResult } from '../clases/actions'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  municipality: z.string().trim().min(2).max(100),
  address: z.string().max(240).optional(),
  timezone: z.string().min(3).max(60).refine((value) => {
    try { new Intl.DateTimeFormat('es-ES', { timeZone: value }); return true } catch { return false }
  }),
})

export async function createClub(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Revisa el nombre, localidad y zona horaria del club.' }
  const user = await getAdminUser()
  if (!user) return { ok: false, message: 'No autorizado.' }
  const organizationId = user.app_metadata?.organization_id
  if (typeof organizationId !== 'string') return { ok: false, message: 'Organización no disponible.' }
  const supabase = await getSupabaseServer()
  const slug = parsed.data.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const { error } = await supabase.schema('core').from('clubs').insert({
    organization_id: organizationId,
    name: parsed.data.name,
    slug,
    municipality: parsed.data.municipality,
    address: parsed.data.address || null,
    timezone: parsed.data.timezone,
  })
  if (error) return { ok: false, message: 'No se pudo crear el club. Comprueba que el nombre no esté duplicado.' }
  revalidatePath('/clubes')
  revalidatePath('/clases')
  return { ok: true, message: 'Club creado.' }
}
