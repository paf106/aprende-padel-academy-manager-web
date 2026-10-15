export default function ClassesLoading() {
  return <main aria-busy="true" className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-7 sm:px-8"><span role="status" className="sr-only">Cargando clases…</span><div aria-hidden="true" className="h-14 animate-pulse rounded-xl bg-white"/><div aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-slate-200"/><div aria-hidden="true" className="h-[70vh] animate-pulse rounded-2xl border border-slate-200 bg-white"/></main>
}
