-- There are no make-up classes: a student added to a class they do not belong to always pays a single class.
update classes.session_attendees set origin = 'drop_in' where origin = 'recovery';
alter table classes.session_attendees drop constraint if exists session_attendees_origin_check;
alter table classes.session_attendees add constraint session_attendees_origin_check check (origin in ('group', 'drop_in'));
notify pgrst, 'reload schema';
