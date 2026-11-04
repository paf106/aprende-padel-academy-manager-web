'use server'

import { requireAdmin } from '@/lib/auth'
import { TABLES, tableName, type Changes, type Row } from '@/lib/db/mapping'
import { getSupabaseServer } from '@/lib/supabase/server'

export type PersistResult = { ok: true } | { ok: false; error: string }

const CHUNK = 500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function invalidId(rows: Row[]) {
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      if (typeof value === 'string' && (column === 'id' || column.endsWith('_id')) && !UUID.test(value)) {
        return `${column} «${value}» no es un identificador válido`
      }
    }
  }
  return null
}

/** Writes the rows that changed on the client. Only known tables are accepted and organization_id always comes from the session. */
export async function persistChanges(changes: Changes): Promise<PersistResult> {
  const claims = await requireAdmin()
  const organizationId = claims.app_metadata?.organization_id as string | undefined
  if (!organizationId) return { ok: false, error: 'Tu usuario no pertenece a ninguna organización.' }

  const known = new Set(TABLES.map(tableName))
  for (const name of [...Object.keys(changes.deletes), ...Object.keys(changes.upserts)]) {
    if (!known.has(name)) return { ok: false, error: `Tabla desconocida: ${name}` }
  }
  for (const [name, rows] of [...Object.entries(changes.upserts), ...Object.entries(changes.deletes)]) {
    const problem = invalidId(rows)
    if (problem) return { ok: false, error: `${name}: ${problem}` }
  }

  const supabase = await getSupabaseServer()
  for (const spec of TABLES) {
    const name = tableName(spec)
    const rows = (changes.upserts[name] ?? []).map((row) => ({ ...row, organization_id: organizationId }))
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const table = supabase.schema(spec.schema).from(spec.table)
      const { error } = spec.appendOnly
        ? await table.insert(chunk)
        : await table.upsert(chunk, { onConflict: spec.conflict })
      if (error) return { ok: false, error: `${name}: ${error.message}` }
    }
  }

  // Deletes run last so rows that moved away from a parent (for example a student leaving an account) are updated first.
  for (const spec of [...TABLES].reverse()) {
    const name = tableName(spec)
    const keysToDelete: Row[] = spec.appendOnly ? [] : (changes.deletes[name] ?? [])
    if (keysToDelete.length === 0) continue
    const table = () => supabase.schema(spec.schema).from(spec.table)
    if (spec.keys.length === 1) {
      const column = spec.keys[0]
      for (let i = 0; i < keysToDelete.length; i += CHUNK) {
        const values = keysToDelete.slice(i, i + CHUNK).map((row) => row[column])
        const { error } = await table().delete().in(column, values)
        if (error) return { ok: false, error: `${name}: ${error.message}` }
      }
    } else {
      for (const key of keysToDelete) {
        const { error } = await table().delete().match(key)
        if (error) return { ok: false, error: `${name}: ${error.message}` }
      }
    }
  }

  return { ok: true }
}
