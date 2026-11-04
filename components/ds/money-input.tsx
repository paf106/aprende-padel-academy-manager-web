'use client'

import { useState } from 'react'
import { Input } from '@/components/ds/input'

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

/** Money field in euros that edits integer cents. Empty means "no value" and commits null. */
export function MoneyInput({
  valueCents,
  onCommit,
  className,
  'aria-label': ariaLabel,
  id,
  placeholder = '—',
}: {
  valueCents: number | null
  onCommit: (cents: number | null) => void
  className?: string
  'aria-label'?: string
  id?: string
  placeholder?: string
}) {
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? (valueCents === null ? '' : euros(valueCents))

  const commit = () => {
    if (text === null) return
    const trimmed = text.trim()
    setText(null)
    if (trimmed === '') {
      onCommit(null)
      return
    }
    const cents = Math.round(Number(trimmed.replace(',', '.')) * 100)
    if (Number.isFinite(cents) && cents >= 0) onCommit(cents)
  }

  return (
    <Input
      id={id}
      aria-label={ariaLabel}
      inputMode="decimal"
      placeholder={placeholder}
      className={className}
      value={shown}
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
      }}
    />
  )
}
