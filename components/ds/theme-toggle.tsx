'use client'

import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
const isDark = () => document.documentElement.classList.contains('dark')

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false)
  return (
    <button
      type="button"
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={() => {
        const next = !isDark()
        document.documentElement.classList.toggle('dark', next)
        localStorage.setItem('theme', next ? 'dark' : 'light')
      }}
      className="grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2"
    >
      {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  )
}

export const themeInitScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`
