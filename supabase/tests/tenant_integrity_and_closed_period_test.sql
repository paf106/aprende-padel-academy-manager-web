begin;
select plan(22);

insert into core.organizations(id, name, slug) values
  ('11000000-0000-0000-0000-000000000001', 'RLS test A', 'rls-test-a'),
  ('11000000-0000-0000-0000-000000000002', 'RLS test B', 'rls-test-b');

insert into core.clubs(id, organization_id, name, slug, municipality, timezone) values
  ('12000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Club A', 'club-a', 'Madrid', 'Europe/Madrid'),
  ('12000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'Club B', 'club-b', 'Pioz', 'Europe/Madrid');
insert into payments.tariffs(id, organization_id, name, category, monthly_amount_cents)
values ('1a000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'Foreign tariff', 'adult', 1000);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-admin-a@example.invalid', '', now(), '{"organization_id":"11000000-0000-0000-0000-000000000001","role":"admin"}', '{"full_name":"Admin A"}'),
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-teacher-a@example.invalid', '', now(), '{"organization_id":"11000000-0000-0000-0000-000000000001","role":"teacher"}', '{"full_name":"Teacher A"}'),
  ('13000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test-teacher-b@example.invalid', '', now(), '{"organization_id":"11000000-0000-0000-0000-000000000001","role":"teacher"}', '{"full_name":"Teacher B"}');

insert into core.club_teachers(club_id, teacher_id) values
  ('12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002'),
  ('12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000003');

insert into core.students(id, organization_id, club_id, first_name, last_name, birth_date, category)
values
  ('14000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Student', 'A', '2010-01-01', 'adult'),
  ('14000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Student', 'B', '2010-01-01', 'adult'),
  ('14000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'Student', 'C', '2010-01-01', 'adult');

insert into classes.groups(id, organization_id, club_id, teacher_id, name, category, level, weekday, start_time, capacity)
values
  ('15000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', 'Group A', 'adult', 'medio', 1, '10:00', 8),
  ('15000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000003', 'Group B', 'adult', 'medio', 1, '11:00', 8);

insert into classes.group_members(group_id, student_id) values
  ('15000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001'),
  ('15000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000002');

insert into classes.sessions(id, organization_id, club_id, group_id, teacher_id, category, starts_at, ends_at)
values
  ('16000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', 'adult', '2026-10-20 10:00+00', '2026-10-20 11:00+00'),
  ('16000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', 'adult', '2026-10-20 11:00+00', '2026-10-20 12:00+00');

insert into classes.session_students(session_id, student_id) values
  ('16000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000002');

insert into core.guardians(id, organization_id, full_name) values
  ('17000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Guardian A'),
  ('17000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Guardian B');
insert into core.student_guardians(student_id, guardian_id) values
  ('14000000-0000-0000-0000-000000000001', '17000000-0000-0000-0000-000000000001'),
  ('14000000-0000-0000-0000-000000000002', '17000000-0000-0000-0000-000000000002');

insert into core.module_activations(organization_id, module_id, enabled) values
  ('11000000-0000-0000-0000-000000000001', 'classes', true),
  ('11000000-0000-0000-0000-000000000001', 'payments', true);

set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-0000-0000-000000000002';
set local request.jwt.claims = '{"sub":"13000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"organization_id":"11000000-0000-0000-0000-000000000001","role":"teacher"}}';
select is((select core.current_org()), '11000000-0000-0000-0000-000000000001'::uuid, 'active teacher resolves to their organization');
select is((select count(*)::integer from core.students), 1, 'teacher only sees students assigned to their classes');
select is((select count(*)::integer from core.guardians), 1, 'teacher only sees guardians for assigned students');
select ok(not has_table_privilege('authenticated', 'core.module_activations', 'UPDATE'), 'authenticated users cannot change module activations');
select ok(not has_table_privilege('authenticated', 'core.module_activations', 'INSERT'), 'authenticated users cannot insert module activations');
reset role;

update core.profiles set active = false where id = '13000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-0000-0000-000000000002';
set local request.jwt.claims = '{"sub":"13000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"organization_id":"11000000-0000-0000-0000-000000000001","role":"teacher"}}';
select is((select core.current_org()), null::uuid, 'inactive profile no longer resolves to an organization');
select is((select count(*)::integer from core.students), 0, 'inactive profile cannot read tenant data');
reset role;
update core.profiles set active = true where id = '13000000-0000-0000-0000-000000000002';

select throws_ok(
  $$insert into core.students(organization_id, club_id, first_name, last_name, birth_date, category)
    values ('11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', 'Cross', 'Tenant', '2010-01-01', 'adult')$$,
  '23514', null, 'student cannot reference a club from another organization'
);
select throws_ok(
  $$insert into classes.groups(organization_id, club_id, teacher_id, name, category, level, weekday, start_time)
    values ('11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'Cross tenant', 'adult', 'medio', 2, '10:00')$$,
  '23514', null, 'group cannot reference a club from another organization'
);
select throws_ok(
  $$insert into core.clubs(organization_id, name, slug, municipality, timezone)
    values ('11000000-0000-0000-0000-000000000001', 'Invalid timezone', 'invalid-tz', 'Madrid', 'Not/A_Timezone')$$,
  '22023', null, 'invalid time zones cannot be stored for clubs'
);

set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"13000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"organization_id":"11000000-0000-0000-0000-000000000001","role":"admin"}}';
select throws_ok(
  $$update core.profiles set role = 'admin' where id = '13000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'an authenticated admin cannot promote profiles through the Data API'
);
select throws_ok(
  $$select payments.create_student_with_tariff('12000000-0000-0000-0000-000000000001', 'Atomic', 'Failure', '2010-01-01', 'adult', 'unspecified', 'medio', null, null, '1a000000-0000-0000-0000-000000000001', '2026-10-15')$$,
  '23514', null, 'student cannot be created with a foreign organization tariff'
);
select is((select count(*)::integer from core.students where first_name = 'Atomic'), 0, 'failed student tariff assignment leaves no partial student');
select throws_ok(
  $$select classes.create_group('Atomic failure', '12000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000002', 'adult', 'medio', 2::smallint, '10:00'::time, 60::smallint, 8::smallint, '2026-10-15'::date, null::date, array['14000000-0000-0000-0000-000000000003'::uuid])$$,
  '23514', null, 'group creation rejects a student from another organization'
);
select is((select count(*)::integer from classes.groups where name = 'Atomic failure'), 0, 'failed group membership leaves no partial group');
select lives_ok($$select payments.ensure_open_period('2026-11-01')$$, 'period generation also ensures organization payment settings');
select is((select count(*)::integer from payments.settings where organization_id = '11000000-0000-0000-0000-000000000001'), 1, 'default payment settings are present');
reset role;

insert into payments.billing_periods(organization_id, period, status)
values ('11000000-0000-0000-0000-000000000001', '2026-08-01', 'open');
insert into payments.student_charges(id, organization_id, student_id, period, calculated_amount_cents)
values ('18000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '2026-08-01', 5000);
insert into payments.student_transactions(id, charge_id, amount_cents, method, created_by)
values ('19000000-0000-0000-0000-000000000001', '18000000-0000-0000-0000-000000000001', 1000, 'cash', '13000000-0000-0000-0000-000000000001');
select throws_ok(
  $$update payments.student_charges set override_amount_cents = 500, override_reason = 'too low' where id = '18000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'charge override cannot be lower than recorded payments'
);
update payments.billing_periods set status = 'closed', closed_at = now()
where organization_id = '11000000-0000-0000-0000-000000000001' and period = '2026-08-01';
select throws_ok(
  $$update payments.billing_periods set status = 'open' where organization_id = '11000000-0000-0000-0000-000000000001' and period = '2026-08-01'$$,
  '55000', null, 'closed billing period cannot be reopened'
);
select throws_ok(
  $$update payments.student_charges set override_amount_cents = 4000, override_reason = 'closed' where id = '18000000-0000-0000-0000-000000000001'$$,
  '55000', null, 'charge cannot be changed after period close'
);
select throws_ok(
  $$update payments.student_transactions set note = 'changed' where id = '19000000-0000-0000-0000-000000000001'$$,
  '55000', null, 'payment cannot be edited after period close'
);
select throws_ok(
  $$delete from payments.student_transactions where id = '19000000-0000-0000-0000-000000000001'$$,
  '55000', null, 'payment cannot be deleted after period close'
);

select * from finish();
rollback;
