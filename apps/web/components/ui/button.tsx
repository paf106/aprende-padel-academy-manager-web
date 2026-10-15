import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'default' | 'secondary' | 'ghost' | 'destructive'
type Size = 'default' | 'sm' | 'icon'
const variants: Record<Variant, string> = {
  default: 'border border-transparent bg-emerald-800 text-white hover:bg-emerald-900',
  secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'border border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
  destructive: 'border border-transparent bg-rose-700 text-white hover:bg-rose-800',
}
const sizes: Record<Size, string> = { default: 'min-h-10 px-4 py-2 text-sm', sm: 'min-h-9 px-3 py-1.5 text-xs', icon: 'size-10 p-0' }

export function Button({ className = '', variant = 'default', size = 'default', asChild = false, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; asChild?: boolean; children?: ReactNode }) {
  const classes = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`
  if (asChild && isValidElement<{ className?: string }>(children)) {
    return cloneElement(children, { ...props, className: `${classes} ${children.props.className ?? ''}` })
  }
  return <button className={classes} {...props}>{children}</button>
}
