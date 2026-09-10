import { SQL } from 'bun'

const connection = process.env.SUPABASE_DB_URL
if (!connection) throw new Error('SUPABASE_DB_URL is required')

const url = new URL(connection)
const sql = new SQL({
  hostname: url.hostname,
  port: Number(url.port || 5432),
  username: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1) || 'postgres',
  tls: true,
  connectionTimeout: 10_000,
})

try {
  await sql.unsafe(`
    create or replace function core.handle_new_user()
    returns trigger
    language plpgsql
    security definer
    set search_path = core, public
    as $fn$
    begin
      insert into core.profiles(id, organization_id, full_name, email, role)
      values (
        new.id,
        coalesce(
          nullif(new.raw_app_meta_data->>'organization_id', '')::uuid,
          (select id from core.organizations order by created_at limit 1)
        ),
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        coalesce(
          nullif(new.raw_app_meta_data->>'role', '')::core.app_role,
          nullif(new.raw_user_meta_data->>'role', '')::core.app_role,
          'student'
        )
      );
      return new;
    end;
    $fn$;
  `)
  console.log('TRIGGER_FIXED')
} finally {
  await sql.close()
}
