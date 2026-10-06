-- Make custom schemas visible to PostgREST. RLS and table grants still control access.
grant usage on schema core, classes, payments to anon, authenticated, service_role;
grant execute on function classes.generate_sessions(uuid,date,date) to authenticated, service_role;
grant execute on function classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text) to authenticated, service_role;
grant execute on function classes.set_session_status(uuid,classes.session_status,text) to authenticated, service_role;
grant execute on function payments.generate_student_charges(date) to authenticated, service_role;
grant execute on function payments.generate_teacher_settlements(date) to authenticated, service_role;
grant execute on function payments.close_period(date) to authenticated, service_role;
revoke execute on function classes.generate_sessions(uuid,date,date) from public,anon;
revoke execute on function classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text) from public,anon;
revoke execute on function classes.set_session_status(uuid,classes.session_status,text) from public,anon;
revoke execute on function payments.generate_student_charges(date) from public,anon;
revoke execute on function payments.generate_teacher_settlements(date) from public,anon;
revoke execute on function payments.close_period(date) from public,anon;
select pg_notify('pgrst','reload config');
select pg_notify('pgrst','reload schema');
