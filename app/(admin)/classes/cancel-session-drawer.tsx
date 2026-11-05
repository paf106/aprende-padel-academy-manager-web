'use client'

import { useState } from 'react'
import { Button } from '@/components/ds/button'
import { Drawer } from '@/components/ds/drawer'
import { Dropdown } from '@/components/ds/dropdown'
import { Label } from '@/components/ds/input'
import { cancellationReasonLabels } from '@/lib/core/labels'
import { cancellationReasons, type CancellationReason } from '@/lib/core/types'
import { useAppData } from '@/lib/data/provider'

/** Asks why a class is cancelled: the reason decides whether students get a credit on their fee. */
export function CancelSessionDrawer({
  studentIds,
  onConfirm,
  onClose,
}: {
  studentIds: readonly string[]
  onConfirm: (reason: CancellationReason, creditedStudentIds?: string[]) => void
  onClose: () => void
}) {
  const { billing, studentLabel } = useAppData()
  const [reason, setReason] = useState<CancellationReason>('rain')
  const [attendee, setAttendee] = useState('')
  const gives = billing.creditReasons.includes(reason)
  const single = reason === 'single_attendee'
  const noShow = reason === 'no_show'

  return (
    <Drawer
      open
      onClose={onClose}
      title="Cancelar la clase"
      description="El motivo decide si la clase se cobra a los alumnos y si se paga al profesor."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button
            variant="danger"
            disabled={single && !attendee}
            onClick={() => onConfirm(reason, single ? [attendee] : undefined)}
          >
            Cancelar clase
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <div>
          <Label>Motivo</Label>
          <Dropdown
            aria-label="Motivo de la cancelación"
            value={reason}
            onChange={(v) => setReason(v as CancellationReason)}
            options={cancellationReasons.map((r) => ({ value: r, label: cancellationReasonLabels[r] }))}
          />
        </div>
        {single ? (
          <div>
            <Label>Alumno que quería asistir</Label>
            <Dropdown
              aria-label="Alumno que quería asistir"
              placeholder="Elige al alumno"
              value={attendee}
              onChange={setAttendee}
              options={studentIds.map((id) => ({ value: id, label: studentLabel(id) }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Solo a este alumno se le descuenta la clase.</p>
          </div>
        ) : null}
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          {noShow
            ? 'Los alumnos pierden la clase: se les cobra igualmente. El profesor sí cobra la clase.'
            : `${
                gives
                  ? 'Este motivo da descuento: la clase se resta de la mensualidad de los alumnos afectados.'
                  : 'Este motivo no da descuento: la clase se cobra igualmente.'
              } La clase cancelada no se paga al profesor.`}
        </p>
      </div>
    </Drawer>
  )
}
