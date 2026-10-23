import type { InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@aprende-padel/ui/cn'

export const fieldClasses =
  'h-10 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-muted-foreground/40 disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...props} />
}

export function SearchInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        className={cn(
          fieldClasses,
          'rounded-full bg-muted/60 pl-10 [&::-webkit-search-cancel-button]:hidden',
        )}
        {...props}
      />
    </div>
  )
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
      {children}
    </label>
  )
}
