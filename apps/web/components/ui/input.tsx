import type { InputHTMLAttributes } from 'react'
import { cn } from '@aprende-padel/ui/cn'
export function Input({className,...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={cn('min-h-10 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-ink placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ebc42]',className)} {...props}/>}
