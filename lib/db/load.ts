import type { AppData } from '@/lib/data/types'
import { fromRows, orderColumns, TABLES, tableName, type Row, type TableRows } from '@/lib/db/mapping'
import { getSupabaseServer } from '@/lib/supabase/server'

const PAGE = 1000

/** Reads every table of the signed-in organization (row level security filters by the session). */
export async function loadAppData(): Promise<AppData> {
  const supabase = await getSupabaseServer()
  const entries = await Promise.all(
    TABLES.map(async (spec) => {
      const rows: Row[] = []
      for (let from = 0; ; from += PAGE) {
        let query = supabase.schema(spec.schema).from(spec.table).select('*')
        for (const column of orderColumns(spec)) query = query.order(column)
        const { data, error } = await query.range(from, from + PAGE - 1)
        if (error) throw new Error(`${tableName(spec)}: ${error.message}`)
        rows.push(...(data as Row[]))
        if (data.length < PAGE) break
      }
      return [tableName(spec), rows] as const
    }),
  )
  return fromRows(Object.fromEntries(entries) as TableRows)
}
