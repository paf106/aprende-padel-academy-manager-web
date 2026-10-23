'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ds/button'

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-xl content-center justify-items-start gap-3 px-5 py-10">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold">
        No se pudo cargar esta página
      </h1>
      <p className="text-sm text-muted-foreground">
        Inténtalo de nuevo. Si el problema continúa, vuelve al resumen.
      </p>
      <div className="flex items-center gap-4">
        <Button onClick={reset}>Reintentar</Button>
        <Link className="text-sm font-semibold text-brand hover:underline" href="/">
          Volver al resumen
        </Link>
      </div>
    </main>
  )
}
