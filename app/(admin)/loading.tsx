import { Skeleton } from '@/components/ds/skeleton'

export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 md:px-8 md:py-8" aria-busy="true">
      <span role="status" className="sr-only">
        Cargando…
      </span>
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </main>
  )
}
