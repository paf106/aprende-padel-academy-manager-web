export default function TariffsLoading() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-7xl space-y-5 px-4 py-7 pb-24 sm:px-8 md:pb-7">
      <span role="status" className="sr-only">
        Cargando tarifas…
      </span>
      <div aria-hidden="true" className="h-16 animate-pulse rounded-2xl bg-white" />
      <div aria-hidden="true" className="h-56 animate-pulse rounded-2xl bg-white" />
      <div aria-hidden="true" className="h-56 animate-pulse rounded-2xl bg-white" />
    </main>
  )
}
