import { addMonths } from '@/lib/core/calendar-nav'
import { localTodayInTimeZone } from '@/lib/core/dates'
import type { AppData } from '@/lib/data/types'
import { fromRows, orderColumns, TABLES, tableName, type Row, type TableRows } from '@/lib/db/mapping'
import { getSupabaseServer } from '@/lib/supabase/server'

const PAGE = 1000

/** Reads every table of the signed-in organization (row level security filters by the session). */
/** How far back classes, charges and payments are loaded: the billing history shows at most 14 months. */
export const HISTORY_MONTHS = 14

export async function loadAppData(today = localTodayInTimeZone('Europe/Madrid')): Promise<AppData> {
  const fromMonth = addMonths(today.slice(0, 7), -HISTORY_MONTHS)
  const since = { date: `${fromMonth}-01`, month: fromMonth }
  const supabase = await getSupabaseServer()
  const entries = await Promise.all(
    TABLES.map(async (spec) => {
      const rows: Row[] = []
      for (let from = 0; ; from += PAGE) {
        let query = supabase
          .schema(spec.schema)
          .from(spec.table)
          .select(spec.window?.select ?? '*')
        if (spec.window) query = query.gte(spec.window.column, since[spec.window.unit])
        for (const column of orderColumns(spec)) query = query.order(column)
        const { data, error } = await query.range(from, from + PAGE - 1)
        if (error) {
          console.error('loadAppData failed', {
            table: tableName(spec),
            code: error.code,
            message: error.message,
          })
          throw new Error(
            'No se pudieron leer los datos de la organización. Inténtalo de nuevo en unos minutos.',
          )
        }
        rows.push(...(data as unknown as Row[]).map(({ session: _session, ...row }) => row))
        if (data.length < PAGE) break
      }
      return [tableName(spec), rows] as const
    }),
  )
  return fromRows(Object.fromEntries(entries) as TableRows)
}
