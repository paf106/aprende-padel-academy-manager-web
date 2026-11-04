'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Element in the top bar where pages render their actions; null until the bar mounts. */
export const TopbarSlotContext = createContext<HTMLElement | null>(null)

export function TopbarActions({ children }: { children: ReactNode }) {
  const slot = useContext(TopbarSlotContext)
  return slot ? createPortal(children, slot) : null
}
