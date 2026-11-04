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

/** Adds a student that does not belong to the class, as a paid single class. */
export function AddGuestPanel({ session }: { session: Session }) {
  const toast = useToast()
  const { students, extras, actions } = useAppData()
  const [studentId, setStudentId] = useState('')
  const isPrivate = session.kind === 'private'
  const capacity = isPrivate ? MAX_PRIVATE_STUDENTS : defaultCapacity[session.category]
  const full = session.studentIds.length >= capacity
  const price = dropInPrice(extras, session.duration)

  const eligible = students.filter(
    (s) =>
      s.active &&
      !session.studentIds.includes(s.id) &&
      (!isPrivate || ageOn(s.birthDate, session.date) >= extras.privateMinAge),
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
      <p className="text-xs text-muted-foreground">
        Se cobra como clase suelta ({formatMoney(price)}) y se suma a su cobro del mes.
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="w-fit"
        disabled={!studentId}
        onClick={() => {
          actions.addGuestToSession(session.id, studentId)
          setStudentId('')
          toast(`Alumno añadido. Se suman ${formatMoney(price)} a su cobro del mes.`)
        }}
      >
        <UserPlus size={14} aria-hidden="true" />
        Añadir
      </Button>
    </div>
  )
}
