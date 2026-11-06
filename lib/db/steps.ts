import { TABLES, tableName, type Changes, type Row } from '@/lib/db/mapping'

export type Step = {
  op: 'upsert' | 'insert' | 'delete'
  table: string
  keys: string[]
  conflict: string[]
  rows: Row[]
}

/** Upserts run parents first; deletes run last and children first, so rows that moved away from a parent are updated first. */
export function buildSteps(changes: Changes): Step[] {
  const steps: Step[] = []
  for (const spec of TABLES) {
    const rows = changes.upserts[tableName(spec)] ?? []
    if (rows.length === 0) continue
    steps.push({
      op: spec.appendOnly ? 'insert' : 'upsert',
      table: tableName(spec),
      keys: spec.keys,
      conflict: spec.conflict.split(','),
      rows,
    })
  }
  for (const spec of [...TABLES].reverse()) {
    const rows = spec.appendOnly ? [] : (changes.deletes[tableName(spec)] ?? [])
    if (rows.length === 0) continue
    steps.push({ op: 'delete', table: tableName(spec), keys: spec.keys, conflict: [], rows })
  }
  return steps
}
