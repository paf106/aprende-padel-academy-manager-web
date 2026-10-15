export function FormMessage({ children, tone = 'error' }: { children: React.ReactNode; tone?: 'error' | 'success' }) {
  return <p className={`rounded-xl px-3 py-2 text-sm ${tone === 'error' ? 'bg-rose-50 text-rose-900' : 'bg-emerald-50 text-emerald-900'}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>{children}</p>
}
