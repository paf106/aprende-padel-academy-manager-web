import { notFound } from 'next/navigation'
import type { ModuleId } from '@aprende-padel/core'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { requireAdmin } from '../lib/auth'
import { AdminSidebar } from '../../components/admin-shell'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const claims = await requireAdmin()
  const supabase = await getSupabaseServer()
  const orgId = claims.app_metadata?.organization_id
  if (typeof orgId !== 'string') notFound()
  const { data, error } = await supabase.schema('core').from('module_activations').select('module_id').eq('organization_id', orgId).eq('enabled', true)
  if (error) throw new Error('No se pudieron cargar los módulos de la organización')
  const enabled = (data ?? []).map((entry) => entry.module_id as ModuleId)
  return <div className="min-h-screen bg-slate-50 md:pl-[248px]"><AdminSidebar enabled={enabled}/>{children}</div>
}
