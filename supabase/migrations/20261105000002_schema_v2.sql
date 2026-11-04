-- AprendePadel Manager v2 schema. One schema per module; every table carries organization_id and RLS.
create schema core;
create schema classes;
create schema payments;
create schema private;

-- Helpers read the signed-in user's claims. Roles live in app_metadata, never in user_metadata.
create function private.current_org() returns uuid
language sql stable
as $$ select nullif(auth.jwt() -> 'app_metadata' ->> 'organization_id', '')::uuid $$;

create function private.is_admin() returns boolean
language sql stable
as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' $$;

-- ===== core =====
create table core.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Europe/Madrid',
  created_at timestamptz not null default now()
);

create table core.organization_modules (
  organization_id uuid not null references core.organizations on delete cascade,
  module_id text not null check (module_id in ('classes', 'payments', 'courts', 'inventory', 'tournaments')),
  enabled boolean not null default false,
  primary key (organization_id, module_id)
);

create function private.module_enabled(p_module text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from core.organization_modules m
    where m.organization_id = private.current_org() and m.module_id = p_module and m.enabled
  )
$$;

create table core.clubs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  name text not null check (length(trim(name)) > 0),
  address text not null default '',
  city text not null default '',
  postal_code text not null default '' check (postal_code ~ '^(\d{5})?$'),
  courts smallint not null default 1 check (courts between 1 and 50),
  court_price_cents integer not null default 0 check (court_price_cents >= 0),
  color text not null default 'brand' check (color in ('brand', 'info', 'warning', 'danger')),
  photo text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table core.club_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  club_id uuid references core.clubs on delete cascade,
  starts_on date not null,
  ends_on date not null,
  reason text not null,
  check (ends_on >= starts_on)
);

create table core.teachers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table core.teacher_clubs (
  organization_id uuid not null references core.organizations on delete cascade,
  teacher_id uuid not null references core.teachers on delete cascade,
  club_id uuid not null references core.clubs on delete cascade,
  primary key (teacher_id, club_id)
);

create table core.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  name text not null
);

create table core.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null default '',
  birth_date date not null,
  gender text not null default 'unspecified' check (gender in ('female', 'male', 'other', 'unspecified')),
  category text not null check (category in ('adult', 'child')),
  level text not null check (level in ('starter', 'beginner', 'intermediate', 'advanced', 'competition')),
  club_id uuid not null references core.clubs on delete restrict,
  email text not null default '',
  phone text not null default '',
  account_id uuid not null references core.billing_accounts on delete restrict,
  active boolean not null default true,
  guardian_name text not null default '',
  guardian_phone text not null default '',
  -- Set when part of the data was filled with defaults on import; cleared when the admin saves the student.
  needs_review boolean not null default false,
  created_at timestamptz not null default now()
);
create index students_account_idx on core.students (account_id);
create index students_club_idx on core.students (club_id);

create table core.student_clubs (
  organization_id uuid not null references core.organizations on delete cascade,
  student_id uuid not null references core.students on delete cascade,
  club_id uuid not null references core.clubs on delete cascade,
  primary key (student_id, club_id)
);

-- ===== classes =====
create table classes.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  name text not null check (length(trim(name)) > 0),
  club_id uuid not null references core.clubs on delete restrict,
  teacher_id uuid not null references core.teachers on delete restrict,
  category text not null check (category in ('adult', 'child')),
  level text not null check (level in ('starter', 'beginner', 'intermediate', 'advanced', 'competition')),
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  duration smallint not null check (duration in (60, 90)),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  check (ends_on is null or ends_on >= starts_on)
);

create table classes.group_members (
  organization_id uuid not null references core.organizations on delete cascade,
  group_id uuid not null references classes.groups on delete cascade,
  student_id uuid not null references core.students on delete cascade,
  primary key (group_id, student_id)
);

create table classes.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  name text not null check (length(trim(name)) > 0),
  club_id uuid not null references core.clubs on delete restrict,
  teacher_id uuid not null references core.teachers on delete restrict,
  category text not null check (category in ('adult', 'child')),
  level text not null check (level in ('starter', 'beginner', 'intermediate', 'advanced', 'competition')),
  starts_on date not null,
  ends_on date not null,
  weekdays smallint[] not null check (cardinality(weekdays) > 0),
  start_time time not null,
  duration smallint not null check (duration in (60, 90)),
  active boolean not null default true,
  check (ends_on >= starts_on)
);

create table classes.course_enrollments (
  organization_id uuid not null references core.organizations on delete cascade,
  course_id uuid not null references classes.courses on delete cascade,
  student_id uuid not null references core.students on delete cascade,
  primary key (course_id, student_id)
);

create table classes.sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  group_id uuid references classes.groups on delete set null,
  course_id uuid references classes.courses on delete set null,
  kind text not null default 'group' check (kind in ('group', 'private')),
  club_id uuid not null references core.clubs on delete restrict,
  teacher_id uuid not null references core.teachers on delete restrict,
  date date not null,
  start_time time not null,
  duration smallint not null check (duration in (60, 90)),
  category text not null check (category in ('adult', 'child')),
  level text check (level in ('starter', 'beginner', 'intermediate', 'advanced', 'competition')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  cancel_reason text check (cancel_reason in ('rain', 'bad_weather', 'teacher_absent', 'teacher_late', 'single_attendee', 'other')),
  -- When set, only these students get the credit of a cancelled class (for example only one student showed up).
  credited_student_ids uuid[],
  created_at timestamptz not null default now()
);
create index sessions_date_idx on classes.sessions (organization_id, date);
create index sessions_teacher_idx on classes.sessions (teacher_id, date);

create table classes.session_attendees (
  organization_id uuid not null references core.organizations on delete cascade,
  session_id uuid not null references classes.sessions on delete cascade,
  student_id uuid not null references core.students on delete cascade,
  attendance text not null default 'unmarked' check (attendance in ('unmarked', 'present', 'absent')),
  origin text not null default 'group' check (origin in ('group', 'recovery', 'drop_in')),
  primary key (session_id, student_id)
);

-- ===== payments =====
create table payments.age_segments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  name text not null check (length(trim(name)) > 0),
  min_age smallint not null check (min_age >= 0),
  max_age smallint check (max_age is null or max_age >= min_age)
);

create table payments.individual_rates (
  organization_id uuid not null references core.organizations on delete cascade,
  segment_id uuid not null references payments.age_segments on delete cascade,
  classes_per_week smallint not null check (classes_per_week between 1 and 7),
  monthly_cents integer not null check (monthly_cents >= 0),
  primary key (segment_id, classes_per_week)
);

create table payments.pack_offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  scope text not null default 'monthly' check (scope in ('monthly', 'course')),
  name text not null check (length(trim(name)) > 0),
  classes_per_week smallint not null default 1 check (classes_per_week between 1 and 7),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  -- [{ "count": 2, "segmentIds": ["<segment uuid>", ...] }, ...]
  composition jsonb not null check (jsonb_typeof(composition) = 'array' and jsonb_array_length(composition) > 0)
);

create table payments.course_rates (
  organization_id uuid not null references core.organizations on delete cascade,
  segment_id uuid not null references payments.age_segments on delete cascade,
  price_cents integer not null check (price_cents >= 0),
  primary key (segment_id)
);

create table payments.billing_settings (
  organization_id uuid primary key references core.organizations on delete cascade,
  mode text not null default 'included' check (mode in ('included', 'prorate')),
  included_per_weekly_class smallint not null default 4 check (included_per_weekly_class between 1 and 10),
  charge_extra_classes boolean not null default true,
  credit_timing text not null default 'next_month' check (credit_timing in ('next_month', 'same_month')),
  credit_reasons text[] not null default '{}',
  leave_notice_days smallint not null default 10 check (leave_notice_days between 0 and 60),
  allowed_payment_methods text[] not null default '{cash}' check (cardinality(allowed_payment_methods) > 0)
);

create table payments.extra_rates (
  organization_id uuid primary key references core.organizations on delete cascade,
  drop_in_cents integer not null default 0 check (drop_in_cents >= 0),
  private_one_cents integer not null default 0 check (private_one_cents >= 0),
  private_two_cents integer not null default 0 check (private_two_cents >= 0),
  private_min_age smallint not null default 13 check (private_min_age >= 0)
);

create table payments.teacher_pay_rates (
  organization_id uuid not null references core.organizations on delete cascade,
  category text not null check (category in ('adult', 'child')),
  threshold smallint not null default 3 check (threshold >= 1),
  below_cents integer not null default 0 check (below_cents >= 0),
  at_or_above_cents integer not null default 0 check (at_or_above_cents >= 0),
  primary key (organization_id, category)
);

create table payments.rate_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  scope text not null check (scope in ('student', 'account')),
  target_id uuid not null,
  amount_cents integer not null check (amount_cents >= 0),
  reason text not null check (length(trim(reason)) >= 3),
  from_month text not null check (from_month ~ '^\d{4}-\d{2}$'),
  to_month text not null default '' check (to_month ~ '^(\d{4}-\d{2})?$')
);

-- Append-only ledger: payments are never edited or deleted.
create table payments.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  account_id uuid not null references core.billing_accounts on delete restrict,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('cash', 'transfer', 'bizum')),
  paid_on date not null,
  created_at timestamptz not null default now()
);
create index payments_account_idx on payments.payments (account_id, month);

create function private.reject_ledger_changes() returns trigger
language plpgsql
as $$
begin
  raise exception 'payments are append-only';
end;
$$;
create trigger payments_append_only before update or delete on payments.payments
  for each row execute function private.reject_ledger_changes();

create table payments.extra_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  account_id uuid not null references core.billing_accounts on delete cascade,
  student_id uuid not null references core.students on delete cascade,
  kind text not null check (kind in ('drop_in', 'private', 'course')),
  description text not null,
  amount_cents integer not null check (amount_cents >= 0),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  -- Logical references to the classes module, without foreign keys between modules.
  session_id uuid,
  course_id uuid
);
create index extra_charges_account_idx on payments.extra_charges (account_id, month);

-- ===== privileges =====
grant usage on schema core, classes, payments to authenticated, service_role;
grant usage on schema private to authenticated, service_role;
grant select, insert, update, delete on all tables in schema core, classes, payments to authenticated;
grant all on all tables in schema core, classes, payments to service_role;
revoke insert, update, delete on core.organization_modules from authenticated;
revoke insert, delete on core.organizations from authenticated;
revoke update, delete on payments.payments from authenticated;
alter default privileges in schema core, classes, payments grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema core, classes, payments grant all on tables to service_role;

-- ===== row level security =====
alter table core.organizations enable row level security;
alter table core.organization_modules enable row level security;

create policy organization_read on core.organizations for select to authenticated
  using (id = private.current_org());
create policy organization_update on core.organizations for update to authenticated
  using (id = private.current_org() and private.is_admin())
  with check (id = private.current_org() and private.is_admin());
create policy modules_read on core.organization_modules for select to authenticated
  using (organization_id = private.current_org());

-- Every other table: only admins of the same organization, and only while the module is enabled.
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
    execute format('alter table %I.%I enable row level security', rec.s, rec.t);
    module_check := case when rec.s = 'core' then 'true' else format('private.module_enabled(%L)', rec.s) end;
    execute format(
      'create policy admin_all on %I.%I for all to authenticated using (organization_id = private.current_org() and private.is_admin() and %s) with check (organization_id = private.current_org() and private.is_admin() and %s)',
      rec.s, rec.t, module_check, module_check
    );
  end loop;
end $$;

alter table payments.payments enable row level security;
create policy ledger_read on payments.payments for select to authenticated
  using (organization_id = private.current_org() and private.is_admin() and private.module_enabled('payments'));
create policy ledger_insert on payments.payments for insert to authenticated
  with check (organization_id = private.current_org() and private.is_admin() and private.module_enabled('payments'));

notify pgrst, 'reload schema';
