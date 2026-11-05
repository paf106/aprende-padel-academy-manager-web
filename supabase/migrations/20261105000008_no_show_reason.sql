-- A class can be cancelled because no student came: students lose it and the teacher is still paid.
alter table classes.sessions drop constraint if exists sessions_cancel_reason_check;
alter table classes.sessions add constraint sessions_cancel_reason_check
  check (cancel_reason in ('rain', 'bad_weather', 'teacher_absent', 'teacher_late', 'single_attendee', 'no_show', 'other'));
notify pgrst, 'reload schema';
