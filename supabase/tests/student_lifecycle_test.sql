begin;
select plan(13);

insert into core.organizations(id, name, slug)
values ('21000000-0000-0000-0000-000000000001', 'Student lifecycle test', 'student-lifecycle-test');
insert into core.clubs(id, organization_id, name, slug, municipality, timezone)
values ('22000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Madrid club', 'lifecycle-madrid', 'Madrid', 'Europe/Madrid');
insert into core.module_activations(organization_id, module_id, enabled)
values
  ('21000000-0000-0000-0000-000000000001', 'classes', true),
  ('21000000-0000-0000-0000-000000000001', 'payments', true);
insert into payments.tariffs(id, organization_id, name, category, monthly_amount_cents)
values
  ('27000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Tarifa inicial', 'adult', 5000),
  ('27000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', 'Tarifa corregida', 'adult', 6000);
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('23000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-lifecycle-admin@example.invalid', '', now(), '{"organization_id":"21000000-0000-0000-0000-000000000001","role":"admin"}', '{"full_name":"Lifecycle Admin"}'),
  ('23000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-lifecycle-teacher@example.invalid', '', now(), '{"organization_id":"21000000-0000-0000-0000-000000000001","role":"teacher"}', '{"full_name":"Lifecycle Teacher"}');
insert into core.club_teachers(club_id, teacher_id)
values ('22000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002');

insert into core.students(id, organization_id, club_id, first_name, last_name, birth_date, category, level)
values ('24000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Ana', 'García', '1990-01-01', 'adult', 'medio');
insert into payments.student_tariffs(student_id, tariff_id, starts_on)
values ('24000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000001', (now() at time zone 'Europe/Madrid')::date);
insert into classes.groups(id, organization_id, club_id, teacher_id, name, category, level, weekday, start_time, starts_on)
values ('25000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', 'Grupo Ana', 'adult', 'medio', 1, '18:00', current_date - 30);
insert into classes.group_members(group_id, student_id, starts_on)
values ('25000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', current_date - 30);

insert into classes.sessions(id, organization_id, club_id, group_id, teacher_id, category, starts_at, ends_at)
values
  ('26000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', 'adult', now() - interval '2 days', now() - interval '2 days' + interval '1 hour'),
  ('26000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000002', 'adult', now() + interval '2 days', now() + interval '2 days' + interval '1 hour');
insert into classes.session_students(session_id, student_id)
values
  ('26000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001'),
  ('26000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000001');
insert into classes.attendance(session_id, student_id, status, comment)
values
  ('26000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'present', 'Historial'),
  ('26000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000001', 'absent', 'Próxima clase');

set local role authenticated;
set local request.jwt.claim.sub = '23000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"organization_id":"21000000-0000-0000-0000-000000000001","role":"admin"}}';

select is((select count(*)::integer from core.search_students('ana garcia', null, null, null, true, 50, 0)), 1, 'search is case- and accent-insensitive for a full name');
select is((select core.set_student_active('24000000-0000-0000-0000-000000000001', false)), false, 'deactivation returns inactive state');
select is((select active from core.students where id = '24000000-0000-0000-0000-000000000001'), false, 'student is marked inactive');
select is((select ends_on from classes.group_members where group_id = '25000000-0000-0000-0000-000000000001' and student_id = '24000000-0000-0000-0000-000000000001'), ((now() at time zone 'Europe/Madrid')::date - 1), 'existing group membership ends before today');
select is((select count(*)::integer from classes.session_students where session_id = '26000000-0000-0000-0000-000000000002'), 0, 'future session enrollment is removed');
select is((select count(*)::integer from classes.attendance where session_id = '26000000-0000-0000-0000-000000000002'), 0, 'future attendance is removed with the enrollment');
select is((select count(*)::integer from classes.session_students where session_id = '26000000-0000-0000-0000-000000000001'), 1, 'past session enrollment is retained');
select is((select count(*)::integer from core.search_students('GARCIA', null, null, null, false, 50, 0)), 1, 'inactive students can be found with accent-insensitive search');
select is((select core.set_student_active('24000000-0000-0000-0000-000000000001', true)), true, 'reactivation returns active state');
select is((select count(*)::integer from classes.group_members where group_id = '25000000-0000-0000-0000-000000000001' and student_id = '24000000-0000-0000-0000-000000000001' and ends_on is null), 0, 'reactivation does not silently restore ended group enrollment');

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '23000000-0000-0000-0000-000000000002';
set local request.jwt.claims = '{"sub":"23000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"organization_id":"21000000-0000-0000-0000-000000000001","role":"teacher"}}';
select throws_ok($$select core.set_student_active('24000000-0000-0000-0000-000000000001', false)$$, '42501', null, 'a teacher cannot deactivate a student');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = '23000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"organization_id":"21000000-0000-0000-0000-000000000001","role":"admin"}}';
select lives_ok($$select payments.change_student_tariff('24000000-0000-0000-0000-000000000001', '27000000-0000-0000-0000-000000000002', (now() at time zone 'Europe/Madrid')::date)$$, 'a tariff can be corrected on its original start date');
select is((select count(*)::integer from payments.student_tariffs where student_id = '24000000-0000-0000-0000-000000000001' and ends_on is null), 1, 'same-day tariff correction keeps one current assignment');

select * from finish();
rollback;
