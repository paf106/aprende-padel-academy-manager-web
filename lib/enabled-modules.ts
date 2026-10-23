import { notFound } from 'next/navigation'
import { modules } from '@/lib/modules'
import type { ModuleId } from '@/lib/core/types'

// Demo data: every available module is enabled until organization modules live in the database.
export async function getEnabledModules(): Promise<ModuleId[]> {
  return modules.filter((module) => module.status === 'active').map((module) => module.id)
}

export async function requireModule(moduleId: ModuleId) {
  const enabled = await getEnabledModules()
  if (!enabled.includes(moduleId)) notFound()
}
