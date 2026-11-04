'use server'

import { requireAdmin } from '@/lib/auth'
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/core/image'
import { getSupabaseServer } from '@/lib/supabase/server'

export type UploadResult = { ok: true; url: string } | { ok: false; error: string }

const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

/** Stores a club photo (already scaled down in the browser) and returns its public URL. */
export async function uploadClubPhoto(dataUrl: string): Promise<UploadResult> {
  const claims = await requireAdmin()
  const organizationId = claims.app_metadata?.organization_id as string | undefined
  if (!organizationId) return { ok: false, error: 'Tu usuario no pertenece a ninguna organización.' }

  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match || !(IMAGE_TYPES as readonly string[]).includes(match[1])) {
    return { ok: false, error: 'Usa una imagen JPG, PNG o WebP' }
  }
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.byteLength > MAX_IMAGE_BYTES) return { ok: false, error: 'La imagen no puede superar los 5 MB' }

  const supabase = await getSupabaseServer()
  const path = `${organizationId}/${crypto.randomUUID()}.${extensions[match[1]]}`
  const { error } = await supabase.storage.from('club-photos').upload(path, bytes, { contentType: match[1] })
  if (error) return { ok: false, error: error.message }
  return { ok: true, url: supabase.storage.from('club-photos').getPublicUrl(path).data.publicUrl }
}
