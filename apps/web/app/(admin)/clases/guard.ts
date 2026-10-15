import {notFound} from 'next/navigation'
import type { ModuleId } from '@aprende-padel/core'
import {getEnabledModules} from '../../lib/modules'
import {requireAdmin} from '../../lib/auth'
export async function requireModule(moduleId: Extract<ModuleId, 'classes' | 'payments'>) {const claims=await requireAdmin();const org=claims.app_metadata?.organization_id;if(typeof org!=='string')notFound();const enabled=await getEnabledModules(org);if(!enabled.includes(moduleId))notFound()}
