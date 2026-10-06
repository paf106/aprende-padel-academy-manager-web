import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@aprende-padel/ui/cn'

const variants=cva('inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ebc42] disabled:pointer-events-none disabled:opacity-50',{variants:{variant:{default:'bg-brand text-white hover:bg-[#12684d]',secondary:'border border-[var(--line)] bg-white text-ink hover:bg-[#eef2ed]',ghost:'bg-transparent text-ink hover:bg-[#eef2ed]',destructive:'bg-[#a34336] text-white hover:bg-[#87372d]'},size:{default:'min-h-10',sm:'min-h-8 px-3 text-xs',icon:'size-10 p-0'}},defaultVariants:{variant:'default',size:'default'}})
type Props=ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>
export function Button({className,variant,size,...props}:Props){return <button className={cn(variants({variant,size}),className)} {...props}/>}
