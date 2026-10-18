begin;
select plan(6);

insert into core.organizations(id, name, slug) values
  ('31000000-0000-0000-0000-000000000001', 'Teacher management A', 'teacher-management-a'),
  ('31000000-0000-0000-0000-000000000002', 'Teacher management B', 'teacher-management-b');
insert into core.clubs(id, organization_id, name, slug, municipality, timezone) values
  ('32000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Club one', 'teacher-club-one', 'Madrid', 'Europe/Madrid'),
  ('32000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', 'Club two', 'teacher-club-two', 'Pioz', 'Europe/Madrid'),
  ('32000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000002', 'Foreign club', 'teacher-club-foreign', 'Toledo', 'Europe/Madrid');
insert into core.module_activations(organization_id, module_id, enabled)
values ('31000000-0000-0000-0000-000000000001', 'classes', true);
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('33000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-management-admin@example.invalid', '', now(), '{"organization_id":"31000000-0000-0000-0000-000000000001","role":"admin"}', '{"full_name":"Admin"}'),
  ('33000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teacher-management-teacher@example.invalid', '', now(), '{"organization_id":"31000000-0000-0000-0000-000000000001","role":"teacher"}', '{"full_name":"Old name"}');
insert into core.club_teachers(club_id, teacher_id)
values ('32000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000002');

set local role authenticated;
set local request.jwt.claim.sub = '33000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"33000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"organization_id":"31000000-0000-0000-0000-000000000001","role":"admin"}}';

select lives_ok($$select core.update_teacher('33000000-0000-0000-0000-000000000002', 'Updated teacher', '555-0101', array['32000000-0000-0000-0000-000000000002'::uuid])$$, 'an admin can update teacher identity and club assignments');
select is((select full_name from core.profiles where id = '33000000-0000-0000-0000-000000000002'), 'Updated teacher', 'teacher name is updated');
select is((select phone from core.profiles where id = '33000000-0000-0000-0000-000000000002'), '555-0101', 'teacher phone is stored');
select is((select club_id from core.club_teachers where teacher_id = '33000000-0000-0000-0000-000000000002'), '32000000-0000-0000-0000-000000000002'::uuid, 'assignment moves from the old club to the selected club');
select throws_ok($$select core.update_teacher('33000000-0000-0000-0000-000000000002', 'Must roll back', '555-0102', array['32000000-0000-0000-0000-000000000003'::uuid])$$, '23514', null, 'an admin cannot assign a teacher to a foreign club');
select is((select full_name from core.profiles where id = '33000000-0000-0000-0000-000000000002'), 'Updated teacher', 'failed assignment does not partially update the teacher');

select * from finish();
rollback;
