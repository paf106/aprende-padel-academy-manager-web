drop function if exists classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text);
create or replace function classes.create_session(p_club_id uuid, p_teacher_id uuid, p_category core.student_category, p_starts_at timestamp, p_duration_minutes smallint, p_student_ids uuid[], p_notes text default null)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare org_id uuid := (select core.current_org()); session_id uuid; tz text; local_start timestamp; local_end timestamp; unique_students uuid[];
begin
  if not (select core.is_admin()) then raise exception using errcode='42501', message='Solo administración puede crear clases'; end if;
  if not (select core.module_enabled('classes')) then raise exception using errcode='42501', message='Módulo de clases desactivado'; end if;
  if p_duration_minutes not between 30 and 180 then raise exception using errcode='22023', message='Duración no válida'; end if;
  select timezone into tz from core.clubs where id=p_club_id and organization_id=org_id and active;
  if tz is null then raise exception using errcode='23503', message='Club no válido'; end if;
  if not exists (select 1 from core.profiles p join core.club_teachers ct on ct.teacher_id=p.id where p.id=p_teacher_id and p.organization_id=org_id and p.role='teacher' and p.active and ct.club_id=p_club_id) then raise exception using errcode='23503', message='Profesor no asignado al club'; end if;
  select coalesce(array_agg(distinct sid), array[]::uuid[]) into unique_students from unnest(coalesce(p_student_ids,array[]::uuid[])) sid;
  if cardinality(unique_students) > 16 then raise exception using errcode='22023', message='El aforo máximo es 16 alumnos'; end if;
  if exists (select 1 from core.students where id=any(unique_students) and (club_id<>p_club_id or category<>p_category or organization_id<>org_id or not active)) then raise exception using errcode='23514', message='Todos los alumnos deben estar activos en el club y categoría de la clase'; end if;
  local_start := p_starts_at;
  local_end := local_start + make_interval(mins=>p_duration_minutes);
  insert into classes.sessions(organization_id,club_id,teacher_id,category,starts_at,ends_at,notes)
  values(org_id,p_club_id,p_teacher_id,p_category,local_start at time zone tz,local_end at time zone tz,nullif(trim(p_notes),'')) returning id into session_id;
  insert into classes.session_students(session_id,student_id) select session_id,sid from unnest(unique_students) sid;
  return session_id;
end
$$;
grant execute on function classes.create_session(uuid,uuid,core.student_category,timestamp,smallint,uuid[],text) to authenticated;
revoke execute on function classes.create_session(uuid,uuid,core.student_category,timestamp,smallint,uuid[],text) from public,anon;
