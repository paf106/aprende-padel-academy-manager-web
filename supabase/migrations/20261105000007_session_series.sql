-- Classes repeated every week from the calendar share a series, so they can be deleted together.
alter table classes.sessions add column series_id uuid;
create index sessions_series_idx on classes.sessions (series_id) where series_id is not null;
notify pgrst, 'reload schema';
