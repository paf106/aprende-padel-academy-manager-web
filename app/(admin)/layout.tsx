import { requireAdmin } from '@/lib/auth'
import { getEnabledModules } from '@/lib/enabled-modules'
import { AppShell } from '@/components/app-shell'
import { AppDataProvider } from '@/lib/data/provider'
import type { AppData } from '@/lib/data/types'
import { loadAppData } from '@/lib/db/load'

function Notice({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-2 p-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </main>
  )
}

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const claims = await requireAdmin()
  if (!claims.app_metadata?.organization_id) {
    return (
      <Notice
        title="Tu usuario no tiene organización"
        detail="Pide que te asignen una organización para ver los datos."
      />
    )
  }
  let data: AppData
  try {
    data = await loadAppData()
  } catch (error) {
    return (
      <Notice
        title="No se pudieron cargar los datos"
        detail={error instanceof Error ? error.message : 'Error desconocido'}
      />
    )
  }
  const enabled = await getEnabledModules()
  return (
    <AppDataProvider initialData={data}>
      <AppShell enabled={enabled} searchItems={[]}>
        {children}
      </AppShell>
    </AppDataProvider>
  )
}
