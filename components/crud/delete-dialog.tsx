'use client'

import { ConfirmDialog } from '@/components/crud/confirm-dialog'

/** Deletes an entity when it has no history; otherwise explains why and offers to deactivate it instead. */
export function DeleteDialog({
  open,
  name,
  blockers,
  onDelete,
  onDeactivate,
  onClose,
}: {
  open: boolean
  name: string
  blockers: readonly string[]
  onDelete: () => void
  onDeactivate: () => void
  onClose: () => void
}) {
  if (blockers.length > 0) {
    return (
      <ConfirmDialog
        open={open}
        title={`No se puede eliminar a ${name}`}
        description="Tiene historial y eliminarlo lo perdería. Puedes darlo de baja: dejará de aparecer como activo pero conservará su historial."
        confirmLabel="Dar de baja"
        tone="primary"
        onConfirm={onDeactivate}
        onClose={onClose}
      >
        <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      </ConfirmDialog>
    )
  }
  return (
    <ConfirmDialog
      open={open}
      title={`Eliminar a ${name}`}
      description="Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      onConfirm={onDelete}
      onClose={onClose}
    />
  )
}
