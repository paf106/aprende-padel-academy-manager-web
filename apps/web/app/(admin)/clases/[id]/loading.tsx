export default function SessionLoading() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-24 pt-5 sm:px-8 md:pb-12">
      <span role="status" className="sr-only">
        Cargando detalle de la clase…
      </span>
      <div aria-hidden="true" className="h-5 w-48 animate-pulse rounded bg-slate-200" />
      <div aria-hidden="true" className="h-32 animate-pulse rounded-2xl bg-white" />
      <div aria-hidden="true" className="h-80 animate-pulse rounded-2xl bg-white" />
    </main>
  )
}
