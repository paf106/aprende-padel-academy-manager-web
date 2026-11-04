'use client'

import { useMemo, useState } from 'react'
import { Dropdown } from '@/components/ds/dropdown'
import { Label } from '@/components/ds/input'
import { addMonths } from '@/lib/core/calendar-nav'
import { formatMoney } from '@/lib/core/money'
import { memberMonths, seasonMonths, simulateMonth } from '@/lib/data/billing'
import { useAppData } from '@/lib/data/provider'
import { ChargeBreakdown } from '../charge-breakdown'
import { SectionCard } from './section-card'

const monthName = (month: string) =>
  new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  )

/** Shows what an account would be charged in a month, and lets you leave members out to see how offers change. */
export function SimulatorSection({ month }: { month: string }) {
  const demo = useAppData()
  const [accountId, setAccountId] = useState(demo.accounts[0]?.id ?? '')
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [excluded, setExcluded] = useState<string[]>([])
  const months = useMemo(() => [...seasonMonths(demo, month), addMonths(month, 1)], [demo, month])
  const members = useMemo(
    () => memberMonths(demo, accountId, selectedMonth).filter((m) => m.occurrences > 0),
    [demo, accountId, selectedMonth],
  )
  const result = useMemo(
    () => simulateMonth(demo, accountId, selectedMonth, excluded),
    [demo, accountId, selectedMonth, excluded],
  )
  const full = useMemo(
    () => simulateMonth(demo, accountId, selectedMonth, []),
    [demo, accountId, selectedMonth],
  )

  return (
    <SectionCard
      title="Simulador de cobro"
      description="Elige una cuenta y un mes para ver qué se cobraría y por qué. Desmarca a un miembro para ver cómo cambia la oferta si ese mes no viene."
    >
      <div className="grid gap-6 p-5 lg:grid-cols-[18rem_1fr]">
        <div className="grid content-start gap-4">
          <div>
            <Label>Cuenta de cobro</Label>
            <Dropdown
              aria-label="Cuenta de cobro"
              searchable
              value={accountId}
              onChange={(v) => {
                setAccountId(v)
                setExcluded([])
              }}
              options={demo.accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          </div>
          <div>
            <Label>Mes</Label>
            <Dropdown
              aria-label="Mes"
              value={selectedMonth}
              onChange={(v) => {
                setSelectedMonth(v)
                setExcluded([])
              }}
              options={months.map((m) => ({ value: m, label: monthName(m) }))}
            />
          </div>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-muted-foreground">
              Miembros que vienen este mes
            </legend>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nadie tiene clases ese mes.</p>
            ) : null}
            <ul className="grid gap-1.5">
              {members.map((member) => (
                <li key={member.memberId}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!excluded.includes(member.memberId)}
                      onChange={(e) =>
                        setExcluded((list) =>
                          e.target.checked
                            ? list.filter((id) => id !== member.memberId)
                            : [...list, member.memberId],
                        )
                      }
                      className="size-4 accent-[var(--brand)]"
                    />
                    {member.name}
                    <span className="text-xs text-muted-foreground">
                      {member.classesPerWeek} {member.classesPerWeek === 1 ? 'día' : 'días'}/semana
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
        <div className="grid content-start gap-4">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatMoney(result.totalCents)}
          </p>
          {excluded.length > 0 ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              Con todos los miembros serían {formatMoney(full.totalCents)}. Sin{' '}
              {excluded.length === 1 ? 'ese miembro' : 'esos miembros'}{' '}
              {result.totalCents === full.totalCents
                ? 'el importe no cambia.'
                : result.totalCents < full.totalCents
                  ? `se cobran ${formatMoney(full.totalCents - result.totalCents)} menos.`
                  : `se cobran ${formatMoney(result.totalCents - full.totalCents)} más porque se pierde la oferta combinada.`}
            </p>
          ) : null}
          <ChargeBreakdown
            data={{
              offers: result.offers,
              overrides: result.overrides,
              warnings: result.warnings,
              lines: result.lines,
            }}
            catalog={demo.catalog}
          />
        </div>
      </div>
    </SectionCard>
  )
}
