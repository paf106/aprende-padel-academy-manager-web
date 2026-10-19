alter table classes.sessions add column group_slot_date date;

with slots as (
  select s.id, s.group_id,
    day_value.value - ((extract(dow from day_value.value)::integer - g.weekday + 7) % 7) as slot_date,
    count(*) over (partition by s.group_id, day_value.value - ((extract(dow from day_value.value)::integer - g.weekday + 7) % 7)) as same_slot_count
  from classes.sessions s
  join classes.groups g on g.id = s.group_id
  join core.clubs c on c.id = s.club_id
  cross join lateral (select (s.starts_at at time zone c.timezone)::date as value) day_value
  where s.group_id is not null and s.group_slot_date is null
)
update classes.sessions s
set group_slot_date = slots.slot_date
from slots
where s.id = slots.id and slots.same_slot_count = 1;

create unique index sessions_group_slot_unique_idx
  on classes.sessions (group_id, group_slot_date)
  where group_id is not null and group_slot_date is not null;

create table private.group_session_exceptions (
  organization_id uuid not null references core.organizations(id) on delete cascade,
  group_id uuid not null references classes.groups(id) on delete cascade,
  slot_date date not null,
  created_by uuid not null references core.profiles(id) on delete restrict,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (group_id, slot_date)
);
alter table private.group_session_exceptions enable row level security;
revoke all on private.group_session_exceptions from public, anon, authenticated;

create or replace function private.is_group_slot_excepted(p_group_id uuid, p_slot_date date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (select private.active_admin())
    and exists (
      select 1 from private.group_session_exceptions exception
      where exception.group_id = p_group_id
        and exception.slot_date = p_slot_date
        and exception.organization_id = (select private.active_org_id())
    )
$$;

create or replace function private.record_group_slot_exception(p_group_id uuid, p_slot_date date, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_org_id uuid := (select private.active_org_id());
begin
  if (select auth.uid()) is null or not (select private.active_admin()) then
    raise exception using errcode = '42501', message = 'Solo administración puede modificar una ocurrencia de grupo';
  end if;
  if not exists (select 1 from classes.groups g where g.id = p_group_id and g.organization_id = current_org_id) then
    raise exception using errcode = 'P0002', message = 'Grupo no encontrado';
  end if;
  insert into private.group_session_exceptions(organization_id, group_id, slot_date, created_by, reason)
  values (current_org_id, p_group_id, p_slot_date, (select auth.uid()), pg_catalog.left(pg_catalog.btrim(p_reason), 200))
  on conflict (group_id, slot_date) do nothing;
end
$$;

revoke all on function private.is_group_slot_excepted(uuid, date) from public, anon;
revoke all on function private.record_group_slot_exception(uuid, date, text) from public, anon;
grant execute on function private.is_group_slot_excepted(uuid, date) to authenticated, service_role;
grant execute on function private.record_group_slot_exception(uuid, date, text) to authenticated, service_role;

create or replace function classes.generate_sessions(target_group_id uuid, range_start date, range_end date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  group_row classes.groups%rowtype;
  club_timezone text;
  slot_date date;
  last_day date;
  local_start timestamp;
  inserted_id uuid;
  total integer := 0;
begin
  if not (select core.is_admin()) then raise exception using errcode = '42501', message = 'Solo administración puede generar sesiones'; end if;
  if not (select core.module_enabled('classes')) then raise exception using errcode = '42501', message = 'Módulo de clases desactivado'; end if;
  if range_end < range_start or range_end - range_start > 366 then raise exception using errcode = '22023', message = 'El periodo debe abarcar como máximo 12 meses'; end if;
  select * into group_row from classes.groups where id = target_group_id and organization_id = (select core.current_org()) and active for update;
  if not found then raise exception using errcode = 'P0002', message = 'Grupo activo no encontrado'; end if;
  select timezone into club_timezone from core.clubs where id = group_row.club_id and organization_id = group_row.organization_id;
  slot_date := greatest(range_start, group_row.starts_on);
  last_day := least(range_end, coalesce(group_row.ends_on, range_end));
  if last_day < slot_date then return 0; end if;
  slot_date := slot_date + ((group_row.weekday - extract(dow from slot_date)::integer + 7) % 7);

  while slot_date <= last_day loop
    if not (select private.is_group_slot_excepted(group_row.id, slot_date))
      and not exists (select 1 from classes.sessions s where s.group_id = group_row.id and s.group_slot_date = slot_date) then
      local_start := slot_date + group_row.start_time;
      insert into classes.sessions(organization_id, club_id, group_id, group_slot_date, teacher_id, category, starts_at, ends_at, status)
      values (group_row.organization_id, group_row.club_id, group_row.id, slot_date, group_row.teacher_id, group_row.category,
        local_start at time zone club_timezone,
        (local_start + make_interval(mins => group_row.duration_minutes)) at time zone club_timezone,
        'pending')
      on conflict do nothing returning id into inserted_id;
      if inserted_id is not null then
        insert into classes.session_students(session_id, student_id)
        select inserted_id, gm.student_id
        from classes.group_members gm
        join core.students student on student.id = gm.student_id and student.category = group_row.category and student.club_id = group_row.club_id and student.active
        where gm.group_id = group_row.id and gm.starts_on <= slot_date and (gm.ends_on is null or gm.ends_on >= slot_date)
        on conflict do nothing;
        total := total + 1;
      end if;
      inserted_id := null;
    end if;
    slot_date := slot_date + 7;
  end loop;
  return total;
end
$$;

create or replace function classes.delete_session(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_row classes.sessions%rowtype;
  club_timezone text;
  exception_date date;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('classes')) then
    raise exception using errcode = '42501', message = 'Solo administración puede eliminar clases';
  end if;
  select * into session_row
  from classes.sessions
  where id = p_session_id and organization_id = (select core.current_org())
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Clase no encontrada'; end if;
  if (select private.session_has_settlement(p_session_id)) then
    raise exception using errcode = '55000', message = 'No se puede eliminar: la clase ya está incluida en una liquidación';
  end if;
  if session_row.group_id is not null then
    select c.timezone into club_timezone from core.clubs c where c.id = session_row.club_id;
    exception_date := coalesce(session_row.group_slot_date,
      (session_row.starts_at at time zone club_timezone)::date
      - ((extract(dow from (session_row.starts_at at time zone club_timezone)::date)::integer
        - (select g.weekday from classes.groups g where g.id = session_row.group_id) + 7) % 7));
    perform private.record_group_slot_exception(session_row.group_id, exception_date, 'Sesión eliminada por administración');
  end if;
  delete from classes.sessions where id = session_row.id;
end
$$;

grant execute on function classes.generate_sessions(uuid, date, date) to authenticated;
grant execute on function classes.generate_sessions(uuid, date, date) to service_role;
revoke execute on function classes.generate_sessions(uuid, date, date) from public, anon;
grant execute on function classes.delete_session(uuid) to authenticated;
revoke execute on function classes.delete_session(uuid) from public, anon;
select pg_notify('pgrst', 'reload schema');
