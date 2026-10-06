import type { HTMLAttributes } from 'react'
import { cn } from '@aprende-padel/ui/cn'
export function Card({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={cn('rounded-2xl border border-[var(--line)] bg-white',className)} {...props}/>}
