'use client'

import { CornerDownLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export type CommandItem = { id: string; label: string; hint?: string; href: string; group: string }

export function CommandPalette({ items }: { items: readonly CommandItem[] }) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((item) => !q || `${item.label} ${item.hint ?? ''}`.toLowerCase().includes(q))
      .slice(0, 30)
  }, [items, query])

  useEffect(() => {
    const open = () => {
      setQuery('')
      setActive(0)
      dialog.current?.showModal()
    }
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        open()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('open-command-palette', open)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('open-command-palette', open)
    }
  }, [])

  const go = (item: CommandItem | undefined) => {
    if (!item) return
    dialog.current?.close()
    router.push(item.href)
  }
  const groups = [...new Set(results.map((r) => r.group))]

  return (
    <dialog
      ref={dialog}
      aria-label="Buscar y navegar"
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current?.close()
      }}
      className="m-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/40"
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search size={18} aria-hidden="true" className="text-muted-foreground" />
        <input
          autoFocus
          value={query}
          aria-label="Buscar"
          placeholder="Buscar alumnos, grupos, páginas o acciones…"
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((i) => Math.min(i + 1, results.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (event.key === 'Enter') {
              go(results[active])
            }
          }}
          className="h-14 flex-1 bg-transparent text-[15px] outline-none"
        />
        <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
          Esc
        </kbd>
      </div>
      <div className="max-h-[50vh] overflow-auto p-2">
        {results.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">Sin resultados</p>
        ) : null}
        {groups.map((group) => (
          <div key={group} className="mb-1">
            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{group}</p>
            {results
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => item.group === group)
              .map(({ item, index }) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${index === active ? 'bg-muted' : ''}`}
                >
                  <span className="min-w-0 truncate">
                    {item.label}
                    {item.hint ? (
                      <span className="ml-2 text-xs text-muted-foreground">{item.hint}</span>
                    ) : null}
                  </span>
                  {index === active ? (
                    <CornerDownLeft size={14} aria-hidden="true" className="text-muted-foreground" />
                  ) : null}
                </button>
              ))}
          </div>
        ))}
      </div>
    </dialog>
  )
}
