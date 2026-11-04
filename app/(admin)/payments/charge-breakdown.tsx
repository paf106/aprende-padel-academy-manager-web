'use client'

import { formatMoney } from '@/lib/core/money'
import type { ExtraCharge } from '@/lib/demo/state'
import type { MemberLine, RateOverride } from '@/lib/payments/monthly-charge'
import type { AppliedOffer, RateCatalog } from '@/lib/payments/rates'

export type BreakdownData = {
  offers: AppliedOffer[]
  overrides: RateOverride[]
  warnings: string[]
  lines: MemberLine[]
  extraCharges?: ExtraCharge[]
}

/** Explains how a monthly charge was built: offers, manual prices, extra classes and credits. */
export function ChargeBreakdown({ data, catalog }: { data: BreakdownData; catalog: RateCatalog }) {
  const segmentName = (id: string | null) =>
    catalog.segments.find((s) => s.id === id)?.name ?? 'Sin tramo de edad'
  const offerName = (id: string | null) => catalog.offers.find((o) => o.id === id)?.name
  const earned = data.lines.reduce((sum, line) => sum + line.earnedCreditCents, 0)

  return (
    <div className="grid gap-3">
      {data.offers.map((offer) => (
        <p key={offer.offerId + offer.memberIds.join()} className="text-sm">
          <span className="font-semibold text-brand">Oferta aplicada:</span> {offer.name} ·{' '}
          {formatMoney(offer.priceCents)}
        </p>
      ))}
      {data.overrides.map((override) => (
        <p key={override.id} className="text-sm">
          <span className="font-semibold text-warning">Precio fijado a mano:</span>{' '}
          {formatMoney(override.amountCents)} · {override.reason}
        </p>
      ))}
      {data.warnings.map((warning) => (
        <p key={warning} role="alert" className="text-sm text-danger">
          {warning}
        </p>
      ))}
      <ul className="grid gap-2 text-sm">
        {data.lines.map((line) => (
          <li key={line.memberId} className="grid gap-0.5 sm:flex sm:justify-between sm:gap-4">
            <span>
              <span className="font-medium">{line.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {segmentName(line.segmentId)} · {line.classesPerWeek}{' '}
                {line.classesPerWeek === 1 ? 'día' : 'días'}/semana ·{' '}
                {line.source === 'offer'
                  ? (offerName(line.offerId) ?? 'Oferta')
                  : line.source === 'override'
                    ? 'Precio fijado'
                    : 'Cuota individual'}
              </span>
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatMoney(line.shareCents)}
              {line.extraClasses > 0
                ? ` + ${line.extraClasses} ${line.extraClasses === 1 ? 'clase extra' : 'clases extra'} ${formatMoney(line.extraCents)}`
                : ''}
              {line.appliedCreditCents > 0 ? ` − descuento ${formatMoney(line.appliedCreditCents)}` : ''} ={' '}
              <span className="font-semibold text-foreground">{formatMoney(line.totalCents)}</span>
            </span>
          </li>
        ))}
      </ul>
      {data.extraCharges && data.extraCharges.length > 0 ? (
        <ul className="grid gap-1 border-t border-border pt-3 text-sm">
          {data.extraCharges.map((charge) => (
            <li key={charge.id} className="flex justify-between gap-4">
              <span>{charge.description}</span>
              <span className="tabular-nums font-semibold">{formatMoney(charge.amountCents)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {earned > 0 ? (
        <p className="text-xs text-muted-foreground">
          Se descontarán {formatMoney(earned)} de la mensualidad siguiente por clases canceladas o festivos de
          este mes.
        </p>
      ) : null}
    </div>
  )
}
