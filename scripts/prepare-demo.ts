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
    create or replace function core.handle_new_user() returns trigger
    language plpgsql security definer set search_path = ''
    as $fn$
    declare
      org_id uuid;
      trusted_role core.app_role;
    begin
      org_id := nullif(new.raw_app_meta_data->>'organization_id', '')::uuid;
      if org_id is null then return new; end if;
      begin
        trusted_role := coalesce(nullif(new.raw_app_meta_data->>'role', '' )::core.app_role, 'student'::core.app_role);
      exception when invalid_text_representation then
        trusted_role := 'student'::core.app_role;
      end;
      insert into core.profiles(id, organization_id, full_name, email, role)
      values (new.id, org_id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email, trusted_role)
      on conflict (id) do nothing;
      return new;
    end
    $fn$;
  `)
  console.log('TRIGGER_FIXED')
} finally {
  await sql.close()
}
