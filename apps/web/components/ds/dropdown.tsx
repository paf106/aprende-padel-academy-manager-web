'use client'

import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@aprende-padel/ui/cn'

export type Option = { value: string; label: string; hint?: string }

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar',
  searchable,
  allLabel,
  className,
  'aria-label': ariaLabel,
}: {
  options: readonly Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchable?: boolean
  allLabel?: string
  className?: string
  'aria-label'?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const listId = useId()
  const all: Option[] = useMemo(
    () => (allLabel ? [{ value: '', label: allLabel }, ...options] : [...options]),
    [options, allLabel],
  )
  const visible = all.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
  const current = all.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const choose = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div
      ref={root}
      className={cn('relative', className)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false)
      }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-sm transition-colors hover:border-muted-foreground/40"
      >
        <span className={cn('truncate', !current && 'text-muted-foreground')}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="absolute z-40 mt-2 w-full min-w-48 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
          {searchable ? (
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
                aria-label="Buscar opción"
                className="h-9 w-full rounded-lg bg-muted/60 pl-8 pr-2 text-sm"
              />
            </div>
          ) : null}
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto">
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</li>
            ) : null}
            {visible.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  onClick={() => choose(option.value)}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="min-w-0 truncate">
                    {option.label}
                    {option.hint ? (
                      <span className="ml-2 text-xs text-muted-foreground">{option.hint}</span>
                    ) : null}
                  </span>
                  {option.value === value ? (
                    <Check size={14} aria-hidden="true" className="shrink-0 text-brand" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function FilterChips({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly Option[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-border bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
