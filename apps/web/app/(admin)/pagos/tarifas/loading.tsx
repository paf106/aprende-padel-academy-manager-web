export default function TariffsLoading() {
  return <main aria-busy="true" className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-7 sm:px-8"><span role="status" className="sr-only">Cargando tarifas…</span><div aria-hidden="true" className="h-12 w-72 animate-pulse rounded bg-slate-200"/><div aria-hidden="true" className="h-56 animate-pulse rounded-2xl bg-white"/></main>
}
