import {notFound} from 'next/navigation'
import {getSupabaseServer} from '@aprende-padel/db/server'
import {requireAdmin} from '../../lib/auth'
export async function requireModule(moduleId:'classes'|'payments') {const claims=await requireAdmin();const org=claims.app_metadata?.organization_id;if(typeof org!=='string')notFound();const db=await getSupabaseServer();const{data,error}=await db.schema('core').from('module_activations').select('enabled').eq('organization_id',org).eq('module_id',moduleId).maybeSingle();if(error)throw new Error('No se pudo verificar el módulo');if(!data?.enabled)notFound()}
