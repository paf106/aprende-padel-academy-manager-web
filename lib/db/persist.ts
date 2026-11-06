'use server'

import { requireAdmin } from '@/lib/auth'
import { TABLES, tableName, type Changes, type Row } from '@/lib/db/mapping'
import { buildSteps } from '@/lib/db/steps'
import { getSupabaseServer } from '@/lib/supabase/server'

export type PersistResult = { ok: true } | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function invalidId(rows: Row[]) {
  for (const row of rows) {
    for (const [column, value] of Object.entries(row)) {
      if (typeof value === 'string' && (column === 'id' || column.endsWith('_id')) && !UUID.test(value)) {
        return `${column} no es un identificador válido`
      }
    }
  }
  return null
}

/** What the user is told when the database refuses a change; the real error only goes to the server log. */
function friendlyError(code: string | undefined) {
  if (code === '23503')
    return 'Hay datos que dependen de este registro, o que aún no existen. Recarga la página e inténtalo de nuevo.'
  if (code === '23505') return 'Ya existe un registro igual. Recarga la página e inténtalo de nuevo.'
  if (code === '42501') return 'No tienes permiso para guardar estos cambios.'
  return 'No se pudieron guardar los cambios. Recarga la página e inténtalo de nuevo.'
}

/**
 * Saves the rows that changed on the client in one transaction (`public.apply_changes`). The function runs as the
 * signed-in user, so row level security decides what is allowed, and organization_id always comes from the session.
 */
export async function persistChanges(changes: Changes): Promise<PersistResult> {
  const claims = await requireAdmin()
  if (!claims.app_metadata?.organization_id) {
    return { ok: false, error: 'Tu usuario no pertenece a ninguna organización.' }
  }

  const known = new Set(TABLES.map(tableName))
  for (const name of [...Object.keys(changes.deletes), ...Object.keys(changes.upserts)]) {
    if (!known.has(name)) return { ok: false, error: 'Los cambios no son válidos.' }
  }
  for (const rows of [...Object.values(changes.upserts), ...Object.values(changes.deletes)]) {
    if (invalidId(rows)) return { ok: false, error: 'Los cambios no son válidos.' }
  }

  const steps = buildSteps(changes)
  if (steps.length === 0) return { ok: true }

  const supabase = await getSupabaseServer()
  const { error } = await supabase.rpc('apply_changes', { changes: { steps } })
  if (error) {
    console.error('apply_changes failed', {
      code: error.code,
      message: error.message,
      details: error.details,
    })
    return { ok: false, error: friendlyError(error.code) }
  }
  return { ok: true }
}
