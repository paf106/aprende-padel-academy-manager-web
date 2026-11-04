'use client'

import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ds/button'
import { Dropdown } from '@/components/ds/dropdown'
import { useToast } from '@/components/ds/toast'
import { defaultCapacity } from '@/lib/classes/capacity'
import { formatMoney } from '@/lib/core/money'
import { fullName, type Session } from '@/lib/data/types'
import { useAppData } from '@/lib/data/provider'
import { MAX_PRIVATE_STUDENTS, dropInPrice } from '@/lib/payments/extras'
import { ageOn } from '@/lib/payments/pricing'

/** Adds a student that does not belong to the class: a free recovery or a paid single class. */
export function AddGuestPanel({ session }: { session: Session }) {
  const toast = useToast()
  const { students, extras, actions } = useAppData()
  const [studentId, setStudentId] = useState('')
  const [mode, setMode] = useState<'recovery' | 'drop_in'>('recovery')
  const isPrivate = session.kind === 'private'
  const capacity = isPrivate ? MAX_PRIVATE_STUDENTS : defaultCapacity[session.category]
  const full = session.studentIds.length >= capacity
  const price = dropInPrice(extras, session.duration)

  const eligible = students.filter(
    (s) =>
      s.active &&
      !session.studentIds.includes(s.id) &&
      (isPrivate
        ? ageOn(s.birthDate, session.date) >= extras.privateMinAge
        : s.category === session.category),
  )

  if (full) {
    return <p className="text-xs text-muted-foreground">La clase está completa ({capacity} alumnos).</p>
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-border p-4">
      <h3 className="text-sm font-semibold">Añadir un alumno a esta clase</h3>
      <Dropdown
        aria-label="Alumno que se añade"
        searchable
        placeholder="Elige un alumno"
        value={studentId}
        onChange={setStudentId}
        options={eligible.map((s) => ({ value: s.id, label: fullName(s) }))}
      />
      <Dropdown
        aria-label="Cómo asiste"
        value={mode}
        onChange={(v) => setMode(v as 'recovery' | 'drop_in')}
        options={[
          { value: 'recovery', label: 'Recuperación de otra clase (sin coste)' },
          { value: 'drop_in', label: `Clase suelta (${formatMoney(price)})` },
        ]}
      />
      <Button
        size="sm"
        variant="secondary"
        className="w-fit"
        disabled={!studentId}
        onClick={() => {
          actions.addGuestToSession(session.id, studentId, mode)
          setStudentId('')
          toast(
            mode === 'drop_in'
              ? `Alumno añadido. Se suman ${formatMoney(price)} a su cobro del mes.`
              : 'Alumno añadido como recuperación.',
          )
        }}
      >
        <UserPlus size={14} aria-hidden="true" />
        Añadir
      </Button>
    </div>
  )
}
