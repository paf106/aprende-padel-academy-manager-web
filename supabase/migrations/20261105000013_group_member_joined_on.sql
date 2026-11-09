-- The day a student joined a group. Classes before that day never include the student, even if the group's calendar
-- is regenerated from an earlier date. Null means "since the group started".
alter table classes.group_members add column joined_on date;
notify pgrst, 'reload schema';
