-- Safe to run repeatedly. Account rows are never deleted by this seed.
insert into core.organizations(id,name,slug)
values ('00000000-0000-0000-0000-000000000001','AprendePadel Academy','aprendepadel-academy')
on conflict(id) do update set name=excluded.name,slug=excluded.slug;

insert into payments.settings(organization_id)
values ('00000000-0000-0000-0000-000000000001') on conflict do nothing;

insert into core.clubs(id,organization_id,name,slug,municipality,timezone) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Club de Ambite','ambite','Ambite','Europe/Madrid'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Club de Pioz','pioz','Pioz','Europe/Madrid'),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Club de Pozuelo del Rey','pozuelo-del-rey','Pozuelo del Rey','Europe/Madrid')
on conflict(id) do update set name=excluded.name,slug=excluded.slug,municipality=excluded.municipality,timezone=excluded.timezone;

-- Only trusted app_metadata is set by the seed; user_metadata is display-only.
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || jsonb_build_object(
  'organization_id','00000000-0000-0000-0000-000000000001',
  'role',case email when 'pabloavila106@gmail.com' then 'admin' else 'teacher' end
)
where email in ('pabloavila106@gmail.com','marta.sanchez@aprendepadel.com','diego.martin@aprendepadel.com','laura.garcia@aprendepadel.com');

update core.profiles p set role = (u.raw_app_meta_data->>'role')::core.app_role
from auth.users u where u.id=p.id and p.organization_id='00000000-0000-0000-0000-000000000001'
  and u.raw_app_meta_data->>'role' in ('admin','teacher','student');

insert into core.profiles(id,organization_id,full_name,email,role)
select u.id,'00000000-0000-0000-0000-000000000001',
       coalesce(u.raw_user_meta_data->>'full_name',case u.email
         when 'pabloavila106@gmail.com' then 'Pablo Avila'
         when 'marta.sanchez@aprendepadel.com' then 'Marta Sánchez'
         when 'diego.martin@aprendepadel.com' then 'Diego Martín'
         when 'laura.garcia@aprendepadel.com' then 'Laura García' end),u.email,
       (u.raw_app_meta_data->>'role')::core.app_role
from auth.users u
where u.raw_app_meta_data->>'organization_id'='00000000-0000-0000-0000-000000000001'
  and u.raw_app_meta_data->>'role' in ('admin','teacher','student')
on conflict(id) do update set organization_id=excluded.organization_id,full_name=excluded.full_name,role=excluded.role;

insert into core.club_teachers(club_id,teacher_id)
select c.id,p.id from core.clubs c cross join core.profiles p
where c.organization_id='00000000-0000-0000-0000-000000000001' and p.organization_id=c.organization_id and p.role='teacher'
on conflict do nothing;

insert into core.module_activations(organization_id,module_id,enabled) values
('00000000-0000-0000-0000-000000000001','classes',true),
('00000000-0000-0000-0000-000000000001','courts',false),
('00000000-0000-0000-0000-000000000001','payments',true),
('00000000-0000-0000-0000-000000000001','inventory',false)
on conflict(organization_id,module_id) do update set enabled=excluded.enabled;

insert into payments.settings(organization_id) values ('00000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into payments.teacher_rates(teacher_id)
select id from core.profiles where organization_id='00000000-0000-0000-0000-000000000001' and role='teacher'
on conflict do nothing;

insert into payments.tariffs(id,organization_id,name,category,monthly_amount_cents) values
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Adultos mensual · demo','adult',7000),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Infantil mensual · demo','child',5000)
on conflict(id) do update set name=excluded.name,category=excluded.category,monthly_amount_cents=excluded.monthly_amount_cents;

insert into core.students(id,organization_id,club_id,first_name,last_name,birth_date,category,gender,level,email,active) values
('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Lucía','Gómez','1990-03-12','adult','female','medio','lucia.gomez@example.com',true),
('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Javier','Ruiz','1988-11-04','adult','male','principiante','javier.ruiz@example.com',true),
('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Nora','Serrano','2015-07-21','child','female','iniciacion','nora.serrano@example.com',true),
('30000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Hugo','Martínez','2015-05-14','child','male','iniciacion','hugo.martinez@example.com',true),
('30000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Alba','Navarro','1994-01-12','adult','female','avanzado','alba.navarro@example.com',true),
('30000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Pablo','López','1992-09-09','adult','male','medio','pablo.lopez@example.com',true),
('30000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Emma','Castro','2014-06-05','child','female','principiante','emma.castro@example.com',true),
('30000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Leo','Vega','2016-02-01','child','male','iniciacion','leo.vega@example.com',true),
('30000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Sofía','Santos','1991-10-21','adult','female','competicion','sofia.santos@example.com',true),
('30000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Mario','Iglesias','1987-02-15','adult','male','avanzado','mario.iglesias@example.com',true),
('30000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Valeria','Molina','2014-11-19','child','female','medio','valeria.molina@example.com',true),
('30000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Daniel','Ortega','2015-03-02','child','male','principiante','daniel.ortega@example.com',true)
on conflict(id) do update set first_name=excluded.first_name,last_name=excluded.last_name,birth_date=excluded.birth_date,category=excluded.category,gender=excluded.gender,level=excluded.level,email=excluded.email,active=true;

insert into payments.student_tariffs(id,student_id,tariff_id,starts_on) values
('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000004','30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000006','20000000-0000-0000-0000-000000000001',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000007','30000000-0000-0000-0000-000000000007','20000000-0000-0000-0000-000000000002',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000008','30000000-0000-0000-0000-000000000008','20000000-0000-0000-0000-000000000002',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000009','20000000-0000-0000-0000-000000000001',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000010','30000000-0000-0000-0000-000000000010','20000000-0000-0000-0000-000000000001',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000011','30000000-0000-0000-0000-000000000011','20000000-0000-0000-0000-000000000002',date_trunc('month',current_date)::date),
('40000000-0000-0000-0000-000000000012','30000000-0000-0000-0000-000000000012','20000000-0000-0000-0000-000000000002',date_trunc('month',current_date)::date)
on conflict(id) do nothing;

with group_seed(id,club_id,teacher_name,name,category,level,weekday,start_time,duration_minutes) as (values
('50000000-0000-0000-0000-000000000001'::uuid,'10000000-0000-0000-0000-000000000001'::uuid,'Marta Sánchez','Grupo iniciación infantil','child'::core.student_category,'iniciacion'::core.student_level,2::smallint,'17:00'::time,60::smallint),
('50000000-0000-0000-0000-000000000002'::uuid,'10000000-0000-0000-0000-000000000002'::uuid,'Diego Martín','Nivel medio adultos','adult'::core.student_category,'medio'::core.student_level,3::smallint,'18:30'::time,60::smallint),
('50000000-0000-0000-0000-000000000003'::uuid,'10000000-0000-0000-0000-000000000003'::uuid,'Laura García','Tecnificación competición','adult'::core.student_category,'competicion'::core.student_level,5::smallint,'20:00'::time,90::smallint))
insert into classes.groups(id,organization_id,club_id,teacher_id,name,category,level,weekday,start_time,duration_minutes,capacity,starts_on,ends_on)
select gs.id,'00000000-0000-0000-0000-000000000001',gs.club_id,p.id,gs.name,gs.category,gs.level,gs.weekday,gs.start_time,gs.duration_minutes,8,current_date-30,current_date+90
from group_seed gs join core.profiles p on p.full_name=gs.teacher_name and p.organization_id='00000000-0000-0000-0000-000000000001'
on conflict(id) do update set teacher_id=excluded.teacher_id,name=excluded.name,starts_on=excluded.starts_on,ends_on=excluded.ends_on;

insert into classes.group_members(group_id,student_id,starts_on)
select '50000000-0000-0000-0000-000000000001',id,current_date-30 from core.students where id in ('30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000004') and exists(select 1 from classes.groups where id='50000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into classes.group_members(group_id,student_id,starts_on)
select '50000000-0000-0000-0000-000000000002',id,current_date-30 from core.students where id in ('30000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000006') and exists(select 1 from classes.groups where id='50000000-0000-0000-0000-000000000002') on conflict do nothing;
insert into classes.group_members(group_id,student_id,starts_on)
select '50000000-0000-0000-0000-000000000003',id,current_date-30 from core.students where id in ('30000000-0000-0000-0000-000000000009','30000000-0000-0000-0000-000000000010') and exists(select 1 from classes.groups where id='50000000-0000-0000-0000-000000000003') on conflict do nothing;

insert into classes.sessions(id,organization_id,club_id,group_id,teacher_id,category,starts_at,ends_at,status)
select gen_random_uuid(),g.organization_id,g.club_id,g.id,g.teacher_id,g.category,
       ((d::date + g.start_time) at time zone c.timezone),
       ((d::date + g.start_time + make_interval(mins=>g.duration_minutes)) at time zone c.timezone),
       case when d::date < current_date then 'completed'::classes.session_status else 'pending'::classes.session_status end
from classes.groups g join core.clubs c on c.id=g.club_id
cross join lateral generate_series(current_date-interval '30 days',current_date+interval '14 days',interval '1 day') d
where extract(dow from d)::int=g.weekday
on conflict(group_id,starts_at) where group_id is not null do nothing;
insert into classes.session_students(session_id,student_id)
select s.id,gm.student_id from classes.sessions s join classes.group_members gm on gm.group_id=s.group_id
where s.group_id is not null and s.starts_at >= (gm.starts_on::timestamp at time zone 'Europe/Madrid') and (gm.ends_on is null or s.starts_at < ((gm.ends_on+1)::timestamp at time zone 'Europe/Madrid'))
on conflict do nothing;
insert into classes.attendance(session_id,student_id,status,marked_at)
select s.id,ss.student_id,'present',now() from classes.sessions s join classes.session_students ss on ss.session_id=s.id where s.status='completed'
on conflict do nothing;
