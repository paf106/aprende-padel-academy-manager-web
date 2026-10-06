revoke execute on function classes.generate_sessions(uuid,date,date) from authenticated;
revoke execute on function classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text) from authenticated;
revoke execute on function classes.set_session_status(uuid,classes.session_status,text) from authenticated;
revoke execute on function payments.generate_student_charges(date) from authenticated;
revoke execute on function payments.generate_teacher_settlements(date) from authenticated;
revoke execute on function payments.close_period(date) from authenticated;
grant execute on function classes.generate_sessions(uuid,date,date) to service_role;
grant execute on function classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text) to service_role;
grant execute on function classes.set_session_status(uuid,classes.session_status,text) to service_role;
grant execute on function payments.generate_student_charges(date) to service_role;
grant execute on function payments.generate_teacher_settlements(date) to service_role;
grant execute on function payments.close_period(date) to service_role;

drop policy if exists attendance_teacher_insert on classes.attendance;
drop policy if exists attendance_teacher_update on classes.attendance;
drop policy if exists attendance_admin_write on classes.attendance;
create policy attendance_admin_insert on classes.attendance for insert to authenticated
  with check ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));
create policy attendance_admin_update on classes.attendance for update to authenticated
  using ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))))
  with check ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));
create policy attendance_admin_delete on classes.attendance for delete to authenticated
  using ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));
