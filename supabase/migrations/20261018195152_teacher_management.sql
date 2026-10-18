create or replace function core.update_teacher(
  p_teacher_id uuid,
  p_full_name text,
  p_phone text,
  p_club_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_org_id uuid := (select core.current_org());
  assigned_club_count integer;
  requested_club_count integer;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('classes')) then
    raise exception using errcode = '42501', message = 'No autorizado para editar profesores';
  end if;
  if p_full_name is null or pg_catalog.length(pg_catalog.btrim(p_full_name)) < 2 or pg_catalog.length(p_full_name) > 140 then
    raise exception using errcode = '23514', message = 'El nombre del profesor no es válido';
  end if;
  if p_club_ids is null or pg_catalog.cardinality(p_club_ids) = 0 then
    raise exception using errcode = '23514', message = 'Asigna al profesor al menos un club';
  end if;
  if pg_catalog.cardinality(p_club_ids) <> (select count(distinct club_id)::integer from pg_catalog.unnest(p_club_ids) as clubs(club_id)) then
    raise exception using errcode = '23514', message = 'No repitas clubes en la asignación';
  end if;

  perform 1
  from core.profiles p
  where p.id = p_teacher_id
    and p.organization_id = current_org_id
    and p.role = 'teacher'::core.app_role
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Profesor no encontrado';
  end if;

  select pg_catalog.count(*)::integer into assigned_club_count
  from core.clubs c
  where c.organization_id = current_org_id
    and c.active
    and c.id = any(p_club_ids);
  requested_club_count := pg_catalog.cardinality(p_club_ids);
  if assigned_club_count <> requested_club_count then
    raise exception using errcode = '23514', message = 'Selecciona únicamente clubes activos de tu organización';
  end if;

  update core.profiles
  set full_name = pg_catalog.btrim(p_full_name),
      phone = nullif(pg_catalog.btrim(coalesce(p_phone, '')), '')
  where id = p_teacher_id and organization_id = current_org_id;

  delete from core.club_teachers ct
  where ct.teacher_id = p_teacher_id
    and not (ct.club_id = any(p_club_ids));

  insert into core.club_teachers(club_id, teacher_id)
  select requested.club_id, p_teacher_id
  from pg_catalog.unnest(p_club_ids) as requested(club_id)
  on conflict (club_id, teacher_id) do nothing;
end
$$;

revoke all on function core.update_teacher(uuid, text, text, uuid[]) from public, anon;
grant execute on function core.update_teacher(uuid, text, text, uuid[]) to authenticated;
