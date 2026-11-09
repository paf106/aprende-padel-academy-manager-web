'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ds/button'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {children}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={tone} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
