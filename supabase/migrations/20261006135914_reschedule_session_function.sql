create or replace function classes.reschedule_session(p_session_id uuid,p_local_start timestamp,p_duration_minutes smallint,p_notes text default null)
returns void language plpgsql security invoker set search_path = ''
as $$
declare s classes.sessions%rowtype;tz text;
begin
 if not (select core.is_admin()) then raise exception using errcode='42501',message='Solo administración puede reprogramar';end if;
 if p_duration_minutes not between 30 and 180 then raise exception using errcode='22023',message='Duración no válida';end if;
 select * into s from classes.sessions where id=p_session_id and organization_id=(select core.current_org()) and (select core.module_enabled('classes'));
 if not found then raise exception using errcode='P0002',message='Clase no encontrada';end if;
 select timezone into tz from core.clubs where id=s.club_id;
 update classes.sessions set starts_at=p_local_start at time zone tz,ends_at=(p_local_start+make_interval(mins=>p_duration_minutes)) at time zone tz,notes=nullif(trim(p_notes),'') where id=s.id;
end $$;
grant execute on function classes.reschedule_session(uuid,timestamp,smallint,text) to authenticated;
revoke execute on function classes.reschedule_session(uuid,timestamp,smallint,text) from public,anon;
