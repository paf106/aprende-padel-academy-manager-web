-- What was paid to a teacher for a month. One record per teacher and month; the amount, classes and hours are the
-- ones that were paid at that moment, so a later change in the calendar shows up as a difference.
create table payments.teacher_settlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations on delete cascade,
  teacher_id uuid not null references core.teachers on delete restrict,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  paid_on date not null,
  amount_cents integer not null check (amount_cents > 0),
  sessions integer not null check (sessions >= 0),
  hours numeric(7, 2) not null check (hours >= 0),
  created_by uuid default auth.uid(),
  created_by_email text default (auth.jwt() ->> 'email'),
  created_at timestamptz not null default now(),
  unique (teacher_id, month)
);
create index teacher_settlements_org_idx on payments.teacher_settlements (organization_id);

alter table payments.teacher_settlements enable row level security;
grant select, insert, update, delete on payments.teacher_settlements to authenticated;
grant all on payments.teacher_settlements to service_role;
create policy admin_all on payments.teacher_settlements for all to authenticated
  using (organization_id = (select private.current_org()) and (select private.is_admin()) and (select private.module_enabled('payments')))
  with check (organization_id = (select private.current_org()) and (select private.is_admin()) and (select private.module_enabled('payments')));

notify pgrst, 'reload schema';
