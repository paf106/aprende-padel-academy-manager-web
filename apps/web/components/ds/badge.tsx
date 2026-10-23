import { cn } from '@aprende-padel/ui/cn'
import { statusLabels, type ClassStatus } from '@aprende-padel/core'

type Tone = 'neutral' | 'brand' | 'info' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}

const classTone: Record<ClassStatus, Tone> = { pending: 'info', completed: 'brand', cancelled: 'danger' }
export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return <Badge tone={classTone[status]}>{statusLabels[status]}</Badge>
}

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'none'
const paymentTone: Record<PaymentStatus, Tone> = {
  paid: 'brand',
  partial: 'warning',
  pending: 'danger',
  none: 'neutral',
}
const paymentLabel: Record<PaymentStatus, string> = {
  paid: 'Pagado',
  partial: 'Parcial',
  pending: 'No pagado',
  none: 'Sin importe',
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentTone[status]}>{paymentLabel[status]}</Badge>
}
