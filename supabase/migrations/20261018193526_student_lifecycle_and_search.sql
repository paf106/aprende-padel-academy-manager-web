create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

alter table core.students add column search_name text not null default '';

create or replace function core.set_student_search_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_name := extensions.unaccent(pg_catalog.lower(new.first_name || ' ' || new.last_name));
  return new;
end
$$;

create trigger set_student_search_name
before insert or update of first_name, last_name on core.students
for each row execute function core.set_student_search_name();

update core.students
set search_name = extensions.unaccent(pg_catalog.lower(first_name || ' ' || last_name));

create index if not exists students_org_name_idx
  on core.students (organization_id, last_name, first_name);
create index if not exists students_search_name_trgm_idx
  on core.students using gin (search_name extensions.gin_trgm_ops);

create or replace function core.search_students(
  p_search text default null,
  p_club_id uuid default null,
  p_category core.student_category default null,
  p_level core.student_level default null,
  p_active boolean default true,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  first_name text,
  last_name text,
  category core.student_category,
  level core.student_level,
  club_id uuid,
  active boolean,
  email text,
  phone text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with search_terms as (
    select extensions.unaccent(pg_catalog.lower(split_term.value)) as value
    from pg_catalog.regexp_split_to_table(coalesce(p_search, ''), E'\\s+') as split_term(value)
    where split_term.value <> ''
  ), filtered as (
    select s.id, s.first_name, s.last_name, s.category, s.level, s.club_id, s.active, s.email, s.phone
    from core.students s
    where s.organization_id = (select core.current_org())
      and (p_active is null or s.active = p_active)
      and (p_club_id is null or s.club_id = p_club_id)
      and (p_category is null or s.category = p_category)
      and (p_level is null or s.level = p_level)
      and not exists (
        select 1
        from search_terms term
        where s.search_name not like ('%' || term.value || '%')
      )
  )
  select filtered.*, pg_catalog.count(*) over () as total_count
  from filtered
  order by last_name, first_name, id
  limit greatest(least(coalesce(p_limit, 50), 100), 1)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function core.set_student_active(p_student_id uuid, p_active boolean)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  student_timezone text;
  today_in_club date;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('classes')) then
    raise exception using errcode = '42501', message = 'No autorizado para cambiar el estado del alumno';
  end if;

  select c.timezone
  into student_timezone
  from core.students s
  join core.clubs c on c.id = s.club_id and c.organization_id = s.organization_id
  where s.id = p_student_id
    and s.organization_id = (select core.current_org())
  for update of s;

  if student_timezone is null then
    raise exception using errcode = 'P0002', message = 'Alumno no encontrado';
  end if;

  if p_active then
    update core.students
    set active = true
    where id = p_student_id and organization_id = (select core.current_org());
    return true;
  end if;

  today_in_club := (pg_catalog.now() at time zone student_timezone)::date;

  delete from classes.group_members gm
  where gm.student_id = p_student_id
    and gm.starts_on >= today_in_club;

  update classes.group_members gm
  set ends_on = today_in_club - 1
  from classes.groups g
  where gm.group_id = g.id
    and gm.student_id = p_student_id
    and gm.starts_on < today_in_club
    and (gm.ends_on is null or gm.ends_on >= today_in_club)
    and g.organization_id = (select core.current_org());

  delete from classes.session_students ss
  using classes.sessions s
  where ss.session_id = s.id
    and ss.student_id = p_student_id
    and s.organization_id = (select core.current_org())
    and s.starts_at >= pg_catalog.now();

  update core.students
  set active = false
  where id = p_student_id and organization_id = (select core.current_org());

  return false;
end
$$;

create or replace function payments.change_student_tariff(p_student_id uuid, p_tariff_id uuid, p_starts_on date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_org_id uuid := (select core.current_org());
  student_category core.student_category;
  tariff_category core.student_category;
  current_assignment payments.student_tariffs%rowtype;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para cambiar tarifas';
  end if;

  select s.category
  into student_category
  from core.students s
  where s.id = p_student_id and s.organization_id = current_org_id
  for update;

  select t.category
  into tariff_category
  from payments.tariffs t
  where t.id = p_tariff_id and t.organization_id = current_org_id and t.active;

  if student_category is null or tariff_category is null or student_category <> tariff_category then
    raise exception using errcode = '23514', message = 'La tarifa debe estar activa y coincidir con la categoría del alumno';
  end if;

  select st.*
  into current_assignment
  from payments.student_tariffs st
  where st.student_id = p_student_id and st.ends_on is null
  order by st.starts_on desc
  limit 1
  for update;

  if found and current_assignment.starts_on > p_starts_on then
    raise exception using errcode = '23514', message = 'La nueva tarifa no puede empezar antes de la tarifa actual';
  end if;

  if found and current_assignment.starts_on = p_starts_on then
    update payments.student_tariffs
    set tariff_id = p_tariff_id
    where id = current_assignment.id;
    return;
  end if;

  if found then
    update payments.student_tariffs
    set ends_on = p_starts_on - 1
    where id = current_assignment.id;
  end if;

  insert into payments.student_tariffs(student_id, tariff_id, starts_on)
  values (p_student_id, p_tariff_id, p_starts_on);
end
$$;

revoke all on function core.search_students(text, uuid, core.student_category, core.student_level, boolean, integer, integer) from public, anon;
revoke all on function core.set_student_active(uuid, boolean) from public, anon;
revoke all on function payments.change_student_tariff(uuid, uuid, date) from public, anon;
grant execute on function core.search_students(text, uuid, core.student_category, core.student_level, boolean, integer, integer) to authenticated;
grant execute on function core.set_student_active(uuid, boolean) to authenticated;
grant execute on function payments.change_student_tariff(uuid, uuid, date) to authenticated;
