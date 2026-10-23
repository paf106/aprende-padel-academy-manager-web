'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
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
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md border-l border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/40 open:animate-[drawer-in_180ms_ease-out]"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid size-9 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">{children}</div>
        {footer ? (
          <footer className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</footer>
        ) : null}
      </div>
    </dialog>
  )
}
