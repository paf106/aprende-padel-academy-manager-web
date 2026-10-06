import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@aprende-padel/db/server'

export const getCurrentClaims = cache(async () => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return null
  return data.claims
})

export async function requireAdmin() {
  const claims = await getCurrentClaims()
  if (claims?.app_metadata?.role !== 'admin') redirect('/login')
  return claims
}
