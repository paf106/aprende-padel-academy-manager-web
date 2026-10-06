create or replace function classes.update_session_roster(p_session_id uuid,p_student_ids uuid[])
returns void language plpgsql security invoker set search_path=''
as $$
declare s classes.sessions%rowtype; ids uuid[];
begin
 if not(select core.is_admin()) then raise exception using errcode='42501',message='Solo administración puede editar inscripciones';end if;
 select * into s from classes.sessions where id=p_session_id and organization_id=(select core.current_org()) and (select core.module_enabled('classes')) for update;
 if not found then raise exception using errcode='P0002',message='Clase no encontrada';end if;
 select coalesce(array_agg(distinct x),array[]::uuid[]) into ids from unnest(coalesce(p_student_ids,array[]::uuid[])) x;
 if cardinality(ids)>16 then raise exception using errcode='23514',message='El aforo máximo es 16';end if;
 if exists(select 1 from core.students st where st.id=any(ids) and(st.organization_id<>s.organization_id or st.club_id<>s.club_id or st.category<>s.category or not st.active)) then raise exception using errcode='23514',message='Todos los alumnos deben estar activos y pertenecer al club y categoría';end if;
 delete from classes.session_students ss where ss.session_id=s.id and not(ss.student_id=any(ids));
 insert into classes.session_students(session_id,student_id) select s.id,x from unnest(ids)x on conflict do nothing;
end $$;
grant execute on function classes.update_session_roster(uuid,uuid[]) to authenticated;
revoke execute on function classes.update_session_roster(uuid,uuid[]) from public,anon;
