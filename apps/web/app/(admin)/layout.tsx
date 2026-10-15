import { notFound } from 'next/navigation'
import { requireAdmin } from '../lib/auth'
import { getEnabledModules } from '../lib/modules'
import { AdminSidebar } from '../../components/admin-shell'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const claims = await requireAdmin()
  const orgId = claims.app_metadata?.organization_id
  if (typeof orgId !== 'string') notFound()
  const enabled = await getEnabledModules(orgId)
  return <div className="min-h-screen bg-slate-50 pb-24 md:pb-0 md:pl-[248px]"><AdminSidebar enabled={enabled}/><div id="main-content" tabIndex={-1}>{children}</div></div>
}
