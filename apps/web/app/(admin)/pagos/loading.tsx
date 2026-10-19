export default function PaymentsLoading() {
  return (
    <main aria-busy="true" className="mx-auto w-full max-w-7xl space-y-5 px-4 py-7 pb-24 sm:px-8 md:pb-7">
      <span role="status" className="sr-only">
        Cargando pagos…
      </span>
      <div aria-hidden="true" className="h-20 animate-pulse rounded-2xl bg-white" />
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-2xl bg-white" />
        <div className="h-28 animate-pulse rounded-2xl bg-white" />
      </div>
      <div aria-hidden="true" className="h-[420px] animate-pulse rounded-2xl bg-white" />
    </main>
  )
}
