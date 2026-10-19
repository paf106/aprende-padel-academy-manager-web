export default function ClassesLoading() {
  return (
    <main aria-busy="true" className="min-w-0 overflow-hidden pb-10">
      <span role="status" className="sr-only">
        Cargando calendario…
      </span>
      <div aria-hidden="true" className="h-[68px] animate-pulse border-b border-slate-200 bg-white" />
      <div aria-hidden="true" className="h-14 animate-pulse border-b border-slate-200 bg-white" />
      <div
        aria-hidden="true"
        className="m-2 h-[min(72vh,850px)] animate-pulse rounded-2xl border border-slate-200 bg-white sm:m-4"
      />
    </main>
  )
}
