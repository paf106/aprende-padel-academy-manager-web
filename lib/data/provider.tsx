'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useToast } from '@/components/ds/toast'
import { mutations, type Actions } from '@/lib/data/mutations'
import { fullName, teacherName, type AppData } from '@/lib/data/types'
import { diffRows, hasChanges, toRows } from '@/lib/db/mapping'
import { persistChanges } from '@/lib/db/persist'

type Local = { base: AppData; data: AppData }

/** Keeps the latest optimistic data and saves changes one after another, so writes never overlap. */
class Writer {
  private latest: Local
  private queue: Promise<void> = Promise.resolve()
  private pending = 0
  /** The screen already shows what was saved, so the page is only reloaded after an error or for server-filled fields. */
  private needsRefresh = false

  constructor(initialData: AppData) {
    this.latest = { base: initialData, data: initialData }
  }

  apply(
    initialData: AppData,
    change: (current: AppData) => AppData,
    hooks: { onError: (message: string) => void; onIdle: () => void },
  ): Local | null {
    const current = this.latest.base === initialData ? this.latest.data : initialData
    const next = change(current)
    if (next === current) return null
    this.latest = { base: initialData, data: next }
    this.pending += 1
    this.queue = this.queue.then(async () => {
      try {
        const changes = diffRows(toRows(current), toRows(next))
        if (!hasChanges(changes)) return
        const result = await persistChanges(changes)
        if (!result.ok) {
          this.needsRefresh = true
          hooks.onError(`No se pudo guardar: ${result.error}`)
        } else if (changes.upserts['payments.payments']) {
          // Payments carry who entered them, which only the database knows.
          this.needsRefresh = true
        }
      } catch {
        this.needsRefresh = true
        hooks.onError('No se pudo guardar. Comprueba tu conexión e inténtalo de nuevo.')
      } finally {
        this.pending -= 1
        if (this.pending === 0 && this.needsRefresh) {
          this.needsRefresh = false
          hooks.onIdle()
        }
      }
    })
    return this.latest
  }
}

function useAppDataValue(initialData: AppData) {
  const router = useRouter()
  const toast = useToast()
  const [local, setLocal] = useState<Local | null>(null)
  const [writer] = useState(() => new Writer(initialData))

  const data = local && local.base === initialData ? local.data : initialData

  const actions = useMemo(() => {
    const hooks = {
      onError: (message: string) => toast(message, 'error'),
      onIdle: () => router.refresh(),
    }
    return Object.fromEntries(
      Object.entries(mutations).map(([name, mutation]) => [
        name,
        (...args: unknown[]) => {
          const next = writer.apply(
            initialData,
            (current) => (mutation as (state: AppData, ...rest: unknown[]) => AppData)(current, ...args),
            hooks,
          )
          if (next) setLocal(next)
        },
      ]),
    ) as Actions
  }, [initialData, router, toast, writer])

  return useMemo(() => {
    const studentById = (id: string) => data.students.find((s) => s.id === id)
    const teacherById = (id: string) => data.teachers.find((t) => t.id === id)
    const clubById = (id: string) => data.clubs.find((c) => c.id === id)
    const groupById = (id: string) => data.groups.find((g) => g.id === id)
    return {
      ...data,
      activeClubs: data.clubs.filter((c) => c.active),
      studentById,
      teacherById,
      clubById,
      groupById,
      studentLabel: (id: string) => {
        const student = studentById(id)
        return student ? fullName(student) : ''
      },
      teacherLabel: (id: string) => {
        const teacher = teacherById(id)
        return teacher ? teacherName(teacher) : ''
      },
      clubLabel: (id: string) => clubById(id)?.name ?? '',
      actions,
    }
  }, [data, actions])
}

type AppDataValue = ReturnType<typeof useAppDataValue>
const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ initialData, children }: { initialData: AppData; children: ReactNode }) {
  const value = useAppDataValue(initialData)
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData must be used within AppDataProvider')
  return value
}
