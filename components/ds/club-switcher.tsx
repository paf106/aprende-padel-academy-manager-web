'use client'

import { MapPin } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Dropdown } from '@/components/ds/dropdown'
import { useDemo } from '@/lib/demo/use-demo'

export function ClubSwitcher() {
  const { activeClubs: clubs } = useDemo()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  if (clubs.length < 2) return null
  return (
    <div className="flex items-center gap-2">
      <MapPin size={16} aria-hidden="true" className="hidden text-muted-foreground sm:block" />
      <Dropdown
        aria-label="Sede"
        className="w-44"
        allLabel="Todas las sedes"
        value={params.get('club') ?? ''}
        options={clubs.map((club) => ({ value: club.id, label: club.name }))}
        onChange={(value) => {
          const next = new URLSearchParams(params.toString())
          if (value) next.set('club', value)
          else next.delete('club')
          router.replace(`${pathname}${next.size ? `?${next}` : ''}`)
        }}
      />
    </div>
  )
}
