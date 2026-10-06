-- RPCs check trusted app_metadata role, organization, module flag, and RLS inside Postgres.
grant execute on function classes.generate_sessions(uuid,date,date) to authenticated;
grant execute on function classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text) to authenticated;
grant execute on function classes.set_session_status(uuid,classes.session_status,text) to authenticated;
grant execute on function payments.generate_student_charges(date) to authenticated;
grant execute on function payments.generate_teacher_settlements(date) to authenticated;
grant execute on function payments.close_period(date) to authenticated;
grant execute on function payments.ensure_open_period(date) to authenticated;
