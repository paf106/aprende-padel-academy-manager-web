'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Toast = { message: string; tone: 'success' | 'error' } | null
const ToastContext = createContext<{ showToast: (message: string, tone?: 'success' | 'error') => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((message: string, tone: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, tone })
    timer.current = setTimeout(() => setToast(null), 5000)
  }, [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return <ToastContext.Provider value={{ showToast }}>
    {children}
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex justify-center px-4 md:bottom-6" aria-live={toast?.tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
      {toast ? <div role={toast.tone === 'error' ? 'alert' : 'status'} className={`pointer-events-auto max-w-lg rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${toast.tone === 'error' ? 'border-rose-300 bg-white text-rose-900' : 'border-emerald-300 bg-white text-emerald-900'}`}>{toast.message}</div> : null}
    </div>
  </ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context.showToast
}
