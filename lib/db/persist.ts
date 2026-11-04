'use server'

import { requireAdmin } from '@/lib/auth'
import { TABLES, tableName, type Changes, type Row } from '@/lib/db/mapping'
import { getSupabaseServer } from '@/lib/supabase/server'

export type PersistResult = { ok: true } | { ok: false; error: string }

const CHUNK = 500

/** Writes the rows that changed on the client. Only known tables are accepted and organization_id always comes from the session. */
export async function persistChanges(changes: Changes): Promise<PersistResult> {
  const claims = await requireAdmin()
  const organizationId = claims.app_metadata?.organization_id as string | undefined
  if (!organizationId) return { ok: false, error: 'Tu usuario no pertenece a ninguna organización.' }

  const known = new Set(TABLES.map(tableName))
  for (const name of [...Object.keys(changes.deletes), ...Object.keys(changes.upserts)]) {
    if (!known.has(name)) return { ok: false, error: `Tabla desconocida: ${name}` }
  }

  const supabase = await getSupabaseServer()
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
  return { ok: true }
}
