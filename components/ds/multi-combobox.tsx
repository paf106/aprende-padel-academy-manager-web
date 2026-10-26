'use client'

import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Field } from '@/components/ds/field'
import { cn } from '@/lib/core/cn'

export type ComboOption = {
  value: string
  label: string
  hint?: string
  section?: string
  disabled?: boolean
}

export function MultiComboboxField({
  label,
  error,
  options,
  value,
  onChange,
  max,
  placeholder = 'Añadir…',
  className,
}: {
  label: string
  error?: string
  options: readonly ComboOption[]
  value: readonly string[]
  onChange: (value: string[]) => void
  max?: number
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const full = max !== undefined && value.length >= max
  const q = query.trim().toLowerCase()
  const visible = options.filter((o) => !q || o.label.toLowerCase().includes(q))
  const sections = [...new Set(visible.map((o) => o.section ?? ''))]
  const selected = value
    .map((v) => options.find((o) => o.value === v))
    .filter((o): o is ComboOption => Boolean(o))

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const toggle = (option: ComboOption) => {
    if (value.includes(option.value)) onChange(value.filter((v) => v !== option.value))
    else if (!full && !option.disabled) onChange([...value, option.value])
  }

  return (
    <Field
      label={max !== undefined ? `${label} (${value.length}/${max})` : label}
      error={error}
      className={className}
    >
      <div
        ref={root}
        className="relative"
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        {selected.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-1.5">
            {selected.map((option) => (
              <li
                key={option.value}
                className="flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-xs font-medium text-brand"
              >
                {option.label}
                <button
                  type="button"
                  aria-label={`Quitar ${option.label}`}
                  onClick={() => onChange(value.filter((v) => v !== option.value))}
                  className="grid size-5 cursor-pointer place-items-center rounded-full hover:bg-brand/20"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={full && !open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-sm text-muted-foreground hover:border-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {full ? 'Aforo completo' : placeholder}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </button>
        {open ? (
          <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
            <div className="relative mb-1">
              <Search
                size={14}
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar…"
                aria-label="Buscar"
                className="h-9 w-full rounded-lg bg-muted/60 pl-8 pr-2 text-sm"
              />
            </div>
            <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-60 overflow-auto">
              {visible.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
              ) : null}
              {sections.map((section) => (
                <li key={section || 'all'} role="presentation">
                  {section ? (
                    <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">{section}</p>
                  ) : null}
                  <ul role="presentation">
                    {visible
                      .filter((o) => (o.section ?? '') === section)
                      .map((option) => {
                        const isSelected = value.includes(option.value)
                        const blocked = !isSelected && (full || option.disabled)
                        return (
                          <li key={option.value} role="option" aria-selected={isSelected}>
                            <button
                              type="button"
                              disabled={blocked}
                              onClick={() => toggle(option)}
                              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <span className="min-w-0 truncate">
                                {option.label}
                                {option.hint ? (
                                  <span className="ml-2 text-xs text-muted-foreground">{option.hint}</span>
                                ) : null}
                              </span>
                              {isSelected ? (
                                <Check size={14} aria-hidden="true" className="shrink-0 text-brand" />
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Field>
  )
}
