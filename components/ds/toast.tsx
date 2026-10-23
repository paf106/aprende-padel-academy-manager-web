'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Toast = { message: string; tone: 'success' | 'error' } | null
const ToastContext = createContext<{
  showToast: (message: string, tone?: 'success' | 'error') => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setToast(null)
    setPaused(false)
  }, [])
  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setToast({ message, tone })
    setPaused(false)
  }, [])
  useEffect(() => {
    if (!toast || paused) return
    timer.current = setTimeout(dismiss, 8000)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
    }
  }, [toast, paused, dismiss])
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex justify-center px-4 md:bottom-6">
        {toast ? (
          <div
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false)
            }}
            className={`pointer-events-auto flex max-w-lg items-start gap-4 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${toast.tone === 'error' ? 'border-danger bg-card text-danger' : 'border-success bg-card text-success'}`}
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={dismiss}
              className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context.showToast
}
