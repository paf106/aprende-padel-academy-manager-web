-- Applies the changes of one save in a single transaction. It runs as the signed-in user (security invoker), so row
-- level security still decides what is allowed; organization_id always comes from the session, never from the request.
--
-- changes = { "steps": [ { "op": "upsert" | "insert" | "delete", "table": "core.clubs",
--                          "keys": ["id"], "conflict": ["id"], "rows": [ {...}, ... ] }, ... ] }
create function public.apply_changes(changes jsonb) returns void
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
    end if;
  end loop;
end;
$$;

revoke all on function public.apply_changes(jsonb) from public, anon;
grant execute on function public.apply_changes(jsonb) to authenticated;

notify pgrst, 'reload schema';
