begin;
select plan(13);

insert into core.organizations(id, name, slug) values
  ('41000000-0000-0000-0000-000000000001', 'Payments reporting test', 'payments-reporting-test');
insert into core.clubs(id, organization_id, name, slug, municipality, timezone) values
  ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'Billing club', 'billing-club', 'Madrid', 'Europe/Madrid');
insert into core.module_activations(organization_id, module_id, enabled) values
  ('41000000-0000-0000-0000-000000000001', 'classes', true),
  ('41000000-0000-0000-0000-000000000001', 'payments', true);
insert into payments.settings(organization_id) values ('41000000-0000-0000-0000-000000000001');
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('43000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payments-admin@example.invalid', '', now(), '{"organization_id":"41000000-0000-0000-0000-000000000001","role":"admin"}', '{"full_name":"Payments Admin"}'),
  ('43000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payments-teacher@example.invalid', '', now(), '{"organization_id":"41000000-0000-0000-0000-000000000001","role":"teacher"}', '{"full_name":"Payments Teacher"}'),
  ('43000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stale-teacher@example.invalid', '', now(), '{"organization_id":"41000000-0000-0000-0000-000000000001","role":"teacher"}', '{"full_name":"Stale Teacher"}');
insert into core.club_teachers(club_id, teacher_id) values
  ('42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002'),
  ('42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003');
insert into core.students(id, organization_id, club_id, first_name, last_name, birth_date, category, active) values
  ('44000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Active', 'Student', '1990-01-01', 'adult', true),
  ('44000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Inactive', 'Student', '1990-01-01', 'adult', true),
  ('44000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'No', 'Amount', '1990-01-01', 'adult', true);
insert into payments.tariffs(id, organization_id, name, category, monthly_amount_cents) values
  ('45000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'Monthly', 'adult', 5000);
insert into payments.student_tariffs(student_id, tariff_id, starts_on) values
  ('44000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '2026-01-01'),
  ('44000000-0000-0000-0000-000000000002', '45000000-0000-0000-0000-000000000001', '2026-01-01');
update core.students set active = false where id = '44000000-0000-0000-0000-000000000002';
insert into payments.student_charges(id, organization_id, student_id, period, calculated_amount_cents) values
  ('46000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', '2026-10-01', 5000),
  ('46000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000002', '2026-10-01', 4000);
insert into payments.student_transactions(id, charge_id, amount_cents, method, created_by) values
  ('47000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 1000, 'cash', '43000000-0000-0000-0000-000000000001');
insert into classes.sessions(id, organization_id, club_id, teacher_id, category, starts_at, ends_at, status) values
  ('48000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002', 'adult', '2026-10-15 17:00+00', '2026-10-15 18:00+00', 'completed');
insert into classes.session_students(session_id, student_id)
values ('48000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001');
insert into payments.teacher_settlements(id, organization_id, teacher_id, period, calculated_amount_cents) values
  ('49000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002', '2026-10-01', 3000),
  ('49000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003', '2026-10-01', 2000);
insert into payments.teacher_settlement_lines(settlement_id, session_id, session_starts_at, duration_minutes, enrolled_count, rate_per_hour_cents, amount_cents) values
  ('49000000-0000-0000-0000-000000000001', '48000000-0000-0000-0000-000000000001', '2026-10-15 17:00+00', 60, 2, 3000, 3000);
insert into payments.teacher_transactions(id, settlement_id, amount_cents, method, created_by) values
  ('4a000000-0000-0000-0000-000000000001', '49000000-0000-0000-0000-000000000001', 500, 'cash', '43000000-0000-0000-0000-000000000001');

set local role authenticated;
set local request.jwt.claim.sub = '43000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"43000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"organization_id":"41000000-0000-0000-0000-000000000001","role":"admin"}}';

select lives_ok($$select payments.generate_period_payments('2026-10-01')$$, 'period generation reconciles stale rows');
select is((select count(*)::integer from payments.student_charges where id = '46000000-0000-0000-0000-000000000002'), 0, 'stale student charge without payments is removed');
select is((select count(*)::integer from payments.teacher_settlements where id = '49000000-0000-0000-0000-000000000002'), 0, 'stale teacher settlement without transactions is removed');
insert into payments.student_charges(id, organization_id, student_id, period, calculated_amount_cents)
values ('46000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000003', '2026-10-01', 0);
select is((select student_due_cents from payments.period_totals('2026-10-01')), 5000::bigint, 'period totals cover all generated student charges');
select is((select student_paid_cents from payments.period_totals('2026-10-01')), 1000::bigint, 'period totals include collected transactions');
select is((select total_count from payments.period_payment_rows('2026-10-01', 'student', 'partial', 'active student', 50, 0)), 1::bigint, 'student payment rows filter by name and payment status');
select is((select total_count from payments.period_payment_rows('2026-10-01', 'teacher', 'partial', 'payments teacher', 50, 0)), 1::bigint, 'teacher payment rows filter by name and payment status');
select is((select total_count from payments.period_payment_rows('2026-10-01', 'student', 'none', null, 50, 0)), 1::bigint, 'zero-value charges have their own payment status');
select is((select students_without_tariff from core.dashboard_action_metrics('2026-10-01')), 1::bigint, 'dashboard counts active students without a current tariff');
select is((select pending_attendance_sessions from core.dashboard_action_metrics('2026-10-01')), 1::bigint, 'dashboard counts completed sessions with unmarked attendance');
select is((select outstanding_student_cents from core.dashboard_action_metrics('2026-10-01')), 4000::bigint, 'dashboard reports the outstanding amount for the whole period');
select throws_ok($$select classes.set_session_status('48000000-0000-0000-0000-000000000001', 'cancelled', 'Already settled')$$, '55000', null, 'a session included in a settlement cannot change status');
select throws_ok($$select classes.reschedule_session('48000000-0000-0000-0000-000000000001', '2026-10-16 18:00'::timestamp, 60::smallint, null::text)$$, '55000', null, 'a session included in a settlement cannot be rescheduled');

select * from finish();
rollback;
