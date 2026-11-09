-- Removes every v1 schema and all its data. Auth users are kept.
drop schema if exists core cascade;
drop schema if exists classes cascade;
drop schema if exists payments cascade;
drop schema if exists courts cascade;
drop schema if exists inventory cascade;
drop schema if exists private cascade;

do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations;
  end if;
end $$;
