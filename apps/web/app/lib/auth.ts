import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@aprende-padel/db/server'

export const getCurrentClaims = cache(async () => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null
  return data.claims
})

export const getCurrentUser = cache(async () => {
  const claims = await getCurrentClaims()
  if (!claims?.sub) return null
  return { id: claims.sub, email: claims.email, app_metadata: claims.app_metadata }
})

export const getAdminUser = cache(async () => {
  const user = await getCurrentUser()
  if (user?.app_metadata?.role !== 'admin') return null
  const supabase = await getSupabaseServer()
  const { data } = await supabase
    .schema('core')
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .eq('role', 'admin')
    .eq('active', true)
    .maybeSingle()
  return data ? user : null
})

export async function requireAdmin() {
  const user = await getAdminUser()
  if (!user) redirect('/login')
  return { ...user, sub: user.id, app_metadata: user.app_metadata ?? {} }
}

export async function requirePlatformAdmin() {
  const claims = await getCurrentClaims()
  if (claims?.app_metadata?.is_platform_admin !== true) redirect('/login')
  return claims
}
