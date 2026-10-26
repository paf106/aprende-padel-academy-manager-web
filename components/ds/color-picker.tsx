'use client'

import { Check } from 'lucide-react'
import { clubColors, type ClubColor } from '@/lib/classes/club-schema'
import { cn } from '@/lib/core/cn'

export const clubColorClasses: Record<ClubColor, string> = {
  brand: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  danger: 'bg-danger',
}
const colorNames: Record<ClubColor, string> = {
  brand: 'Verde',
  info: 'Azul',
  warning: 'Naranja',
  danger: 'Rojo',
}

export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: ClubColor) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2">
      {clubColors.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={colorNames[color]}
          onClick={() => onChange(color)}
          className={cn(
            'grid size-9 cursor-pointer place-items-center rounded-full text-white ring-offset-2 ring-offset-card transition-shadow',
            clubColorClasses[color],
            value === color && 'ring-2 ring-foreground/70',
          )}
        >
          {value === color ? <Check size={16} aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  )
}
