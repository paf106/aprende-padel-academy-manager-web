'use client'

import { cn } from '@/lib/core/cn'

export type TabOption = { value: string; label: string }

export function Tabs({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly TabOption[]
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-0.5"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'h-8 cursor-pointer rounded-full px-4 text-[13px] font-medium transition-colors',
            tab.value === value
              ? 'bg-brand text-brand-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
