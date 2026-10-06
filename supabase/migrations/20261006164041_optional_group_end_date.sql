drop function if exists classes.update_group(uuid,text,uuid,core.student_level,smallint,time,smallint,smallint,date,date,uuid[]);
create or replace function classes.update_group(p_group_id uuid,p_name text,p_teacher_id uuid,p_level core.student_level,p_weekday smallint,p_start_time time,p_duration_minutes smallint,p_capacity smallint,p_starts_on date,p_ends_on date default null,p_student_ids uuid[] default array[]::uuid[])
returns void language plpgsql security invoker set search_path=''
as $$
declare g classes.groups%rowtype; ids uuid[];
begin
 if not(select core.is_admin()) then raise exception using errcode='42501',message='Solo administración puede editar grupos';end if;
 select * into g from classes.groups where id=p_group_id and organization_id=(select core.current_org()) and (select core.module_enabled('classes')) for update;
 if not found then raise exception using errcode='P0002',message='Grupo no encontrado';end if;
 if p_ends_on is not null and p_ends_on<p_starts_on then raise exception using errcode='22023',message='La fecha de fin debe ir después del inicio';end if;
 if p_capacity not between 1 and 16 or p_duration_minutes not between 30 and 180 then raise exception using errcode='22023',message='Aforo o duración fuera de rango';end if;
 select coalesce(array_agg(distinct x),array[]::uuid[]) into ids from unnest(coalesce(p_student_ids,array[]::uuid[])) x;
 if cardinality(ids)>p_capacity then raise exception using errcode='23514',message='El número de alumnos supera el aforo';end if;
 if exists(select 1 from core.students s where s.id=any(ids) and(s.club_id<>g.club_id or s.category<>g.category or s.organization_id<>g.organization_id or not s.active)) then raise exception using errcode='23514',message='Los alumnos deben pertenecer al mismo club y categoría';end if;
 if not exists(select 1 from core.club_teachers ct join core.profiles p on p.id=ct.teacher_id where ct.club_id=g.club_id and ct.teacher_id=p_teacher_id and p.active) then raise exception using errcode='23503',message='Profesor no asignado al club';end if;
 update classes.groups set name=trim(p_name),teacher_id=p_teacher_id,level=p_level,weekday=p_weekday,start_time=p_start_time,duration_minutes=p_duration_minutes,capacity=p_capacity,starts_on=p_starts_on,ends_on=p_ends_on where id=g.id;
 delete from classes.group_members where group_id=g.id and not(student_id=any(ids));
 insert into classes.group_members(group_id,student_id,starts_on) select g.id,x,p_starts_on from unnest(ids)x on conflict(group_id,student_id) do update set starts_on=excluded.starts_on,ends_on=null;
end $$;
grant execute on function classes.update_group(uuid,text,uuid,core.student_level,smallint,time,smallint,smallint,date,date,uuid[]) to authenticated;
revoke execute on function classes.update_group(uuid,text,uuid,core.student_level,smallint,time,smallint,smallint,date,date,uuid[]) from public,anon;
