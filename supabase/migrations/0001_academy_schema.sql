-- Aprende Padel Academy. Apply to an empty Supabase project.
-- Roles are stored in auth.users app_metadata.role: admin | teacher.

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'teacher');
create type public.class_type as enum ('particular', 'libre', 'escuela');
create type public.class_status as enum ('pending', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'absent', 'justified');
create type public.student_level as enum ('iniciacion', 'principiante', 'medio', 'avanzado', 'competicion');
create type public.student_gender as enum ('female', 'male', 'other', 'unspecified');
create type public.invoice_status as enum ('draft', 'issued', 'paid', 'cancelled');
create type public.payment_method as enum ('cash', 'transfer', 'other');
create type public.settlement_status as enum ('draft', 'approved', 'paid');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select auth.jwt()->'app_metadata'->>'role') = 'admin', false) $$;

create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select auth.jwt()->'app_metadata'->>'role') = 'teacher', false) $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'teacher',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.schools (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  municipality text not null, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.students (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete restrict,
  first_name text not null, last_name text not null, birth_date date not null check (birth_date <= current_date),
  email text, phone text, gender public.student_gender not null default 'unspecified',
  level public.student_level not null default 'iniciacion', active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.families (
  id uuid primary key default gen_random_uuid(), name text not null,
  monthly_price numeric(10,2) not null default 0 check (monthly_price >= 0),
  billing_email text, created_at timestamptz not null default now()
);
create table public.family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (family_id, student_id), unique (student_id)
);
create table public.teacher_groups (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete restrict,
  teacher_id uuid not null references public.profiles(id) on delete restrict, name text not null,
  type public.class_type not null default 'escuela', category text not null check (category in ('children', 'adults')),
  weekday int not null check (weekday between 0 and 6), start_time time not null,
  timezone text not null default 'Europe/Madrid', starts_on date not null default current_date,
  ends_on date, active boolean not null default true, created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create table public.group_members (
  group_id uuid not null references public.teacher_groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  starts_on date not null default current_date, ends_on date,
  primary key (group_id, student_id), check (ends_on is null or ends_on >= starts_on)
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(), group_id uuid references public.teacher_groups(id) on delete set null,
  school_id uuid not null references public.schools(id) on delete restrict,
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  type public.class_type not null, starts_at timestamptz not null, ends_at timestamptz not null,
  status public.class_status not null default 'pending', cancellation_reason text,
  discountable boolean not null default false, comment text, created_at timestamptz not null default now(),
  unique (group_id, starts_at), check (ends_at = starts_at + interval '1 hour'),
  check ((status = 'cancelled' and cancellation_reason is not null) or status <> 'cancelled'),
  check (discountable = false or status = 'cancelled')
);
create table public.enrollments (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  enrolled_at timestamptz not null default now(), primary key (session_id, student_id)
);
create table public.attendance (
  session_id uuid not null, student_id uuid not null, status public.attendance_status not null default 'absent',
  comment text, updated_at timestamptz not null default now(), primary key (session_id, student_id),
  foreign key (session_id, student_id) references public.enrollments(session_id, student_id) on delete cascade
);
create table public.tariffs (
  id uuid primary key default gen_random_uuid(), name text not null, type public.class_type not null default 'escuela',
  category text check (category in ('children', 'adults')), monthly_price numeric(10,2) not null check (monthly_price >= 0),
  valid_from date not null, valid_until date, active boolean not null default true, created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(), family_id uuid references public.families(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict, period date not null check (period = date_trunc('month', period)::date),
  status public.invoice_status not null default 'draft', total numeric(10,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(), check (num_nonnulls(family_id, student_id) = 1),
  unique (family_id, period), unique (student_id, period)
);
create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
  student_id uuid references public.students(id) on delete restrict, description text not null,
  amount numeric(10,2) not null, source_session_id uuid references public.sessions(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0), paid_at timestamptz not null default now(),
  method public.payment_method not null, note text
);
create table public.teacher_settlements (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.profiles(id) on delete restrict,
  period date not null check (period = date_trunc('month', period)::date), status public.settlement_status not null default 'draft',
  total numeric(10,2) not null default 0 check (total >= 0), created_at timestamptz not null default now(), unique (teacher_id, period)
);
create table public.settlement_lines (
  id uuid primary key default gen_random_uuid(), settlement_id uuid not null references public.teacher_settlements(id) on delete cascade,
  session_id uuid not null unique references public.sessions(id) on delete restrict, amount numeric(10,2) not null check (amount >= 0),
  enrolled_count int not null default 0 check (enrolled_count >= 0), rate numeric(10,2) not null check (rate >= 0)
);

create index students_school_id_idx on public.students(school_id);
create index groups_teacher_id_idx on public.teacher_groups(teacher_id);
create index groups_school_id_idx on public.teacher_groups(school_id);
create index group_members_student_id_idx on public.group_members(student_id);
create index sessions_starts_at_idx on public.sessions(starts_at);
create index sessions_teacher_id_starts_at_idx on public.sessions(teacher_id, starts_at);
create index enrollments_student_id_idx on public.enrollments(student_id);
create index invoices_period_idx on public.invoices(period);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$ begin insert into public.profiles (id, full_name, role) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'teacher')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger attendance_updated_at before update on public.attendance for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.students enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.teacher_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance enable row level security;
alter table public.tariffs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.payments enable row level security;
alter table public.teacher_settlements enable row level security;
alter table public.settlement_lines enable row level security;

create policy "profiles self or admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "admin profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin schools" on public.schools for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher schools" on public.schools for select to authenticated using (public.is_teacher() and exists (select 1 from public.teacher_groups g where g.school_id = id and g.teacher_id = (select auth.uid())));
create policy "admin students" on public.students for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher students" on public.students for select to authenticated using (public.is_teacher() and exists (select 1 from public.group_members gm join public.teacher_groups g on g.id = gm.group_id where gm.student_id = id and g.teacher_id = (select auth.uid())));
create policy "admin families" on public.families for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin family members" on public.family_members for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin groups" on public.teacher_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher groups" on public.teacher_groups for select to authenticated using (teacher_id = (select auth.uid()));
create policy "admin group members" on public.group_members for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher group members" on public.group_members for select to authenticated using (exists (select 1 from public.teacher_groups g where g.id = group_id and g.teacher_id = (select auth.uid())));
create policy "admin sessions" on public.sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher sessions" on public.sessions for select to authenticated using (teacher_id = (select auth.uid()));
create policy "teacher update sessions" on public.sessions for update to authenticated using (teacher_id = (select auth.uid())) with check (teacher_id = (select auth.uid()));
create policy "admin enrollments" on public.enrollments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher enrollments" on public.enrollments for select to authenticated using (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = (select auth.uid())));
create policy "admin attendance" on public.attendance for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher attendance" on public.attendance for insert to authenticated with check (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = (select auth.uid())));
create policy "teacher attendance update" on public.attendance for update to authenticated using (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = (select auth.uid()))) with check (exists (select 1 from public.sessions s where s.id = session_id and s.teacher_id = (select auth.uid())));
create policy "admin tariffs" on public.tariffs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated read tariffs" on public.tariffs for select to authenticated using (true);
create policy "admin invoices" on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin invoice lines" on public.invoice_lines for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin payments" on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin settlements" on public.teacher_settlements for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher settlements" on public.teacher_settlements for select to authenticated using (teacher_id = (select auth.uid()));
create policy "admin settlement lines" on public.settlement_lines for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "teacher settlement lines" on public.settlement_lines for select to authenticated using (exists (select 1 from public.teacher_settlements s where s.id = settlement_id and s.teacher_id = (select auth.uid())));

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
