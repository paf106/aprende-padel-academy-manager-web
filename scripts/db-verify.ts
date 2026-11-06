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
const apply = (appMetadata: Record<string, unknown>, steps: unknown[]) =>
  asUser(appMetadata, async (tx) => {
    try {
      await tx.savepoint(async (sp) => sp`select public.apply_changes(${sp.json({ steps } as never)})`)
      return 'ok' as const
    } catch (error) {
      return error instanceof Error ? error.message : 'error'
    }
  })
const club = (name: string, extra: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  name,
  ...extra,
})
const upsert = (rows: unknown[]) => ({
  op: 'upsert',
  table: 'core.clubs',
  keys: ['id'],
  conflict: ['id'],
  rows,
})
checks.push(['apply_changes saves a change as admin', (await apply(admin, [upsert([club('Zz')])])) === 'ok'])
checks.push([
  'apply_changes ignores the organization sent by the client',
  await asUser(admin, async (tx) => {
    const other = club('Zz2', { organization_id: '00000000-0000-0000-0000-0000000000ff' })
    await tx`select public.apply_changes(${tx.json({ steps: [upsert([other])] } as never)})`
    const [row] = await tx`select organization_id from core.clubs where id = ${other.id}`
    return row?.organization_id === ORG_ID
  }),
])
checks.push([
  'apply_changes is all or nothing',
  await asUser(admin, async (tx) => {
    const good = club('Zz3')
    try {
      await tx.savepoint(
        async (sp) =>
          sp`select public.apply_changes(${sp.json({ steps: [upsert([good]), upsert([{ id: 'not-a-uuid', name: 'x' }])] } as never)})`,
      )
    } catch {
      // expected
    }
    return (await tx`select count(*)::int as n from core.clubs where id = ${good.id}`)[0].n === 0
  }),
])
checks.push([
  'every save leaves an audit row that only admins can read',
  await asUser(admin, async (tx) => {
    const created = club('Zz6')
    await tx`select public.apply_changes(${tx.json({ steps: [upsert([created])] } as never)})`
    const rows =
      await tx`select table_name, row_count, row_ids from core.audit_log where table_name = 'core.clubs'`
    return rows.length === 1 && rows[0].row_count === 1 && rows[0].row_ids[0] === created.id
  }),
])
checks.push([
  'a teacher cannot read the audit log',
  (await count({ role: 'teacher', organization_id: ORG_ID }, 'core.audit_log')) === 0,
])
checks.push([
  'apply_changes refuses a teacher',
  (await apply({ role: 'teacher', organization_id: ORG_ID }, [upsert([club('Zz4')])])) !== 'ok',
])
checks.push([
  'apply_changes refuses a user without organization',
  (await apply({ role: 'admin' }, [upsert([club('Zz5')])])) !== 'ok',
])
checks.push([
  'apply_changes refuses the organizations table',
  (await apply(admin, [
    {
      op: 'upsert',
      table: 'core.organizations',
      keys: ['id'],
      conflict: ['id'],
      rows: [{ id: ORG_ID, name: 'x' }],
    },
  ])) !== 'ok',
])
checks.push([
  'apply_changes cannot delete a payment',
  await asUser(admin, async (tx) => {
    const [account] = await tx`select id from core.billing_accounts limit 1`
    const [payment] =
      await tx`insert into payments.payments (organization_id, account_id, month, amount_cents, method, paid_on) values (${ORG_ID}, ${account.id}, '2026-11', 1000, 'cash', '2026-11-05') returning id`
    const step = {
      op: 'delete',
      table: 'payments.payments',
      keys: ['id'],
      conflict: [],
      rows: [{ id: payment.id }],
    }
    try {
      await tx.savepoint(
        async (sp) => sp`select public.apply_changes(${sp.json({ steps: [step] } as never)})`,
      )
    } catch {
      // refused, which is fine too
    }
    return (await tx`select count(*)::int as n from payments.payments where id = ${payment.id}`)[0].n === 1
  }),
])
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
