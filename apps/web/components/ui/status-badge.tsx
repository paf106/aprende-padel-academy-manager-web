import { statusLabels, type ClassStatus } from '@aprende-padel/core'
export function StatusBadge({ status }: { status: ClassStatus }) {
  const colors = { pending: 'bg-blue-50 text-blue-800', completed: 'bg-slate-100 text-slate-600', cancelled: 'bg-rose-50 text-rose-800' }
  return <span className={`inline-flex min-h-7 items-center gap-2 rounded-full px-3 text-xs font-medium ${colors[status]}`}><span className="size-2 rounded-full bg-current" aria-hidden="true"/>{statusLabels[status]}</span>
}
