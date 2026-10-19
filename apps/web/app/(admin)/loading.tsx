export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-7 pb-24 sm:px-8 md:pb-7" aria-busy="true">
      <span role="status" className="sr-only">
        Cargando resumen…
      </span>
      <div aria-hidden="true" className="h-16 w-full animate-pulse rounded-2xl bg-white" />
      <div aria-hidden="true" className="h-48 animate-pulse rounded-2xl bg-white" />
      <div aria-hidden="true" className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="h-[360px] animate-pulse rounded-2xl bg-white" />
        <div className="h-[360px] animate-pulse rounded-2xl bg-white" />
      </div>
    </main>
  )
}
