'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

function useNativeDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!open) return
    const dialog = ref.current
    if (!dialog) return
    const returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!dialog.open) dialog.showModal()
    const frame = window.matchMedia('(pointer: fine)').matches
      ? window.requestAnimationFrame(() => dialog.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not([data-dialog-close]):not(:disabled)')?.focus())
      : null
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      if (dialog.open) dialog.close()
      if (returnFocusTo?.isConnected) returnFocusTo.focus()
    }
  }, [open])
  return ref
}

export function DialogShell({ open, onOpenChange, title, description, children, footer, trigger }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; trigger?: ReactNode }) {
  return <>{trigger}<DialogContent open={open} onOpenChange={onOpenChange} title={title} description={description} footer={footer}>{children}</DialogContent></>
}

export function DialogContent({ open, onOpenChange, title, description, children, footer, className = '' }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; className?: string }) {
  const native = useNativeDialog(open)
  const id = useId()
  if (!open) return null
  return <dialog ref={native} tabIndex={-1} onCancel={(event) => { event.preventDefault(); onOpenChange(false) }} aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined} className={`m-auto max-h-[min(90dvh,850px)] w-[min(94vw,620px)] scroll-pt-24 overscroll-contain overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 ${className}`}>
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6"><div className="min-w-0"><h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>{description ? <p id={`${id}-description`} className="mt-1 text-sm text-slate-600">{description}</p> : null}</div><button data-dialog-close type="button" aria-label="Cerrar diálogo" onClick={() => onOpenChange(false)} className="grid size-11 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"><X size={18} aria-hidden="true"/></button></header>
    {children}{footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</footer> : null}
  </dialog>
}
