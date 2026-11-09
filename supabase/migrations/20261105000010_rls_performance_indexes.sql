-- Row level security helpers are evaluated once per query, not once per row: wrapping them in a select lets
-- Postgres cache the result. Policies keep exactly the same rules.
do $$
declare
  rec record;
  module_check text;
begin
  for rec in
    select c.table_schema as s, c.table_name as t
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.column_name = 'organization_id'
      and c.table_schema in ('core', 'classes', 'payments')
      and (c.table_schema, c.table_name) not in (('core', 'organizations'), ('core', 'organization_modules'), ('payments', 'payments'))
  loop
    execute format('drop policy if exists admin_all on %I.%I', rec.s, rec.t);
    module_check := case when rec.s = 'core' then 'true' else format('(select private.module_enabled(%L))', rec.s) end;
    execute format(
      'create policy admin_all on %I.%I for all to authenticated using (organization_id = (select private.current_org()) and (select private.is_admin()) and %s) with check (organization_id = (select private.current_org()) and (select private.is_admin()) and %s)',
      rec.s, rec.t, module_check, module_check
    );
  end loop;
end $$;

drop policy organization_read on core.organizations;
create policy organization_read on core.organizations for select to authenticated
  using (id = (select private.current_org()));
drop policy organization_update on core.organizations;
create policy organization_update on core.organizations for update to authenticated
  using (id = (select private.current_org()) and (select private.is_admin()))
  with check (id = (select private.current_org()) and (select private.is_admin()));
drop policy modules_read on core.organization_modules;
create policy modules_read on core.organization_modules for select to authenticated
  using (organization_id = (select private.current_org()));

drop policy ledger_read on payments.payments;
create policy ledger_read on payments.payments for select to authenticated
  using (organization_id = (select private.current_org()) and (select private.is_admin()) and (select private.module_enabled('payments')));
drop policy ledger_insert on payments.payments;
create policy ledger_insert on payments.payments for insert to authenticated
  with check (organization_id = (select private.current_org()) and (select private.is_admin()) and (select private.module_enabled('payments')));

drop policy club_photos_insert on storage.objects;
create policy club_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'club-photos'
    and (storage.foldername(name))[1] = (select private.current_org())::text
    and (select private.is_admin())
  );
drop policy club_photos_update on storage.objects;
create policy club_photos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'club-photos'
    and (storage.foldername(name))[1] = (select private.current_org())::text
    and (select private.is_admin())
  );
drop policy club_photos_delete on storage.objects;
create policy club_photos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'club-photos'
    and (storage.foldername(name))[1] = (select private.current_org())::text
    and (select private.is_admin())
  );

-- Every policy filters by organization_id, so each table gets an index on it (unless one already leads with it).
do $$
declare
  rec record;
begin
  for rec in
    select c.table_schema as s, c.table_name as t
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.column_name = 'organization_id'
      and c.table_schema in ('core', 'classes', 'payments')
      and (c.table_schema, c.table_name) not in (
        ('core', 'organizations'), ('core', 'organization_modules'), ('classes', 'sessions'),
        ('payments', 'billing_settings'), ('payments', 'extra_rates'), ('payments', 'teacher_pay_rates'),
        ('classes', 'settings')
      )
  loop
    execute format('create index if not exists %I on %I.%I (organization_id)', rec.t || '_org_idx', rec.s, rec.t);
  end loop;
end $$;

-- Foreign keys that are joined or filtered on and had no index.
create index if not exists session_attendees_student_idx on classes.session_attendees (student_id);
create index if not exists group_members_student_idx on classes.group_members (student_id);
create index if not exists course_enrollments_student_idx on classes.course_enrollments (student_id);
create index if not exists sessions_group_idx on classes.sessions (group_id) where group_id is not null;
create index if not exists sessions_course_idx on classes.sessions (course_id) where course_id is not null;
create index if not exists sessions_club_idx on classes.sessions (club_id);
create index if not exists groups_club_idx on classes.groups (club_id);
create index if not exists groups_teacher_idx on classes.groups (teacher_id);
create index if not exists courses_club_idx on classes.courses (club_id);
create index if not exists courses_teacher_idx on classes.courses (teacher_id);
create index if not exists teacher_clubs_club_idx on core.teacher_clubs (club_id);
create index if not exists student_clubs_club_idx on core.student_clubs (club_id);
create index if not exists club_closures_club_idx on core.club_closures (club_id) where club_id is not null;
create index if not exists extra_charges_student_idx on payments.extra_charges (student_id);
create index if not exists extra_charges_session_idx on payments.extra_charges (session_id) where session_id is not null;
create index if not exists individual_rates_segment_idx on payments.individual_rates (segment_id);
create index if not exists course_rates_segment_idx on payments.course_rates (segment_id);

notify pgrst, 'reload schema';
