create schema if not exists core;
create schema if not exists classes;
create schema if not exists courts;
create schema if not exists payments;
create schema if not exists inventory;

create type core.app_role as enum ('admin', 'teacher', 'student');
create type core.student_category as enum ('child', 'adult');
create type core.student_gender as enum ('female', 'male', 'other', 'unspecified');
create type core.student_level as enum ('iniciacion', 'principiante', 'medio', 'avanzado', 'competicion');
create type classes.session_status as enum ('pending', 'completed', 'cancelled');
create type classes.attendance_status as enum ('present', 'absent', 'justified');

create table core.organizations (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, active boolean not null default true, created_at timestamptz not null default now());
create table core.clubs (id uuid primary key default gen_random_uuid(), organization_id uuid not null references core.organizations(id) on delete cascade, name text not null, slug text not null, municipality text not null, address text, timezone text not null default 'Europe/Madrid', active boolean not null default true, created_at timestamptz not null default now(), unique (organization_id, slug));
create table core.profiles (id uuid primary key references auth.users(id) on delete cascade, organization_id uuid not null references core.organizations(id) on delete cascade, full_name text not null, email text, phone text, role core.app_role not null default 'teacher', active boolean not null default true, created_at timestamptz not null default now());
create table core.club_teachers (club_id uuid not null references core.clubs(id) on delete cascade, teacher_id uuid not null references core.profiles(id) on delete cascade, primary key (club_id, teacher_id));
create table core.students (id uuid primary key default gen_random_uuid(), organization_id uuid not null references core.organizations(id) on delete cascade, club_id uuid not null references core.clubs(id) on delete restrict, first_name text not null, last_name text not null, birth_date date not null, category core.student_category not null, gender core.student_gender not null default 'unspecified', email text, phone text, level core.student_level not null default 'iniciacion', notes text, active boolean not null default true, created_at timestamptz not null default now());
create table core.guardians (id uuid primary key default gen_random_uuid(), organization_id uuid not null references core.organizations(id) on delete cascade, profile_id uuid references core.profiles(id) on delete set null, full_name text not null, email text, phone text);
create table core.student_guardians (student_id uuid not null references core.students(id) on delete cascade, guardian_id uuid not null references core.guardians(id) on delete cascade, relation text, is_primary boolean not null default false, primary key (student_id, guardian_id));
create table core.student_accounts (student_id uuid primary key references core.students(id) on delete cascade, profile_id uuid not null unique references core.profiles(id) on delete cascade);
create table core.module_activations (organization_id uuid not null references core.organizations(id) on delete cascade, module_id text not null check (module_id in ('classes','courts','payments','inventory')), enabled boolean not null default false, plan text not null default 'base', settings jsonb not null default '{}', primary key (organization_id, module_id));

create table classes.groups (id uuid primary key default gen_random_uuid(), organization_id uuid not null references core.organizations(id) on delete cascade, club_id uuid not null references core.clubs(id) on delete restrict, teacher_id uuid not null references core.profiles(id) on delete restrict, name text not null, category core.student_category not null, level core.student_level not null, weekday smallint not null check (weekday between 0 and 6), start_time time not null, duration_minutes smallint not null default 60 check (duration_minutes between 30 and 180), capacity smallint not null default 8 check (capacity > 0), starts_on date not null default current_date, ends_on date, active boolean not null default true, check (ends_on is null or ends_on >= starts_on));
create table classes.group_members (group_id uuid not null references classes.groups(id) on delete cascade, student_id uuid not null references core.students(id) on delete cascade, starts_on date not null default current_date, ends_on date, primary key (group_id, student_id), check (ends_on is null or ends_on >= starts_on));
create table classes.sessions (id uuid primary key default gen_random_uuid(), organization_id uuid not null references core.organizations(id) on delete cascade, club_id uuid not null references core.clubs(id) on delete restrict, group_id uuid references classes.groups(id) on delete set null, teacher_id uuid not null references core.profiles(id) on delete restrict, starts_at timestamptz not null, ends_at timestamptz not null, status classes.session_status not null default 'pending', cancellation_reason text, notes text, court_id uuid, created_at timestamptz not null default now(), check (ends_at > starts_at), check ((status = 'cancelled' and cancellation_reason is not null) or status <> 'cancelled'));
create table classes.session_students (session_id uuid not null references classes.sessions(id) on delete cascade, student_id uuid not null references core.students(id) on delete cascade, primary key (session_id, student_id));
create table classes.attendance (session_id uuid not null, student_id uuid not null, status classes.attendance_status not null default 'absent', comment text, marked_by uuid references core.profiles(id) on delete set null, marked_at timestamptz, primary key (session_id, student_id), foreign key (session_id, student_id) references classes.session_students(session_id, student_id) on delete cascade);

create index clubs_org_idx on core.clubs(organization_id);
create index students_club_idx on core.students(club_id);
create index groups_club_idx on classes.groups(club_id);
create index sessions_org_start_idx on classes.sessions(organization_id, starts_at);
create index sessions_teacher_start_idx on classes.sessions(teacher_id, starts_at);
create index session_students_student_idx on classes.session_students(student_id);

create or replace function core.current_org() returns uuid language sql stable as $$ select nullif((select auth.jwt()->'app_metadata'->>'organization_id'), '')::uuid $$;
create or replace function core.current_role() returns core.app_role language sql stable as $$ select nullif((select auth.jwt()->'app_metadata'->>'role'), '')::core.app_role $$;
create or replace function core.is_admin() returns boolean language sql stable as $$ select core.current_role() = 'admin' $$;
create or replace function core.module_enabled(module_name text) returns boolean language sql stable security invoker as $$ select exists (select 1 from core.module_activations where organization_id = core.current_org() and module_id = module_name and enabled) $$;
create or replace function core.handle_new_user() returns trigger language plpgsql security definer set search_path = core, public as $$ begin insert into core.profiles(id, organization_id, full_name, email, role) values (new.id, nullif(new.raw_app_meta_data->>'organization_id','')::uuid, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, coalesce(nullif(new.raw_app_meta_data->>'role','')::core.app_role, 'student')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure core.handle_new_user();

alter table core.organizations enable row level security; alter table core.clubs enable row level security; alter table core.profiles enable row level security; alter table core.club_teachers enable row level security; alter table core.students enable row level security; alter table core.guardians enable row level security; alter table core.student_guardians enable row level security; alter table core.student_accounts enable row level security; alter table core.module_activations enable row level security;
alter table classes.groups enable row level security; alter table classes.group_members enable row level security; alter table classes.sessions enable row level security; alter table classes.session_students enable row level security; alter table classes.attendance enable row level security;

create policy org_scope on core.organizations for select to authenticated using (id = core.current_org());
create policy admin_clubs on core.clubs for all to authenticated using (organization_id = core.current_org() and core.is_admin()) with check (organization_id = core.current_org());
create policy member_clubs on core.clubs for select to authenticated using (organization_id = core.current_org());
create policy admin_profiles on core.profiles for all to authenticated using (organization_id = core.current_org() and core.is_admin()) with check (organization_id = core.current_org());
create policy self_profile on core.profiles for select to authenticated using (id = auth.uid() and organization_id = core.current_org());
create policy admin_students on core.students for all to authenticated using (organization_id = core.current_org() and core.is_admin()) with check (organization_id = core.current_org());
create policy scoped_students on core.students for select to authenticated using (organization_id = core.current_org());
create policy admin_modules on core.module_activations for all to authenticated using (organization_id = core.current_org() and core.is_admin()) with check (organization_id = core.current_org());
create policy read_modules on core.module_activations for select to authenticated using (organization_id = core.current_org());
create policy classes_admin_groups on classes.groups for all to authenticated using (organization_id = core.current_org() and core.is_admin() and core.module_enabled('classes')) with check (organization_id = core.current_org() and core.module_enabled('classes'));
create policy classes_read_groups on classes.groups for select to authenticated using (organization_id = core.current_org() and core.module_enabled('classes'));
create policy classes_admin_sessions on classes.sessions for all to authenticated using (organization_id = core.current_org() and core.is_admin() and core.module_enabled('classes')) with check (organization_id = core.current_org() and core.module_enabled('classes'));
create policy classes_read_sessions on classes.sessions for select to authenticated using (organization_id = core.current_org() and core.module_enabled('classes'));
create policy classes_teacher_update on classes.sessions for update to authenticated using (organization_id = core.current_org() and teacher_id = auth.uid() and core.module_enabled('classes')) with check (organization_id = core.current_org() and teacher_id = auth.uid());
create policy classes_admin_session_students on classes.session_students for all to authenticated using (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and core.is_admin() and core.module_enabled('classes'))) with check (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and core.module_enabled('classes')));
create policy classes_read_session_students on classes.session_students for select to authenticated using (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and core.module_enabled('classes')));
create policy classes_admin_attendance on classes.attendance for all to authenticated using (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and core.is_admin() and core.module_enabled('classes'))) with check (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and core.module_enabled('classes')));
create policy classes_teacher_attendance on classes.attendance for insert to authenticated with check (exists (select 1 from classes.sessions s where s.id = session_id and s.organization_id = core.current_org() and s.teacher_id = auth.uid() and core.module_enabled('classes')));

grant usage on schema core, classes to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema core, classes to anon, authenticated, service_role;
revoke all on all tables in schema courts, payments, inventory from anon, authenticated;
