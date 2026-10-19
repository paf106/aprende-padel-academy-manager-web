begin;
select plan(9);

insert into core.organizations(id, name, slug) values ('51000000-0000-0000-0000-000000000001', 'Group exception test', 'group-exception-test');
insert into core.clubs(id, organization_id, name, slug, municipality, timezone) values ('52000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'Exception club', 'exception-club', 'Madrid', 'Europe/Madrid');
insert into core.module_activations(organization_id, module_id, enabled) values ('51000000-0000-0000-0000-000000000001', 'classes', true);
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('53000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'group-exception-admin@example.invalid', '', now(), '{"organization_id":"51000000-0000-0000-0000-000000000001","role":"admin"}', '{"full_name":"Admin"}'),
  ('53000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'group-exception-teacher@example.invalid', '', now(), '{"organization_id":"51000000-0000-0000-0000-000000000001","role":"teacher"}', '{"full_name":"Teacher"}');
insert into core.club_teachers(club_id, teacher_id) values ('52000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002');
insert into classes.groups(id, organization_id, club_id, teacher_id, name, category, level, weekday, start_time, starts_on) values
  ('54000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000002', 'Monday group', 'adult', 'medio', 1, '10:00', '2026-10-19');

set local role authenticated;
set local request.jwt.claim.sub = '53000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"53000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"organization_id":"51000000-0000-0000-0000-000000000001","role":"admin"}}';

select is(classes.generate_sessions('54000000-0000-0000-0000-000000000001', '2026-10-19', '2026-11-02'), 3, 'group generation creates the three Mondays in range');
select lives_ok($$select classes.reschedule_session((select id from classes.sessions where group_id='54000000-0000-0000-0000-000000000001' and group_slot_date='2026-10-19'), '2026-10-21 12:00'::timestamp, 60::smallint, null::text)$$, 'a group session can be rescheduled');
select is(classes.generate_sessions('54000000-0000-0000-0000-000000000001', '2026-10-19', '2026-11-02'), 0, 'regeneration does not recreate the moved occurrence');
select is((select count(*)::integer from classes.sessions where group_id='54000000-0000-0000-0000-000000000001'), 3, 'rescheduling preserves one session per original slot');
select lives_ok($$select classes.delete_session((select id from classes.sessions where group_id='54000000-0000-0000-0000-000000000001' and group_slot_date='2026-10-26'))$$, 'a group session can be deleted');
select ok(private.is_group_slot_excepted('54000000-0000-0000-0000-000000000001', '2026-10-26'), 'deletion records the skipped group occurrence');
select is((select count(*)::integer from classes.sessions where group_id='54000000-0000-0000-0000-000000000001'), 2, 'deleted group session is removed');
select is(classes.generate_sessions('54000000-0000-0000-0000-000000000001', '2026-10-19', '2026-11-09'), 1, 'generation skips exceptions and creates the next unmodified slot');
select is((select count(*)::integer from classes.sessions where group_id='54000000-0000-0000-0000-000000000001'), 3, 'repeated generation preserves one row per original slot');

select * from finish();
rollback;
