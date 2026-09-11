create unique index if not exists sessions_group_start_unique_idx
  on classes.sessions (group_id, starts_at)
  where group_id is not null;

create or replace function classes.generate_sessions(
  target_group_id uuid,
  range_start date,
  range_end date
) returns integer
language plpgsql
security invoker
set search_path = classes, core, public
as $$
declare
  target_group classes.groups%rowtype;
  current_day date;
  v_session_id uuid;
  v_starts_at timestamptz;
  inserted_count integer := 0;
begin
  if range_end < range_start then
    raise exception 'El final del periodo debe ser posterior al inicio';
  end if;

  select * into target_group from classes.groups where id = target_group_id;
  if target_group.id is null then raise exception 'Grupo no encontrado'; end if;
  if not core.is_admin() or target_group.organization_id <> core.current_org() or not core.module_enabled('classes') then
    raise exception 'No autorizado';
  end if;

  for current_day in select generate_series(range_start, range_end, interval '1 day')::date loop
    if extract(dow from current_day)::smallint = target_group.weekday then
      v_starts_at := (current_day + target_group.start_time) at time zone 'Europe/Madrid';
      insert into classes.sessions (organization_id, club_id, group_id, teacher_id, starts_at, ends_at, status)
      values (target_group.organization_id, target_group.club_id, target_group.id, target_group.teacher_id,
              v_starts_at, v_starts_at + make_interval(mins => target_group.duration_minutes), 'pending')
      on conflict (group_id, starts_at) where group_id is not null do nothing
      returning id into v_session_id;

      if v_session_id is not null then
        insert into classes.session_students (session_id, student_id)
        select v_session_id, gm.student_id
        from classes.group_members gm
        where gm.group_id = target_group.id
          and gm.starts_on <= current_day
          and (gm.ends_on is null or gm.ends_on >= current_day)
        on conflict do nothing;
        inserted_count := inserted_count + 1;
      end if;
    end if;
  end loop;
  return inserted_count;
end;
$$;

drop policy if exists classes_read_group_members on classes.group_members;
drop policy if exists classes_admin_group_members on classes.group_members;
create policy classes_read_group_members on classes.group_members for select to authenticated
  using (exists (select 1 from classes.groups g where g.id = group_id and g.organization_id = core.current_org() and (core.is_admin() or g.teacher_id = auth.uid()) and core.module_enabled('classes')));
create policy classes_admin_group_members on classes.group_members for all to authenticated
  using (core.is_admin() and exists (select 1 from classes.groups g where g.id = group_id and g.organization_id = core.current_org() and core.module_enabled('classes')))
  with check (core.is_admin() and exists (select 1 from classes.groups g where g.id = group_id and g.organization_id = core.current_org() and core.module_enabled('classes')));

drop policy if exists classes_read_attendance on classes.attendance;
drop policy if exists classes_teacher_update_attendance on classes.attendance;
create policy classes_read_attendance on classes.attendance for select to authenticated
  using (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and (core.is_admin() or s.teacher_id = auth.uid()) and core.module_enabled('classes')));
create policy classes_teacher_update_attendance on classes.attendance for update to authenticated
  using (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and (core.is_admin() or s.teacher_id = auth.uid()) and core.module_enabled('classes')))
  with check (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and (core.is_admin() or s.teacher_id = auth.uid()) and core.module_enabled('classes')));

drop policy if exists classes_teacher_session_students on classes.session_students;
create policy classes_teacher_session_students on classes.session_students for all to authenticated
  using (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and (core.is_admin() or s.teacher_id = auth.uid()) and core.module_enabled('classes')))
  with check (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and (core.is_admin() or s.teacher_id = auth.uid()) and core.module_enabled('classes')));

drop policy if exists classes_read_sessions on classes.sessions;
create policy classes_read_sessions on classes.sessions for select to authenticated
  using (organization_id = core.current_org() and (core.is_admin() or teacher_id = auth.uid()) and core.module_enabled('classes'));
drop policy if exists classes_read_groups on classes.groups;
create policy classes_read_groups on classes.groups for select to authenticated
  using (organization_id = core.current_org() and (core.is_admin() or teacher_id = auth.uid()) and core.module_enabled('classes'));
drop policy if exists scoped_students on core.students;
create policy scoped_students on core.students for select to authenticated
  using (organization_id = core.current_org() and (core.is_admin() or exists (select 1 from classes.group_members gm join classes.groups g on g.id = gm.group_id where gm.student_id = core.students.id and g.teacher_id = auth.uid())));

grant execute on function classes.generate_sessions(uuid, date, date) to authenticated;
create or replace function public.generate_sessions(target_group_id uuid, range_start date, range_end date)
returns integer
language sql
security invoker
set search_path = classes, core, public
as $$ select classes.generate_sessions(target_group_id, range_start, range_end) $$;
grant execute on function public.generate_sessions(uuid, date, date) to authenticated;
select pg_notify('pgrst', 'reload schema');
