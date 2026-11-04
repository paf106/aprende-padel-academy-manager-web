'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ds/button'
import { Dropdown, FilterChips, type Option } from '@/components/ds/dropdown'
import { SearchInput } from '@/components/ds/input'

export type FilterDef = {
  key: string
  label: string
  allLabel?: string
  options: readonly Option[]
  className?: string
}

/** Filters with three or more choices (including "all") render as a select, fewer render as chips. */
export function isSelectFilter(filter: FilterDef) {
  return filter.options.length + (filter.allLabel ? 1 : 0) >= 3
}

export function FilterBar({
  search,
  filters = [],
  values,
  onChange,
  onClear,
  trailing,
  extraActive = false,
}: {
  search?: { value: string; onChange: (value: string) => void; placeholder: string; label: string }
  filters?: readonly FilterDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear?: () => void
  trailing?: ReactNode
  /** Marks the clear button as relevant when something outside the bar (e.g. a search box) is filtering. */
  extraActive?: boolean
}) {
  const active =
    filters.some((f) => f.allLabel !== undefined && (values[f.key] ?? '') !== '') ||
    Boolean(search?.value) ||
    extraActive
  return (
    <>
      {search ? (
        <SearchInput
          aria-label={search.label}
          placeholder={search.placeholder}
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          className="w-full sm:w-64"
        />
      ) : null}
      {filters.map((filter) =>
        isSelectFilter(filter) ? (
          <Dropdown
            key={filter.key}
            aria-label={filter.label}
            className={filter.className ?? 'w-44'}
            allLabel={filter.allLabel}
            searchable={filter.options.length > 6}
            value={values[filter.key] ?? ''}
            onChange={(value) => onChange(filter.key, value)}
            options={filter.options}
          />
        ) : (
          <FilterChips
            key={filter.key}
            label={filter.label}
            value={values[filter.key] ?? ''}
            onChange={(value) => onChange(filter.key, value)}
            options={
              filter.allLabel ? [{ value: '', label: filter.allLabel }, ...filter.options] : filter.options
            }
          />
        ),
      )}
      {onClear && active ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X size={14} aria-hidden="true" />
          Limpiar
        </Button>
      ) : null}
      {trailing}
    </>
  )
}
