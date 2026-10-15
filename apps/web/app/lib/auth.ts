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

export async function getAdminUser() {
  const user = await getCurrentUser()
  return user?.app_metadata?.role === 'admin' ? user : null
}

export async function requireAdmin() {
  const user = await getAdminUser()
  if (!user) redirect('/login')
  return { ...user, sub: user.id, app_metadata: user.app_metadata ?? {} }
}
