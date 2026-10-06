-- Clean, reproducible baseline for AprendePadel Academy.
-- Auth users are preserved by remote reset procedures; only application schemas are recreated.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist;

drop function if exists public.generate_sessions(uuid, date, date) cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.settlement_lines, public.teacher_settlements, public.payments, public.invoice_lines, public.invoices,
  public.attendance, public.enrollments, public.group_members, public.teacher_groups, public.family_members, public.families,
  public.tariffs, public.students, public.sessions, public.profiles, public.schools cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.is_teacher() cascade;
drop type if exists public.user_role cascade;
drop type if exists public.class_type cascade;
drop type if exists public.class_status cascade;
drop type if exists public.attendance_status cascade;
drop type if exists public.student_level cascade;
drop type if exists public.student_gender cascade;
drop type if exists public.invoice_status cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.settlement_status cascade;
drop schema if exists payments cascade;
drop schema if exists classes cascade;
drop schema if exists core cascade;
create schema core;
create schema classes;
create schema payments;

create type core.app_role as enum ('admin', 'teacher', 'student');
create type core.student_category as enum ('child', 'adult');
create type core.student_gender as enum ('female', 'male', 'other', 'unspecified');
create type core.student_level as enum ('iniciacion', 'principiante', 'medio', 'avanzado', 'competicion');
create type classes.session_status as enum ('pending', 'completed', 'cancelled');
create type classes.attendance_status as enum ('present', 'absent', 'justified');
create type payments.method as enum ('cash', 'bizum');

create table core.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table core.clubs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  municipality text not null,
  address text,
  timezone text not null default 'Europe/Madrid',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create table core.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  role core.app_role not null default 'student',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table core.club_teachers (
  club_id uuid not null references core.clubs(id) on delete cascade,
  teacher_id uuid not null references core.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (club_id, teacher_id)
);
create table core.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  club_id uuid not null references core.clubs(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  birth_date date not null check (birth_date <= current_date),
  category core.student_category not null,
  gender core.student_gender not null default 'unspecified',
  email text,
  phone text,
  level core.student_level not null default 'iniciacion',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table core.student_accounts (
  student_id uuid primary key references core.students(id) on delete cascade,
  profile_id uuid not null unique references core.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table core.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  profile_id uuid references core.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table core.student_guardians (
  student_id uuid not null references core.students(id) on delete cascade,
  guardian_id uuid not null references core.guardians(id) on delete cascade,
  relation text,
  is_primary boolean not null default false,
  primary key (student_id, guardian_id)
);
create table core.module_activations (
  organization_id uuid not null references core.organizations(id) on delete cascade,
  module_id text not null check (module_id in ('classes','courts','payments','inventory')),
  enabled boolean not null default false,
  plan text not null default 'base',
  settings jsonb not null default '{}',
  primary key (organization_id, module_id)
);

create table classes.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  club_id uuid not null references core.clubs(id) on delete restrict,
  teacher_id uuid not null references core.profiles(id) on delete restrict,
  name text not null,
  category core.student_category not null,
  level core.student_level not null,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 30 and 180),
  capacity smallint not null default 8 check (capacity between 1 and 16),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create table classes.group_members (
  group_id uuid not null references classes.groups(id) on delete cascade,
  student_id uuid not null references core.students(id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now(),
  primary key (group_id, student_id),
  check (ends_on is null or ends_on >= starts_on)
);
create or replace function classes.validate_group_member() returns trigger
language plpgsql set search_path = ''
as $$
declare group_row classes.groups%rowtype; student_row core.students%rowtype; member_count integer;
begin
  select * into group_row from classes.groups where id=new.group_id;
  select * into student_row from core.students where id=new.student_id;
  if group_row.id is null or student_row.id is null or group_row.organization_id<>student_row.organization_id or group_row.club_id<>student_row.club_id or group_row.category<>student_row.category then
    raise exception using errcode='23514', message='El alumno debe ser de la misma organización, club y categoría que el grupo';
  end if;
  select count(*) into member_count from classes.group_members where group_id=new.group_id and student_id<>new.student_id and (ends_on is null or ends_on>=current_date);
  if member_count>=group_row.capacity then raise exception using errcode='23514', message='El grupo ha alcanzado el aforo'; end if;
  return new;
end
$$;
create trigger validate_group_member before insert or update on classes.group_members for each row execute function classes.validate_group_member();
create table classes.sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  club_id uuid not null references core.clubs(id) on delete restrict,
  group_id uuid references classes.groups(id) on delete set null,
  teacher_id uuid not null references core.profiles(id) on delete restrict,
  category core.student_category not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status classes.session_status not null default 'pending',
  cancellation_reason text,
  notes text,
  court_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((status = 'cancelled' and nullif(trim(cancellation_reason), '') is not null) or status <> 'cancelled')
);
create unique index sessions_group_start_unique_idx on classes.sessions(group_id, starts_at) where group_id is not null;
alter table classes.sessions add constraint sessions_teacher_no_overlap
  exclude using gist (teacher_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
  where (status <> 'cancelled');
create table classes.session_students (
  session_id uuid not null references classes.sessions(id) on delete cascade,
  student_id uuid not null references core.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, student_id)
);
create table classes.attendance (
  session_id uuid not null,
  student_id uuid not null,
  status classes.attendance_status not null default 'absent',
  comment text,
  marked_by uuid references core.profiles(id) on delete set null,
  marked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (session_id, student_id),
  foreign key (session_id, student_id) references classes.session_students(session_id, student_id) on delete cascade
);

create table payments.settings (
  organization_id uuid primary key references core.organizations(id) on delete cascade,
  teacher_rate_below_cents integer not null default 1200 check (teacher_rate_below_cents >= 0),
  teacher_rate_threshold_cents integer not null default 1500 check (teacher_rate_threshold_cents >= 0),
  teacher_student_threshold smallint not null default 3 check (teacher_student_threshold >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table payments.teacher_rates (
  teacher_id uuid primary key references core.profiles(id) on delete cascade,
  below_threshold_cents integer check (below_threshold_cents is null or below_threshold_cents >= 0),
  threshold_rate_cents integer check (threshold_rate_cents is null or threshold_rate_cents >= 0),
  student_threshold smallint check (student_threshold is null or student_threshold >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table payments.tariffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  name text not null,
  category core.student_category not null,
  monthly_amount_cents integer not null check (monthly_amount_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, category)
);
create table payments.student_tariffs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references core.students(id) on delete cascade,
  tariff_id uuid not null references payments.tariffs(id) on delete restrict,
  starts_on date not null,
  ends_on date,
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
alter table payments.student_tariffs add constraint student_tariffs_no_overlap
  exclude using gist (student_id with =, daterange(starts_on, coalesce(ends_on,'infinity'::date), '[]') with &&);
create table payments.billing_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  period date not null check (period = date_trunc('month', period)::date),
  status text not null default 'open' check (status in ('open','closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, period)
);
create table payments.student_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  student_id uuid not null references core.students(id) on delete restrict,
  period date not null check (period = date_trunc('month', period)::date),
  calculated_amount_cents integer not null default 0 check (calculated_amount_cents >= 0),
  override_amount_cents integer check (override_amount_cents is null or override_amount_cents >= 0),
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, period),
  check (override_amount_cents is null or nullif(trim(override_reason), '') is not null)
);
create table payments.student_charge_lines (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references payments.student_charges(id) on delete cascade,
  tariff_id uuid references payments.tariffs(id) on delete set null,
  tariff_name text not null,
  amount_cents integer not null check (amount_cents >= 0),
  created_at timestamptz not null default now()
);
create table payments.teacher_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  teacher_id uuid not null references core.profiles(id) on delete restrict,
  period date not null check (period = date_trunc('month', period)::date),
  calculated_amount_cents integer not null default 0 check (calculated_amount_cents >= 0),
  override_amount_cents integer check (override_amount_cents is null or override_amount_cents >= 0),
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, period),
  check (override_amount_cents is null or nullif(trim(override_reason), '') is not null)
);
create table payments.teacher_settlement_lines (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references payments.teacher_settlements(id) on delete cascade,
  session_id uuid not null,
  session_starts_at timestamptz not null,
  duration_minutes smallint not null,
  enrolled_count smallint not null,
  rate_per_hour_cents integer not null,
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  unique (settlement_id, session_id)
);
create table payments.student_transactions (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references payments.student_charges(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  method payments.method not null,
  paid_at timestamptz not null default now(),
  created_by uuid not null references core.profiles(id) on delete restrict,
  note text,
  created_at timestamptz not null default now()
);
create table payments.teacher_transactions (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references payments.teacher_settlements(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  method payments.method not null,
  paid_at timestamptz not null default now(),
  created_by uuid not null references core.profiles(id) on delete restrict,
  note text,
  created_at timestamptz not null default now()
);

create index clubs_org_idx on core.clubs(organization_id);
create index profiles_org_role_idx on core.profiles(organization_id, role);
create index students_org_idx on core.students(organization_id, active);
create index students_club_idx on core.students(club_id);
create index club_teachers_teacher_idx on core.club_teachers(teacher_id);
create index guardians_org_idx on core.guardians(organization_id);
create index guardians_profile_idx on core.guardians(profile_id) where profile_id is not null;
create index student_guardians_guardian_idx on core.student_guardians(guardian_id);
create index groups_org_idx on classes.groups(organization_id);
create index groups_club_idx on classes.groups(club_id, active);
create index groups_teacher_idx on classes.groups(teacher_id, active);
create index group_members_student_idx on classes.group_members(student_id);
create index sessions_org_start_idx on classes.sessions(organization_id, starts_at desc);
create index sessions_teacher_start_idx on classes.sessions(teacher_id, starts_at);
create index sessions_club_start_idx on classes.sessions(club_id, starts_at);
create index session_students_student_idx on classes.session_students(student_id);
create index attendance_marked_by_idx on classes.attendance(marked_by) where marked_by is not null;
create index student_tariffs_lookup_idx on payments.student_tariffs(student_id, starts_on, ends_on);
create index student_charges_period_idx on payments.student_charges(organization_id, period);
create index teacher_settlements_period_idx on payments.teacher_settlements(organization_id, period);
create index student_transactions_charge_idx on payments.student_transactions(charge_id, paid_at);
create index teacher_transactions_settlement_idx on payments.teacher_transactions(settlement_id, paid_at);

create or replace function core.current_org() returns uuid
language sql stable set search_path = ''
as $$ select nullif((select auth.jwt()->'app_metadata'->>'organization_id'), '')::uuid $$;
create or replace function core.current_app_role() returns core.app_role
language sql stable set search_path = ''
as $$ select nullif((select auth.jwt()->'app_metadata'->>'role'), '')::core.app_role $$;
create or replace function core.is_admin() returns boolean
language sql stable set search_path = ''
as $$ select (select core.current_app_role()) = 'admin'::core.app_role $$;
create or replace function core.module_enabled(module_name text) returns boolean
language sql stable set search_path = ''
as $$ select exists (select 1 from core.module_activations where organization_id = (select core.current_org()) and module_id = module_name and enabled) $$;
create or replace function core.set_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function core.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  org_id uuid;
  trusted_role core.app_role;
begin
  org_id := nullif(new.raw_app_meta_data->>'organization_id', '')::uuid;
  if org_id is null then return new; end if;
  begin trusted_role := coalesce(nullif(new.raw_app_meta_data->>'role','')::core.app_role, 'student'::core.app_role);
  exception when invalid_text_representation then trusted_role := 'student'::core.app_role; end;
  insert into core.profiles(id, organization_id, full_name, email, role)
  values (new.id, org_id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email, trusted_role)
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function core.handle_new_user();

create or replace function classes.validate_session_student_category() returns trigger
language plpgsql set search_path = ''
as $$
declare session_category core.student_category; student_category core.student_category;
begin
  select category into session_category from classes.sessions where id = new.session_id;
  select category into student_category from core.students where id = new.student_id;
  if session_category is null or student_category is null or session_category <> student_category then
    raise exception using errcode = '23514', message = 'El alumno debe pertenecer a la misma categoría que la clase';
  end if;
  return new;
end
$$;
create trigger validate_session_student_category before insert or update on classes.session_students
for each row execute function classes.validate_session_student_category();
create or replace function classes.validate_session_category_change() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if exists(select 1 from classes.session_students ss join core.students st on st.id=ss.student_id where ss.session_id=new.id and st.category<>new.category) then
    raise exception using errcode='23514', message='No se puede cambiar la categoría: hay alumnos de otra categoría inscritos';
  end if;
  return new;
end
$$;
create trigger validate_session_category_change before update of category on classes.sessions
for each row execute function classes.validate_session_category_change();
create or replace function classes.validate_student_category_change() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if exists(select 1 from classes.session_students ss join classes.sessions s on s.id=ss.session_id where ss.student_id=new.id and s.status<>'cancelled' and s.category<>new.category) then
    raise exception using errcode='23514', message='No se puede cambiar la categoría: el alumno está inscrito en clases de otra categoría';
  end if;
  return new;
end
$$;
create trigger validate_student_category_change before update of category on core.students
for each row execute function classes.validate_student_category_change();

create or replace function classes.generate_sessions(target_group_id uuid, range_start date, range_end date)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare g classes.groups%rowtype; tz text; d date; first_day date; last_day date; local_start timestamp; inserted_id uuid; total integer := 0;
begin
  if not (select core.is_admin()) then raise exception using errcode = '42501', message = 'Solo administración puede generar sesiones'; end if;
  if not (select core.module_enabled('classes')) then raise exception using errcode = '42501', message = 'Módulo de clases desactivado'; end if;
  if range_end < range_start or range_end - range_start > 366 then raise exception using errcode = '22023', message = 'El periodo debe abarcar como máximo 12 meses'; end if;
  select * into g from classes.groups where id = target_group_id and organization_id = (select core.current_org()) and active;
  if not found then raise exception using errcode = 'P0002', message = 'Grupo activo no encontrado'; end if;
  select timezone into tz from core.clubs where id = g.club_id and organization_id = g.organization_id;
  first_day := greatest(range_start, g.starts_on);
  last_day := least(range_end, coalesce(g.ends_on, range_end));
  if last_day < first_day then return 0; end if;
  d := first_day + ((g.weekday - extract(dow from first_day)::int + 7) % 7);
  while d <= last_day loop
    local_start := d + g.start_time;
    insert into classes.sessions(organization_id, club_id, group_id, teacher_id, category, starts_at, ends_at, status)
      values (g.organization_id, g.club_id, g.id, g.teacher_id, g.category, local_start at time zone tz, (local_start + make_interval(mins => g.duration_minutes)) at time zone tz, 'pending')
      on conflict (group_id, starts_at) where group_id is not null do nothing returning id into inserted_id;
    if inserted_id is not null then
      insert into classes.session_students(session_id, student_id)
      select inserted_id, gm.student_id from classes.group_members gm
      join core.students s on s.id = gm.student_id and s.category = g.category and s.club_id = g.club_id and s.active
      where gm.group_id = g.id and gm.starts_on <= d and (gm.ends_on is null or gm.ends_on >= d)
      on conflict do nothing;
      total := total + 1;
    end if;
    inserted_id := null;
    d := d + 7;
  end loop;
  return total;
end
$$;

create or replace function classes.create_session(p_club_id uuid, p_teacher_id uuid, p_category core.student_category, p_starts_at timestamptz, p_duration_minutes smallint, p_student_ids uuid[], p_notes text default null)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare org_id uuid := (select core.current_org()); session_id uuid; tz text; local_start timestamp; unique_students uuid[];
begin
  if not (select core.is_admin()) then raise exception using errcode='42501', message='Solo administración puede crear clases'; end if;
  if not (select core.module_enabled('classes')) then raise exception using errcode='42501', message='Módulo de clases desactivado'; end if;
  if p_duration_minutes not between 30 and 180 then raise exception using errcode='22023', message='Duración no válida'; end if;
  select timezone into tz from core.clubs where id=p_club_id and organization_id=org_id and active;
  if tz is null then raise exception using errcode='23503', message='Club no válido'; end if;
  if not exists (select 1 from core.profiles p join core.club_teachers ct on ct.teacher_id=p.id where p.id=p_teacher_id and p.organization_id=org_id and p.role='teacher' and p.active and ct.club_id=p_club_id) then raise exception using errcode='23503', message='Profesor no asignado al club'; end if;
  select coalesce(array_agg(distinct sid), array[]::uuid[]) into unique_students from unnest(coalesce(p_student_ids,array[]::uuid[])) sid;
  if cardinality(unique_students) > 16 then raise exception using errcode='22023', message='El aforo máximo es 16 alumnos'; end if;
  if exists (select 1 from core.students where id=any(unique_students) and (club_id<>p_club_id or category<>p_category or organization_id<>org_id or not active)) then raise exception using errcode='23514', message='Todos los alumnos deben estar activos en el club y categoría de la clase'; end if;
  local_start := p_starts_at at time zone tz;
  insert into classes.sessions(organization_id,club_id,teacher_id,category,starts_at,ends_at,notes)
  values(org_id,p_club_id,p_teacher_id,p_category,p_starts_at,p_starts_at+make_interval(mins=>p_duration_minutes),nullif(trim(p_notes),'')) returning id into session_id;
  insert into classes.session_students(session_id,student_id) select session_id, sid from unnest(unique_students) sid;
  return session_id;
end
$$;

create or replace function classes.set_session_status(p_session_id uuid, p_status classes.session_status, p_reason text default null)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not (select core.is_admin()) then raise exception using errcode='42501', message='Solo administración puede cambiar el estado'; end if;
  if p_status='cancelled' and nullif(trim(p_reason),'') is null then raise exception using errcode='22023', message='Indica el motivo de cancelación'; end if;
  update classes.sessions set status=p_status, cancellation_reason=case when p_status='cancelled' then trim(p_reason) else null end
    where id=p_session_id and organization_id=(select core.current_org()) and (select core.module_enabled('classes'));
  if not found then raise exception using errcode='P0002', message='Clase no encontrada'; end if;
end
$$;

create or replace function payments.ensure_open_period(p_period date) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare period_id uuid;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then raise exception using errcode='42501', message='No autorizado para pagos'; end if;
  if p_period <> date_trunc('month',p_period)::date then raise exception using errcode='22023', message='El periodo debe ser el primer día del mes'; end if;
  insert into payments.billing_periods(organization_id,period) values ((select core.current_org()),p_period)
    on conflict (organization_id,period) do update set period=excluded.period returning id into period_id;
  if exists(select 1 from payments.billing_periods where id=period_id and status='closed') then raise exception using errcode='55000', message='El periodo está cerrado'; end if;
  return period_id;
end
$$;

create or replace function payments.generate_student_charges(p_period date) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare org_id uuid := (select core.current_org()); period_id uuid; row record; v_charge_id uuid; made integer := 0;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then raise exception using errcode='42501', message='No autorizado para pagos'; end if;
  perform pg_advisory_xact_lock(hashtextextended(org_id::text||p_period::text,0));
  period_id := payments.ensure_open_period(p_period);
  for row in
    select distinct on (s.id) s.id student_id, st.id tariff_id, t.name tariff_name, t.monthly_amount_cents
    from core.students s join payments.student_tariffs st on st.student_id=s.id
    join payments.tariffs t on t.id=st.tariff_id and t.active
    where s.organization_id=org_id and s.active and st.starts_on < (p_period + interval '1 month')::date and coalesce(st.ends_on,'infinity'::date)>=p_period
    order by s.id, st.starts_on desc
  loop
    insert into payments.student_charges(organization_id,student_id,period,calculated_amount_cents)
      values(org_id,row.student_id,p_period,row.monthly_amount_cents)
      on conflict(student_id,period) do update set calculated_amount_cents=excluded.calculated_amount_cents,updated_at=now()
      where not exists(select 1 from payments.billing_periods where id=period_id and status='closed')
        and not exists(select 1 from payments.student_transactions stx where stx.charge_id=payments.student_charges.id)
      returning id into v_charge_id;
    if v_charge_id is not null then
      delete from payments.student_charge_lines scl where scl.charge_id=v_charge_id;
      insert into payments.student_charge_lines(charge_id,tariff_id,tariff_name,amount_cents) values(v_charge_id,row.tariff_id,row.tariff_name,row.monthly_amount_cents);
      made:=made+1;
    end if;
    v_charge_id:=null;
  end loop;
  return made;
end
$$;

create or replace function payments.generate_teacher_settlements(p_period date) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare org_id uuid := (select core.current_org()); period_id uuid; teacher_row record; v_settlement_id uuid; made integer:=0; month_start timestamptz;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then raise exception using errcode='42501', message='No autorizado para pagos'; end if;
  perform pg_advisory_xact_lock(hashtextextended(org_id::text||p_period::text,1));
  period_id:=payments.ensure_open_period(p_period);
  for teacher_row in select distinct s.teacher_id from classes.sessions s join core.clubs c on c.id=s.club_id where s.organization_id=org_id and (s.starts_at at time zone c.timezone)::date >= p_period and (s.starts_at at time zone c.timezone)::date < (p_period+interval '1 month')::date and s.status='completed'
  loop
    insert into payments.teacher_settlements(organization_id,teacher_id,period) values(org_id,teacher_row.teacher_id,p_period)
      on conflict(teacher_id,period) do update set updated_at=now() where not exists(select 1 from payments.billing_periods where id=period_id and status='closed') and not exists(select 1 from payments.teacher_transactions ttx where ttx.settlement_id=payments.teacher_settlements.id) returning id into v_settlement_id;
    if v_settlement_id is not null then
      delete from payments.teacher_settlement_lines tsl where tsl.settlement_id=v_settlement_id;
      insert into payments.teacher_settlement_lines(settlement_id,session_id,session_starts_at,duration_minutes,enrolled_count,rate_per_hour_cents,amount_cents)
      select v_settlement_id, s.id,s.starts_at,extract(epoch from (s.ends_at-s.starts_at))::int/60,count(ss.student_id)::smallint,
        case when count(ss.student_id)>=coalesce(tr.student_threshold,ps.teacher_student_threshold) then coalesce(tr.threshold_rate_cents,ps.teacher_rate_threshold_cents) else coalesce(tr.below_threshold_cents,ps.teacher_rate_below_cents) end,
        round((case when count(ss.student_id)>=coalesce(tr.student_threshold,ps.teacher_student_threshold) then coalesce(tr.threshold_rate_cents,ps.teacher_rate_threshold_cents) else coalesce(tr.below_threshold_cents,ps.teacher_rate_below_cents) end)::numeric * extract(epoch from (s.ends_at-s.starts_at)) / 3600)::int
      from classes.sessions s left join classes.session_students ss on ss.session_id=s.id
      join payments.settings ps on ps.organization_id=s.organization_id left join payments.teacher_rates tr on tr.teacher_id=s.teacher_id
      join core.clubs c on c.id=s.club_id
      where s.teacher_id=teacher_row.teacher_id and s.organization_id=org_id and s.status='completed' and (s.starts_at at time zone c.timezone)::date >= p_period and (s.starts_at at time zone c.timezone)::date < (p_period+interval '1 month')::date
      group by s.id,s.starts_at,s.ends_at,tr.student_threshold,tr.threshold_rate_cents,tr.below_threshold_cents,ps.teacher_student_threshold,ps.teacher_rate_threshold_cents,ps.teacher_rate_below_cents;
      update payments.teacher_settlements ts set calculated_amount_cents=coalesce((select sum(l.amount_cents) from payments.teacher_settlement_lines l where l.settlement_id=ts.id),0),updated_at=now() where ts.id=v_settlement_id;
      made:=made+1;
    end if;
    v_settlement_id:=null;
  end loop;
  return made;
end
$$;

create or replace function payments.close_period(p_period date) returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then raise exception using errcode='42501', message='No autorizado para pagos'; end if;
  update payments.billing_periods set status='closed',closed_at=now() where organization_id=(select core.current_org()) and period=p_period and status='open';
  if not found then raise exception using errcode='P0002', message='Periodo abierto no encontrado'; end if;
end
$$;

create view classes.v_billable_sessions with (security_invoker=true) as
select s.id session_id,s.organization_id,s.teacher_id,s.club_id,s.category,s.starts_at,s.ends_at,
       extract(epoch from (s.ends_at-s.starts_at))::int/60 duration_minutes,count(ss.student_id)::smallint enrolled_count
from classes.sessions s left join classes.session_students ss on ss.session_id=s.id
where s.status='completed' group by s.id;

create or replace function core.admin_org_check(target_org uuid) returns boolean
language sql stable set search_path = ''
as $$ select (select core.is_admin()) and target_org=(select core.current_org()) $$;

do $$
declare t record;
begin
  for t in select table_schema,table_name from information_schema.columns where table_schema in ('core','classes','payments') and column_name='updated_at' group by table_schema,table_name loop
    execute format('create trigger set_updated_at before update on %I.%I for each row execute function core.set_updated_at()',t.table_schema,t.table_name);
  end loop;
end $$;

do $$
declare schema_name text; table_name text;
begin
  foreach schema_name in array array['core','classes','payments'] loop
    for table_name in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=schema_name and c.relkind='r' loop
      execute format('alter table %I.%I enable row level security',schema_name,table_name);
    end loop;
  end loop;
end $$;

create policy organizations_select on core.organizations for select to authenticated using (id=(select core.current_org()));
create policy clubs_admin_select on core.clubs for select to authenticated using (organization_id=(select core.current_org()));
create policy clubs_admin_insert on core.clubs for insert to authenticated with check ((select core.admin_org_check(organization_id)));
create policy clubs_admin_update on core.clubs for update to authenticated using ((select core.admin_org_check(organization_id))) with check ((select core.admin_org_check(organization_id)));
create policy clubs_admin_delete on core.clubs for delete to authenticated using ((select core.admin_org_check(organization_id)));
create policy profiles_select on core.profiles for select to authenticated using (organization_id=(select core.current_org()) and ((select core.current_app_role())='admin' or id=(select auth.uid())));
create policy profiles_admin_insert on core.profiles for insert to authenticated with check ((select core.admin_org_check(organization_id)));
create policy profiles_admin_update on core.profiles for update to authenticated using ((select core.admin_org_check(organization_id))) with check ((select core.admin_org_check(organization_id)));
create policy profiles_admin_delete on core.profiles for delete to authenticated using ((select core.admin_org_check(organization_id)));
create policy club_teachers_select on core.club_teachers for select to authenticated using (exists(select 1 from core.clubs c where c.id=club_id and c.organization_id=(select core.current_org())) and ((select core.is_admin()) or teacher_id=(select auth.uid())));
create policy club_teachers_admin_insert on core.club_teachers for insert to authenticated with check ((select core.is_admin()) and exists(select 1 from core.clubs c where c.id=club_id and c.organization_id=(select core.current_org())));
create policy club_teachers_admin_delete on core.club_teachers for delete to authenticated using ((select core.is_admin()) and exists(select 1 from core.clubs c where c.id=club_id and c.organization_id=(select core.current_org())));
create policy students_select on core.students for select to authenticated using (organization_id=(select core.current_org()) and ((select core.is_admin()) or exists(select 1 from classes.group_members gm join classes.groups g on g.id=gm.group_id where gm.student_id=id and g.teacher_id=(select auth.uid())) or exists(select 1 from classes.session_students ss join classes.sessions s on s.id=ss.session_id where ss.student_id=id and s.teacher_id=(select auth.uid()))));
create policy students_admin_insert on core.students for insert to authenticated with check ((select core.admin_org_check(organization_id)));
create policy students_admin_update on core.students for update to authenticated using ((select core.admin_org_check(organization_id))) with check ((select core.admin_org_check(organization_id)));
create policy students_admin_delete on core.students for delete to authenticated using ((select core.admin_org_check(organization_id)));
create policy student_accounts_select on core.student_accounts for select to authenticated using (profile_id=(select auth.uid()) or exists(select 1 from core.students s where s.id=student_id and s.organization_id=(select core.current_org()) and (select core.is_admin())));
create policy student_accounts_admin_write on core.student_accounts for all to authenticated using ((select core.is_admin()) and exists(select 1 from core.students s where s.id=student_id and s.organization_id=(select core.current_org()))) with check ((select core.is_admin()) and exists(select 1 from core.students s where s.id=student_id and s.organization_id=(select core.current_org())));
create policy guardians_select on core.guardians for select to authenticated using (organization_id=(select core.current_org()) and ((select core.is_admin()) or profile_id=(select auth.uid()) or exists(select 1 from core.student_guardians sg join core.students s on s.id=sg.student_id where sg.guardian_id=id and s.organization_id=(select core.current_org()))));
create policy guardians_admin_write on core.guardians for all to authenticated using ((select core.admin_org_check(organization_id))) with check ((select core.admin_org_check(organization_id)));
create policy student_guardians_select on core.student_guardians for select to authenticated using (exists(select 1 from core.students s where s.id=student_id and s.organization_id=(select core.current_org()) and ((select core.is_admin()) or exists(select 1 from core.student_accounts sa where sa.student_id=s.id and sa.profile_id=(select auth.uid())) or exists(select 1 from core.guardians g where g.id=guardian_id and g.profile_id=(select auth.uid())))));
create policy student_guardians_admin_write on core.student_guardians for all to authenticated using ((select core.is_admin()) and exists(select 1 from core.students s where s.id=student_id and s.organization_id=(select core.current_org()))) with check ((select core.is_admin()) and exists(select 1 from core.students s where s.id=student_id and s.organization_id=(select core.current_org())));
create policy modules_select on core.module_activations for select to authenticated using (organization_id=(select core.current_org()));
create policy modules_admin_write on core.module_activations for all to authenticated using ((select core.admin_org_check(organization_id))) with check ((select core.admin_org_check(organization_id)));

create policy groups_select on classes.groups for select to authenticated using (organization_id=(select core.current_org()) and (select core.module_enabled('classes')) and ((select core.is_admin()) or teacher_id=(select auth.uid())));
create policy groups_admin_insert on classes.groups for insert to authenticated with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes')));
create policy groups_admin_update on classes.groups for update to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes'))) with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes')));
create policy groups_admin_delete on classes.groups for delete to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes')));
create policy group_members_select on classes.group_members for select to authenticated using (exists(select 1 from classes.groups g where g.id=group_id and g.organization_id=(select core.current_org()) and (select core.module_enabled('classes')) and ((select core.is_admin()) or g.teacher_id=(select auth.uid()))));
create policy group_members_admin_write on classes.group_members for all to authenticated using ((select core.is_admin()) and exists(select 1 from classes.groups g where g.id=group_id and g.organization_id=(select core.current_org()) and (select core.module_enabled('classes')))) with check ((select core.is_admin()) and exists(select 1 from classes.groups g where g.id=group_id and g.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));
create policy sessions_select on classes.sessions for select to authenticated using (organization_id=(select core.current_org()) and (select core.module_enabled('classes')) and ((select core.is_admin()) or teacher_id=(select auth.uid())));
create policy sessions_admin_insert on classes.sessions for insert to authenticated with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes')));
create policy sessions_admin_update on classes.sessions for update to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes'))) with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes')));
create policy sessions_admin_delete on classes.sessions for delete to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('classes')));
create policy session_students_select on classes.session_students for select to authenticated using (exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes')) and ((select core.is_admin()) or s.teacher_id=(select auth.uid()))));
create policy session_students_admin_write on classes.session_students for all to authenticated using ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes')))) with check ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));
create policy attendance_select on classes.attendance for select to authenticated using (exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes')) and ((select core.is_admin()) or s.teacher_id=(select auth.uid()))));
create policy attendance_admin_write on classes.attendance for all to authenticated using ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes')))) with check ((select core.is_admin()) and exists(select 1 from classes.sessions s where s.id=session_id and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));
create policy attendance_teacher_insert on classes.attendance for insert to authenticated with check (exists(select 1 from classes.sessions s where s.id=session_id and s.teacher_id=(select auth.uid()) and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));
create policy attendance_teacher_update on classes.attendance for update to authenticated using (exists(select 1 from classes.sessions s where s.id=session_id and s.teacher_id=(select auth.uid()) and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes')))) with check (exists(select 1 from classes.sessions s where s.id=session_id and s.teacher_id=(select auth.uid()) and s.organization_id=(select core.current_org()) and (select core.module_enabled('classes'))));

create policy billable_sessions_select on classes.sessions for select to authenticated using (organization_id=(select core.current_org()) and (select core.module_enabled('classes')) and ((select core.is_admin()) or teacher_id=(select auth.uid())));
alter view classes.v_billable_sessions set (security_invoker=true);
grant select on classes.v_billable_sessions to authenticated;

create policy payments_admin_select_settings on payments.settings for select to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_write_settings on payments.settings for all to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments'))) with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_select_rates on payments.teacher_rates for select to authenticated using (exists(select 1 from core.profiles p where p.id=teacher_id and (select core.admin_org_check(p.organization_id))) and (select core.module_enabled('payments')));
create policy payments_admin_write_rates on payments.teacher_rates for all to authenticated using (exists(select 1 from core.profiles p where p.id=teacher_id and (select core.admin_org_check(p.organization_id))) and (select core.module_enabled('payments'))) with check (exists(select 1 from core.profiles p where p.id=teacher_id and (select core.admin_org_check(p.organization_id))) and (select core.module_enabled('payments')));
create policy payments_admin_tariffs on payments.tariffs for all to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments'))) with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_student_tariffs on payments.student_tariffs for all to authenticated using (exists(select 1 from core.students s where s.id=student_id and (select core.admin_org_check(s.organization_id))) and (select core.module_enabled('payments'))) with check (exists(select 1 from core.students s where s.id=student_id and (select core.admin_org_check(s.organization_id))) and (select core.module_enabled('payments')));
create policy payments_admin_periods on payments.billing_periods for all to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments'))) with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_charges on payments.student_charges for all to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments'))) with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_charge_lines on payments.student_charge_lines for all to authenticated using (exists(select 1 from payments.student_charges c where c.id=charge_id and (select core.admin_org_check(c.organization_id)) and (select core.module_enabled('payments')))) with check (exists(select 1 from payments.student_charges c where c.id=charge_id and (select core.admin_org_check(c.organization_id)) and (select core.module_enabled('payments'))));
create policy payments_admin_settlements on payments.teacher_settlements for all to authenticated using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments'))) with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_settlement_lines on payments.teacher_settlement_lines for all to authenticated using (exists(select 1 from payments.teacher_settlements s where s.id=settlement_id and (select core.admin_org_check(s.organization_id)) and (select core.module_enabled('payments')))) with check (exists(select 1 from payments.teacher_settlements s where s.id=settlement_id and (select core.admin_org_check(s.organization_id)) and (select core.module_enabled('payments'))));
create policy payments_admin_student_transactions on payments.student_transactions for all to authenticated using (exists(select 1 from payments.student_charges c where c.id=charge_id and (select core.admin_org_check(c.organization_id)) and (select core.module_enabled('payments')))) with check (exists(select 1 from payments.student_charges c where c.id=charge_id and (select core.admin_org_check(c.organization_id)) and (select core.module_enabled('payments'))));
create policy payments_admin_teacher_transactions on payments.teacher_transactions for all to authenticated using (exists(select 1 from payments.teacher_settlements s where s.id=settlement_id and (select core.admin_org_check(s.organization_id)) and (select core.module_enabled('payments')))) with check (exists(select 1 from payments.teacher_settlements s where s.id=settlement_id and (select core.admin_org_check(s.organization_id)) and (select core.module_enabled('payments'))));

do $$ declare s text; begin foreach s in array array['core','classes','payments'] loop
  execute format('revoke all on all tables in schema %I from anon',s);
  execute format('revoke all on all functions in schema %I from public, anon',s);
  execute format('grant usage on schema %I to anon, authenticated, service_role',s);
  execute format('grant select, insert, update, delete on all tables in schema %I to authenticated, service_role',s);
  execute format('alter default privileges in schema %I revoke all on tables from anon',s);
  execute format('alter default privileges in schema %I grant select, insert, update, delete on tables to authenticated, service_role',s);
end loop; end $$;
grant execute on function classes.generate_sessions(uuid,date,date) to authenticated, service_role;
grant execute on function classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text) to authenticated, service_role;
grant execute on function classes.set_session_status(uuid,classes.session_status,text) to authenticated, service_role;
grant execute on function payments.generate_student_charges(date) to authenticated, service_role;
grant execute on function payments.generate_teacher_settlements(date) to authenticated, service_role;
grant execute on function payments.close_period(date) to authenticated, service_role;
grant execute on function payments.ensure_open_period(date) to authenticated, service_role;
revoke execute on function classes.generate_sessions(uuid,date,date) from public,anon;
revoke execute on function classes.create_session(uuid,uuid,core.student_category,timestamptz,smallint,uuid[],text) from public,anon;
revoke execute on function classes.set_session_status(uuid,classes.session_status,text) from public,anon;
revoke execute on function payments.generate_student_charges(date) from public,anon;
revoke execute on function payments.generate_teacher_settlements(date) from public,anon;
revoke execute on function payments.close_period(date) from public,anon;
revoke execute on function payments.ensure_open_period(date) from public,anon;
grant execute on function core.current_org() to authenticated, service_role;
grant execute on function core.current_app_role() to authenticated, service_role;
grant execute on function core.is_admin() to authenticated, service_role;
grant execute on function core.module_enabled(text) to authenticated, service_role;
grant execute on function core.admin_org_check(uuid) to authenticated, service_role;
grant select on classes.v_billable_sessions to authenticated, service_role;
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, core, classes, payments';
select pg_notify('pgrst','reload config');
select pg_notify('pgrst','reload schema');
