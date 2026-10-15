import type { InputHTMLAttributes } from 'react'
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={`min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${className}`} {...props}/> }
