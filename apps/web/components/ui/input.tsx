import type { InputHTMLAttributes } from 'react'
import { cn } from '@aprende-padel/ui/cn'
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 aria-invalid:border-rose-700',
        className,
      )}
      {...props}
    />
  )
}
