import { notFound } from 'next/navigation'
import { getSupabaseServer } from '@aprende-padel/db/server'
import { requireAdmin } from '../lib/auth'
import { getEnabledModules } from '../lib/modules'
import { AppShell } from '../../components/app-shell'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const claims = await requireAdmin()
  const orgId = claims.app_metadata?.organization_id
  if (typeof orgId !== 'string') notFound()
  const supabase = await getSupabaseServer()
  const [enabled, { data: clubs }] = await Promise.all([
    getEnabledModules(orgId),
    supabase.schema('core').from('clubs').select('id,name').order('name'),
  ])
  return (
    <AppShell enabled={enabled} clubs={clubs ?? []} searchItems={[]}>
      {children}
    </AppShell>
  )
}
