import type { HTMLAttributes } from 'react'
import { cn } from '@aprende-padel/ui/cn'
export function Badge({className,...props}:HTMLAttributes<HTMLSpanElement>){return <span className={cn('inline-flex items-center rounded-full bg-[#edf5df] px-2.5 py-1 text-xs font-semibold text-[#4d7114]',className)} {...props}/>}
