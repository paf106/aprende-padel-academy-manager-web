export default function ClassesLoading() {
  return (
    <main
      aria-busy="true"
      className="fixed inset-x-0 top-0 bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] flex min-h-0 min-w-0 flex-col overflow-hidden md:bottom-0 md:left-[248px]"
    >
      <span role="status" className="sr-only">
        Cargando calendario…
      </span>
      <div
        aria-hidden="true"
        className="h-[60px] shrink-0 animate-pulse border-b border-slate-200 bg-white"
      />
      <div aria-hidden="true" className="h-12 shrink-0 animate-pulse border-b border-slate-200 bg-white" />
      <div aria-hidden="true" className="h-8 shrink-0 animate-pulse border-b border-slate-100 bg-white" />
      <div
        aria-hidden="true"
        className="m-1 min-h-0 flex-1 animate-pulse rounded-xl border border-slate-200 bg-white sm:m-2"
      />
    </main>
  )
}
