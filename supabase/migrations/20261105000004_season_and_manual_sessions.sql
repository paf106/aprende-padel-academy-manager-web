-- Classes created by hand from the calendar are marked, so editing a group never removes them.
alter table classes.sessions add column manual boolean not null default false;
update classes.sessions set manual = true where group_id is null and course_id is null;

-- Per-organization class settings: the last day of the season, until which groups generate their classes.
create table classes.settings (
  organization_id uuid primary key references core.organizations on delete cascade,
  season_end date not null
);
alter table classes.settings enable row level security;
grant select, insert, update, delete on classes.settings to authenticated;
grant all on classes.settings to service_role;
create policy admin_all on classes.settings for all to authenticated
  using (organization_id = private.current_org() and private.is_admin() and private.module_enabled('classes'))
  with check (organization_id = private.current_org() and private.is_admin() and private.module_enabled('classes'));

notify pgrst, 'reload schema';
