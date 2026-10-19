export function FormMessage({
  children,
  tone = 'error',
}: {
  children: React.ReactNode
  tone?: 'error' | 'success' | 'info'
}) {
  const styles =
    tone === 'error'
      ? 'bg-rose-50 text-rose-900'
      : tone === 'success'
        ? 'bg-emerald-50 text-emerald-900'
        : 'bg-amber-50 text-amber-950'
  return (
    <p className={`rounded-xl px-3 py-2 text-sm ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  )
}
