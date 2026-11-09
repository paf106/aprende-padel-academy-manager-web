import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import postgres from 'postgres'

const url = process.env.SUPABASE_DB_URL
if (!url) throw new Error('Missing SUPABASE_DB_URL (set it in .env)')

const dir = join(process.cwd(), 'supabase', 'migrations')
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.sql'))
  .sort()

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => undefined })

await sql`create table if not exists public.app_migrations (name text primary key, applied_at timestamptz not null default now())`
await sql`alter table public.app_migrations enable row level security`
await sql`revoke all on public.app_migrations from anon, authenticated`

const applied = new Set((await sql`select name from public.app_migrations`).map((row) => row.name as string))
let count = 0
for (const file of files) {
  if (applied.has(file)) continue
  console.log(`applying ${file}`)
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(join(dir, file), 'utf8'))
    await tx`insert into public.app_migrations (name) values (${file})`
  })
  count += 1
}
console.log(count === 0 ? 'database is up to date' : `applied ${count} migration(s)`)
await sql.end()
