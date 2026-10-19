export function ListPageLoading({
  title,
  search = false,
  rows = 6,
  actions = true,
}: {
  title: string
  search?: boolean
  rows?: number
  actions?: boolean
}) {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-7xl space-y-5 px-4 py-7 pb-24 sm:px-8 md:pb-7">
      <span role="status" className="sr-only">
        Cargando {title.toLocaleLowerCase('es')}…
      </span>
      <header className="flex min-h-16 items-center justify-between gap-4">
        <div className="space-y-2">
          <div aria-hidden="true" className="h-9 w-52 animate-pulse rounded-lg bg-slate-200" />
          <div aria-hidden="true" className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        </div>
        {actions ? (
          <div aria-hidden="true" className="h-11 w-36 animate-pulse rounded-xl bg-emerald-100" />
        ) : null}
      </header>
      {search ? (
        <div aria-hidden="true" className="h-14 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : null}
      <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex min-h-[76px] items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-0"
          >
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-64 max-w-full animate-pulse rounded bg-slate-100" />
            </div>
            <div className="hidden h-9 w-28 animate-pulse rounded-xl bg-slate-100 sm:block" />
            <div className="hidden h-9 w-24 animate-pulse rounded-xl bg-slate-100 sm:block" />
          </div>
        ))}
      </div>
    </main>
  )
}
