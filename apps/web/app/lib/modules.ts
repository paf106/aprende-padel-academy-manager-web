import { cache } from 'react'
import type { ModuleId } from '@aprende-padel/core'
import { getSupabaseServer } from '@aprende-padel/db/server'

const moduleIds = new Set<ModuleId>(['classes', 'courts', 'payments', 'inventory'])

export const getEnabledModules = cache(async (organizationId: string): Promise<ModuleId[]> => {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase.schema('core').from('module_activations')
    .select('module_id').eq('organization_id', organizationId).eq('enabled', true)
  if (error) throw new Error('No se pudieron cargar los módulos de la organización')
  return (data ?? []).flatMap(({ module_id }) => moduleIds.has(module_id as ModuleId) ? [module_id as ModuleId] : [])
})
