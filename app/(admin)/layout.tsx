import { requireAdmin } from '@/lib/auth'
import { getEnabledModules } from '@/lib/enabled-modules'
import { AppShell } from '@/components/app-shell'

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin()
  const enabled = await getEnabledModules()
  return (
    <AppShell enabled={enabled} searchItems={[]}>
      {children}
    </AppShell>
  )
}
