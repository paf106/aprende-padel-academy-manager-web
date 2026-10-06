import { SQL } from 'bun'
const connection = process.env.SUPABASE_DB_URL
const file = Bun.argv[2]
if (!connection || !file) throw new Error('Usage: bun scripts/apply-sql.ts <file>')
const url = new URL(connection)
const sql = new SQL({ hostname: url.hostname, port: Number(url.port || 5432), username: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1) || 'postgres', tls: url.hostname !== '127.0.0.1' && url.hostname !== 'localhost', connectionTimeout: 10_000 })
try { await sql.unsafe(await Bun.file(file).text()); console.log(`APPLIED ${file}`) } finally { await sql.close() }
