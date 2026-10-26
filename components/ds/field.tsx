import type { ReactNode } from 'react'
import { Dropdown, type Option } from '@/components/ds/dropdown'
import { Input } from '@/components/ds/input'
import { cn } from '@/lib/core/cn'

export function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string
  error?: string
  hint?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: { label: string; error?: string; hint?: string } & React.ComponentProps<'input'>) {
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={className}>
      <Input id={id} aria-invalid={Boolean(error)} {...props} />
    </Field>
  )
}

export function SelectField({
  label,
  error,
  options,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string
  error?: string
  options: readonly Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <Field label={label} error={error} className={className}>
      <Dropdown
        aria-label={label}
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        searchable={options.length > 6}
      />
    </Field>
  )
}

export function MultiSelectField({
  label,
  error,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  error?: string
  options: readonly Option[]
  value: readonly string[]
  onChange: (value: string[]) => void
  className?: string
}) {
  return (
    <Field label={label} error={error} className={className}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value])
              }
              className={cn(
                'h-8 cursor-pointer rounded-full border px-3.5 text-[13px] font-medium transition-colors',
                selected
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </Field>
  )
}
