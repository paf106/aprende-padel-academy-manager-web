import { cache } from 'react'
import { notFound } from 'next/navigation'
import { modules } from '@/lib/modules'
import type { ModuleId } from '@/lib/core/types'
import { getSupabaseServer } from '@/lib/supabase/server'

/** Modules enabled for the signed-in organization (`core.organization_modules`), once per request. */
export const getEnabledModules = cache(async (): Promise<ModuleId[]> => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .schema('core')
    .from('organization_modules')
    .select('module_id')
    .eq('enabled', true)
  if (error) {
    console.error('getEnabledModules failed', { code: error.code, message: error.message })
    return []
  }
  const enabled = new Set(data.map((row) => row.module_id as string))
  return modules
    .filter((module) => module.status === 'active' && enabled.has(module.id))
    .map((module) => module.id)
})

export async function requireModule(moduleId: ModuleId) {
  const enabled = await getEnabledModules()
  if (!enabled.includes(moduleId)) notFound()
}
