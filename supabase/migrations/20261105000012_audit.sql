-- Who changed what: every save leaves one audit row per table it touched, and payments remember who entered them.
-- Both are filled in by the database from the signed-in user's session, never by the browser.
create table core.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  user_id uuid,
  user_email text,
  at timestamptz not null default now(),
  op text not null,
  table_name text not null,
  row_count integer not null,
  row_ids uuid[] not null default '{}'
);
create index audit_log_org_at_idx on core.audit_log (organization_id, at desc);
alter table core.audit_log enable row level security;
revoke all on core.audit_log from anon, authenticated;
grant select, insert on core.audit_log to authenticated;
grant all on core.audit_log to service_role;
create policy audit_read on core.audit_log for select to authenticated
  using (organization_id = (select private.current_org()) and (select private.is_admin()));
create policy audit_insert on core.audit_log for insert to authenticated
  with check (organization_id = (select private.current_org()) and (select private.is_admin()));

create function private.audit(p_org uuid, p_op text, p_table text, p_count bigint, p_rows jsonb) returns void
language sql
security invoker
set search_path = ''
as $$
  insert into core.audit_log (organization_id, user_id, user_email, op, table_name, row_count, row_ids)
  select p_org, (select auth.uid()), (select auth.jwt() ->> 'email'), p_op, p_table, p_count::int,
    coalesce((select array_agg((r ->> 'id')::uuid) from (select r from jsonb_array_elements(p_rows) r where r ? 'id' limit 200) x(r)), '{}')
  where p_count > 0
$$;
grant usage on schema private to authenticated;
grant execute on function private.audit(uuid, text, text, bigint, jsonb) to authenticated;

alter table payments.payments add column created_by uuid default auth.uid();
alter table payments.payments add column created_by_email text default (auth.jwt() ->> 'email');

create or replace function public.apply_changes(changes jsonb) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  org uuid := (select private.current_org());
  step jsonb;
  op text;
  tbl text;
  rel regclass;
  rows jsonb;
  with_org jsonb;
  cols text;
  insert_cols text;
  sets text;
  conflict_cols text;
  key_cols text;
  affected bigint;
begin
  if org is null then
    raise exception 'The user has no organization' using errcode = '42501';
  end if;
  if jsonb_typeof(changes -> 'steps') is distinct from 'array' or jsonb_array_length(changes -> 'steps') > 100 then
    raise exception 'Invalid changes' using errcode = '22023';
  end if;

  for step in select * from jsonb_array_elements(changes -> 'steps') loop
    op := step ->> 'op';
    tbl := step ->> 'table';
    rows := step -> 'rows';
    if op not in ('upsert', 'insert', 'delete') then
      raise exception 'Unknown operation %', op using errcode = '22023';
    end if;
    if split_part(tbl, '.', 1) not in ('core', 'classes', 'payments')
       or tbl in ('core.organizations', 'core.organization_modules')
       or to_regclass(tbl) is null then
      raise exception 'Table not allowed: %', tbl using errcode = '42501';
    end if;
    if jsonb_typeof(rows) is distinct from 'array' or jsonb_array_length(rows) > 5000 then
      raise exception 'Invalid rows for %', tbl using errcode = '22023';
    end if;
    if jsonb_array_length(rows) = 0 then
      continue;
    end if;
    rel := to_regclass(tbl);

    if op = 'delete' then
      select string_agg(format('%I', k), ', ') into key_cols from jsonb_array_elements_text(step -> 'keys') k;
      execute format(
        'delete from %s where (%s) in (select %s from jsonb_populate_recordset(null::%s, $1))',
        rel, key_cols, key_cols, rel
      ) using rows;
      get diagnostics affected = row_count;
      perform private.audit(org, op, tbl, affected, rows);
      continue;
    end if;

    -- Only columns that exist in the table are written; anything else in the request is ignored.
    select string_agg(format('%I', a.attname), ', ' order by a.attnum) into insert_cols
    from pg_attribute a
    where a.attrelid = rel and a.attnum > 0 and not a.attisdropped
      and (a.attname = 'organization_id' or a.attname in (select jsonb_object_keys(rows -> 0)));
    select jsonb_agg(r || jsonb_build_object('organization_id', org)) into with_org from jsonb_array_elements(rows) r;

    if op = 'insert' then
      execute format(
        'insert into %s (%s) select %s from jsonb_populate_recordset(null::%s, $1)',
        rel, insert_cols, insert_cols, rel
      ) using with_org;
      get diagnostics affected = row_count;
    else
      select string_agg(format('%I', c), ', ') into conflict_cols from jsonb_array_elements_text(step -> 'conflict') c;
      select string_agg(format('%1$I = excluded.%1$I', a.attname), ', ') into sets
      from pg_attribute a
      where a.attrelid = rel and a.attnum > 0 and not a.attisdropped
        and a.attname <> 'organization_id'
        and a.attname in (select jsonb_object_keys(rows -> 0))
        and a.attname not in (select jsonb_array_elements_text(step -> 'conflict'));
      execute format(
        'insert into %s (%s) select %s from jsonb_populate_recordset(null::%s, $1) on conflict (%s) %s',
        rel, insert_cols, insert_cols, rel, conflict_cols,
        case when sets is null then 'do nothing' else 'do update set ' || sets end
      ) using with_org;
      get diagnostics affected = row_count;
    end if;
    perform private.audit(org, op, tbl, affected, rows);
  end loop;
end;
$$;


notify pgrst, 'reload schema';
