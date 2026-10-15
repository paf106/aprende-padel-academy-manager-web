'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <main className="mx-auto grid min-h-[60vh] w-full max-w-[960px] content-center gap-3 px-5 py-10"><h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold">No se pudo cargar esta página</h1><p className="text-sm text-slate-600">Inténtalo de nuevo. Si el problema continúa, vuelve al resumen.</p><div className="flex items-center gap-4"><button type="button" className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2" onClick={reset}>Reintentar</button><Link className="text-sm font-semibold text-blue-700 hover:underline" href="/">Volver al resumen</Link></div></main>
}
