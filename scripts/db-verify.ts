import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const sql = postgres(process.env.SUPABASE_DB_URL!, { max: 1, prepare: false, onnotice: () => undefined })

/** Runs a query as the `authenticated` role with the given JWT claims, so row level security applies. */
async function asUser<T>(
  appMetadata: Record<string, unknown>,
  run: (tx: postgres.TransactionSql) => Promise<T>,
) {
  let result!: T
  try {
    await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'authenticated', app_metadata: appMetadata })}, true)`
      await tx`set local role authenticated`
      result = await run(tx)
      throw new Error('rollback')
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'rollback') throw error
  }
  return result
}

const checks: Array<[string, boolean]> = []
const count = async (appMetadata: Record<string, unknown>, table: string) =>
  asUser(
    appMetadata,
    async (tx) => (await tx.unsafe(`select count(*)::int as n from ${table}`))[0].n as number,
  )

const admin = { role: 'admin', organization_id: ORG_ID }
checks.push(['admin sees the 19 students', (await count(admin, 'core.students')) === 19])
checks.push(['admin sees the 5 clubs', (await count(admin, 'core.clubs')) === 5])
checks.push(['admin sees the price list', (await count(admin, 'payments.age_segments')) === 3])
checks.push([
  'another organization sees nothing',
  (await count(
    { role: 'admin', organization_id: '00000000-0000-0000-0000-0000000000ff' },
    'core.students',
  )) === 0,
])
checks.push([
  'a teacher sees nothing',
  (await count({ role: 'teacher', organization_id: ORG_ID }, 'core.students')) === 0,
])
checks.push(['no claims see nothing', (await count({}, 'core.clubs')) === 0])

const ledger = await asUser(admin, async (tx) => {
  const [account] = await tx`select id from core.billing_accounts limit 1`
  await tx`insert into payments.payments (organization_id, account_id, month, amount_cents, method, paid_on) values (${ORG_ID}, ${account.id}, '2026-11', 1000, 'cash', '2026-11-05')`
  const outcomes: boolean[] = []
  for (const statement of [
    'update payments.payments set amount_cents = 1',
    'delete from payments.payments',
  ]) {
    try {
      await tx.savepoint(async (sp) => sp.unsafe(statement))
      outcomes.push(false)
    } catch {
      outcomes.push(true)
    }
  }
  return outcomes
})
checks.push(['payments can be inserted but not edited or deleted', ledger.every(Boolean)])

const foreign = await asUser(admin, async (tx) => {
  try {
    await tx.savepoint(
      async (sp) =>
        sp`insert into core.clubs (organization_id, name) values (${'00000000-0000-0000-0000-0000000000ff'}, 'Intruder')`,
    )
    return false
  } catch {
    return true
  }
})
checks.push(['an admin cannot write rows of another organization', foreign])
await sql.end()

// The API must expose the schemas used by the app.
const api = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
})
for (const [schema, table] of [
  ['core', 'clubs'],
  ['classes', 'groups'],
  ['payments', 'age_segments'],
] as const) {
  const { error } = await api.schema(schema).from(table).select('*', { head: true, count: 'exact' })
  checks.push([`API exposes ${schema}.${table}${error ? ` (${JSON.stringify(error)})` : ''}`, !error])
}

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
process.exit(failed ? 1 : 0)
