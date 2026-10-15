-- Make current_org and is_admin reflect the live profile/organization state,
-- so stale JWT claims cannot keep a disabled admin authorized.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.active_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from core.profiles p
  join core.organizations o on o.id = p.organization_id
  where p.id = (select auth.uid())
    and p.active
    and o.active
    and p.organization_id = nullif((select auth.jwt()->'app_metadata'->>'organization_id'), '')::uuid
  limit 1
$$;

create or replace function private.active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from core.profiles p
    join core.organizations o on o.id = p.organization_id
    where p.id = (select auth.uid())
      and p.role = 'admin'::core.app_role
      and p.active
      and o.active
      and p.organization_id = nullif((select auth.jwt()->'app_metadata'->>'organization_id'), '')::uuid
  )
$$;

create or replace function private.teacher_can_access_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from core.students st
    where st.id = target_student
      and st.organization_id = (select private.active_org_id())
      and (
        exists (
          select 1 from classes.group_members gm
          join classes.groups g on g.id = gm.group_id
          where gm.student_id = st.id and g.organization_id = st.organization_id and g.teacher_id = (select auth.uid())
        )
        or exists (
          select 1 from classes.session_students ss
          join classes.sessions s on s.id = ss.session_id
          where ss.student_id = st.id and s.organization_id = st.organization_id and s.teacher_id = (select auth.uid())
        )
      )
  )
$$;

create or replace function private.user_can_access_guardian(target_guardian uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from core.guardians g
    join core.student_guardians sg on sg.guardian_id = g.id
    join core.students st on st.id = sg.student_id and st.organization_id = g.organization_id
    where g.id = target_guardian
      and g.organization_id = (select private.active_org_id())
      and (
        exists (select 1 from core.student_accounts sa where sa.student_id = st.id and sa.profile_id = (select auth.uid()))
        or (select private.teacher_can_access_student(st.id))
      )
  )
$$;

revoke all on function private.active_org_id() from public, anon;
revoke all on function private.active_admin() from public, anon;
revoke all on function private.teacher_can_access_student(uuid) from public, anon;
revoke all on function private.user_can_access_guardian(uuid) from public, anon;
grant execute on function private.active_org_id() to authenticated, service_role;
grant execute on function private.active_admin() to authenticated, service_role;
grant execute on function private.teacher_can_access_student(uuid) to authenticated, service_role;
grant execute on function private.user_can_access_guardian(uuid) to authenticated, service_role;

create or replace function core.current_org() returns uuid
language sql stable set search_path = ''
as $$ select (select private.active_org_id()) $$;

create or replace function core.is_admin() returns boolean
language sql stable set search_path = ''
as $$ select (select private.active_admin()) $$;

drop policy if exists profiles_select on core.profiles;
create policy profiles_select on core.profiles for select to authenticated
using (organization_id = (select core.current_org()) and ((select core.is_admin()) or id = (select auth.uid())));

-- Fix correlated references: the unqualified id resolved to a subquery row.
drop policy if exists students_select on core.students;
create policy students_select on core.students for select to authenticated
using (
  organization_id = (select core.current_org())
  and (
    (select core.is_admin())
    or (select private.teacher_can_access_student(core.students.id))
  )
);

drop policy if exists guardians_select on core.guardians;
create policy guardians_select on core.guardians for select to authenticated
using (
  organization_id = (select core.current_org())
  and (
    (select core.is_admin())
    or profile_id = (select auth.uid())
    or (select private.user_can_access_guardian(core.guardians.id))
  )
);

-- Module availability and billing settings are controlled by trusted server
-- administration, never directly by an organization admin through PostgREST.
drop policy if exists modules_admin_write on core.module_activations;
revoke insert, update, delete on core.module_activations from authenticated;

-- Avoid broad FOR ALL policies that duplicate SELECT checks and also expose
-- writes through policies intended for reads.
drop policy if exists group_members_admin_write on classes.group_members;
create policy group_members_admin_insert on classes.group_members for insert to authenticated
with check ((select core.is_admin()) and exists (
  select 1 from classes.groups g where g.id = group_id
    and g.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
));
create policy group_members_admin_update on classes.group_members for update to authenticated
using ((select core.is_admin()) and exists (
  select 1 from classes.groups g where g.id = group_id
    and g.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
)) with check ((select core.is_admin()) and exists (
  select 1 from classes.groups g where g.id = group_id
    and g.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
));
create policy group_members_admin_delete on classes.group_members for delete to authenticated
using ((select core.is_admin()) and exists (
  select 1 from classes.groups g where g.id = group_id
    and g.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
));

drop policy if exists session_students_admin_write on classes.session_students;
create policy session_students_admin_insert on classes.session_students for insert to authenticated
with check ((select core.is_admin()) and exists (
  select 1 from classes.sessions s where s.id = session_id
    and s.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
));
create policy session_students_admin_update on classes.session_students for update to authenticated
using ((select core.is_admin()) and exists (
  select 1 from classes.sessions s where s.id = session_id
    and s.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
)) with check ((select core.is_admin()) and exists (
  select 1 from classes.sessions s where s.id = session_id
    and s.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
));
create policy session_students_admin_delete on classes.session_students for delete to authenticated
using ((select core.is_admin()) and exists (
  select 1 from classes.sessions s where s.id = session_id
    and s.organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
));

drop policy if exists guardians_admin_write on core.guardians;
create policy guardians_admin_insert on core.guardians for insert to authenticated
with check ((select core.admin_org_check(organization_id)));
create policy guardians_admin_update on core.guardians for update to authenticated
using ((select core.admin_org_check(organization_id))) with check ((select core.admin_org_check(organization_id)));
create policy guardians_admin_delete on core.guardians for delete to authenticated
using ((select core.admin_org_check(organization_id)));

drop policy if exists student_accounts_admin_write on core.student_accounts;
create policy student_accounts_admin_insert on core.student_accounts for insert to authenticated
with check ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
));
create policy student_accounts_admin_update on core.student_accounts for update to authenticated
using ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
)) with check ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
));
create policy student_accounts_admin_delete on core.student_accounts for delete to authenticated
using ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
));

drop policy if exists student_guardians_admin_write on core.student_guardians;
create policy student_guardians_admin_insert on core.student_guardians for insert to authenticated
with check ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
));
create policy student_guardians_admin_update on core.student_guardians for update to authenticated
using ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
)) with check ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
));
create policy student_guardians_admin_delete on core.student_guardians for delete to authenticated
using ((select core.is_admin()) and exists (
  select 1 from core.students s where s.id = student_id and s.organization_id = (select core.current_org())
));

drop policy if exists payments_admin_write_settings on payments.settings;
create policy payments_admin_insert_settings on payments.settings for insert to authenticated
with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_update_settings on payments.settings for update to authenticated
using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')))
with check ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));
create policy payments_admin_delete_settings on payments.settings for delete to authenticated
using ((select core.admin_org_check(organization_id)) and (select core.module_enabled('payments')));

drop policy if exists payments_admin_write_rates on payments.teacher_rates;
create policy payments_admin_insert_rates on payments.teacher_rates for insert to authenticated
with check (exists(select 1 from core.profiles p where p.id = teacher_id and (select core.admin_org_check(p.organization_id))) and (select core.module_enabled('payments')));
create policy payments_admin_update_rates on payments.teacher_rates for update to authenticated
using (exists(select 1 from core.profiles p where p.id = teacher_id and (select core.admin_org_check(p.organization_id))) and (select core.module_enabled('payments')))
with check (exists(select 1 from core.profiles p where p.id = teacher_id and (select core.admin_org_check(p.organization_id))) and (select core.module_enabled('payments')));
create policy payments_admin_delete_rates on payments.teacher_rates for delete to authenticated
using (exists(select 1 from core.profiles p where p.id = teacher_id and (select core.admin_org_check(p.organization_id))) and (select core.module_enabled('payments')));

-- The generated settlement-line view uses security_invoker, so this duplicate
-- permissive session SELECT policy is unnecessary.
drop policy if exists billable_sessions_select on classes.sessions;

-- Stop clients from promoting another profile to administrator via the broad
-- profile update policy. Trusted service-role provisioning remains available.
create or replace function core.prevent_profile_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and new.role is distinct from old.role then
    raise exception using errcode = '42501', message = 'El rol del perfil solo puede cambiarse mediante administración segura';
  end if;
  return new;
end
$$;
drop trigger if exists prevent_profile_role_escalation on core.profiles;
create trigger prevent_profile_role_escalation before update of role on core.profiles
for each row execute function core.prevent_profile_role_escalation();

-- Enforce tenant consistency even when a caller bypasses the web form and
-- submits foreign keys directly to the Data API.
create or replace function core.enforce_tenant_integrity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ref_org uuid;
  ref_role core.app_role;
  ref_active boolean;
  ref_category core.student_category;
  second_org uuid;
  second_active boolean;
  second_category core.student_category;
  ref_teacher uuid;
  second_teacher uuid;
begin
  if tg_table_schema = 'core' and tg_table_name = 'students' then
    if tg_op = 'UPDATE' then
      if new.club_id = old.club_id and new.organization_id = old.organization_id then return new; end if;
    end if;
    select organization_id into ref_org from core.clubs where id = new.club_id;
    if ref_org is null or ref_org <> new.organization_id then
      raise exception using errcode = '23514', message = 'El club debe pertenecer a la organización del alumno';
    end if;
  elsif tg_table_schema = 'core' and tg_table_name = 'club_teachers' then
    if tg_op = 'UPDATE' then
      if new.club_id = old.club_id and new.teacher_id = old.teacher_id then return new; end if;
    end if;
    select organization_id into ref_org from core.clubs where id = new.club_id;
    select organization_id, role, active into second_org, ref_role, ref_active from core.profiles where id = new.teacher_id;
    if ref_org is null or second_org is null or ref_org <> second_org or ref_role <> 'teacher'::core.app_role or not ref_active then
      raise exception using errcode = '23514', message = 'El profesor y el club deben pertenecer a la misma organización';
    end if;
  elsif tg_table_schema = 'core' and tg_table_name = 'guardians' then
    if tg_op = 'UPDATE' then
      if new.organization_id = old.organization_id and new.profile_id is not distinct from old.profile_id then return new; end if;
    end if;
    if new.profile_id is not null then
      select organization_id into ref_org from core.profiles where id = new.profile_id;
      if ref_org is null or ref_org <> new.organization_id then
        raise exception using errcode = '23514', message = 'El perfil del tutor debe pertenecer a la misma organización';
      end if;
    end if;
  elsif tg_table_schema = 'core' and tg_table_name = 'student_accounts' then
    if tg_op = 'UPDATE' then
      if new.student_id = old.student_id and new.profile_id = old.profile_id then return new; end if;
    end if;
    select organization_id into ref_org from core.students where id = new.student_id;
    select organization_id into second_org from core.profiles where id = new.profile_id;
    if ref_org is null or second_org is null or ref_org <> second_org then
      raise exception using errcode = '23514', message = 'La cuenta y el alumno deben pertenecer a la misma organización';
    end if;
  elsif tg_table_schema = 'core' and tg_table_name = 'student_guardians' then
    if tg_op = 'UPDATE' then
      if new.student_id = old.student_id and new.guardian_id = old.guardian_id then return new; end if;
    end if;
    select organization_id into ref_org from core.students where id = new.student_id;
    select organization_id into second_org from core.guardians where id = new.guardian_id;
    if ref_org is null or second_org is null or ref_org <> second_org then
      raise exception using errcode = '23514', message = 'El tutor y el alumno deben pertenecer a la misma organización';
    end if;
  elsif tg_table_schema = 'classes' and tg_table_name = 'groups' then
    if tg_op = 'UPDATE' then
      if new.organization_id = old.organization_id and new.club_id = old.club_id and new.teacher_id = old.teacher_id and new.category = old.category then return new; end if;
    end if;
    select organization_id into ref_org from core.clubs where id = new.club_id;
    select organization_id, role, active into second_org, ref_role, ref_active from core.profiles where id = new.teacher_id;
    if ref_org is null or ref_org <> new.organization_id or second_org is distinct from new.organization_id or ref_role <> 'teacher'::core.app_role or not ref_active then
      raise exception using errcode = '23514', message = 'El grupo, el club y el profesor deben pertenecer a la misma organización';
    end if;
    if not exists (select 1 from core.club_teachers ct where ct.club_id = new.club_id and ct.teacher_id = new.teacher_id) then
      raise exception using errcode = '23514', message = 'El profesor debe estar asignado al club del grupo';
    end if;
  elsif tg_table_schema = 'classes' and tg_table_name = 'sessions' then
    if tg_op = 'UPDATE' then
      if new.organization_id = old.organization_id and new.club_id = old.club_id and new.teacher_id = old.teacher_id and new.group_id is not distinct from old.group_id and new.category = old.category then return new; end if;
    end if;
    select organization_id into ref_org from core.clubs where id = new.club_id;
    select organization_id, role, active into second_org, ref_role, ref_active from core.profiles where id = new.teacher_id;
    if ref_org is null or ref_org <> new.organization_id or second_org is distinct from new.organization_id or ref_role <> 'teacher'::core.app_role or not ref_active then
      raise exception using errcode = '23514', message = 'La clase, el club y el profesor deben pertenecer a la misma organización';
    end if;
    if not exists (select 1 from core.club_teachers ct where ct.club_id = new.club_id and ct.teacher_id = new.teacher_id) then
      raise exception using errcode = '23514', message = 'El profesor debe estar asignado al club de la clase';
    end if;
    if new.group_id is not null and not exists (
      select 1 from classes.groups g
      where g.id = new.group_id and g.organization_id = new.organization_id
        and g.club_id = new.club_id and g.teacher_id = new.teacher_id and g.category = new.category
    ) then
      raise exception using errcode = '23514', message = 'La clase debe coincidir con el grupo asignado';
    end if;
  elsif tg_table_schema = 'payments' and tg_table_name = 'student_tariffs' then
    if tg_op = 'UPDATE' then
      if new.student_id = old.student_id and new.tariff_id = old.tariff_id then return new; end if;
    end if;
    select organization_id, category, active into ref_org, ref_category, ref_active from core.students where id = new.student_id;
    select organization_id, category, active into second_org, second_category, second_active from payments.tariffs where id = new.tariff_id;
    if ref_org is null or second_org is null or ref_org <> second_org or ref_category <> second_category or not ref_active or not second_active then
      raise exception using errcode = '23514', message = 'El alumno y la tarifa deben coincidir en organización y categoría';
    end if;
  elsif tg_table_schema = 'payments' and tg_table_name = 'student_charges' then
    if tg_op = 'UPDATE' then
      if new.organization_id = old.organization_id and new.student_id = old.student_id then return new; end if;
    end if;
    select organization_id into ref_org from core.students where id = new.student_id;
    if ref_org is null or ref_org <> new.organization_id then
      raise exception using errcode = '23514', message = 'El cargo y el alumno deben pertenecer a la misma organización';
    end if;
  elsif tg_table_schema = 'payments' and tg_table_name = 'teacher_settlements' then
    if tg_op = 'UPDATE' then
      if new.organization_id = old.organization_id and new.teacher_id = old.teacher_id then return new; end if;
    end if;
    select organization_id, role, active into ref_org, ref_role, ref_active from core.profiles where id = new.teacher_id;
    if ref_org is null or ref_org <> new.organization_id or ref_role <> 'teacher'::core.app_role or not ref_active then
      raise exception using errcode = '23514', message = 'La liquidación debe corresponder a un profesor activo de la organización';
    end if;
  elsif tg_table_schema = 'payments' and tg_table_name = 'teacher_rates' then
    if tg_op = 'UPDATE' then
      if new.teacher_id = old.teacher_id then return new; end if;
    end if;
    select role, active into ref_role, ref_active from core.profiles where id = new.teacher_id;
    if ref_role <> 'teacher'::core.app_role or not ref_active then
      raise exception using errcode = '23514', message = 'La tarifa debe corresponder a un profesor activo';
    end if;
  elsif tg_table_schema = 'payments' and tg_table_name = 'student_charge_lines' and new.tariff_id is not null then
    if tg_op = 'UPDATE' then
      if new.charge_id = old.charge_id and new.tariff_id is not distinct from old.tariff_id then return new; end if;
    end if;
    select organization_id into ref_org from payments.student_charges where id = new.charge_id;
    select organization_id into second_org from payments.tariffs where id = new.tariff_id;
    if ref_org is null or second_org is null or ref_org <> second_org then
      raise exception using errcode = '23514', message = 'La línea del cargo y la tarifa deben pertenecer a la misma organización';
    end if;
  elsif tg_table_schema = 'payments' and tg_table_name = 'teacher_settlement_lines' then
    if tg_op = 'UPDATE' then
      if new.settlement_id = old.settlement_id and new.session_id = old.session_id then return new; end if;
    end if;
    select organization_id, teacher_id into ref_org, ref_teacher from payments.teacher_settlements where id = new.settlement_id;
    select organization_id, teacher_id into second_org, second_teacher from classes.sessions where id = new.session_id;
    if ref_org is null or second_org is null or ref_org <> second_org or ref_teacher is distinct from second_teacher then
      raise exception using errcode = '23514', message = 'La liquidación y la clase deben pertenecer a la misma organización';
    end if;
    if not exists (select 1 from classes.sessions s where s.id = new.session_id and s.status = 'completed') then
      raise exception using errcode = '23514', message = 'Solo se pueden liquidar clases terminadas';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists students_tenant_integrity on core.students;
create trigger students_tenant_integrity before insert or update on core.students for each row execute function core.enforce_tenant_integrity();
drop trigger if exists club_teachers_tenant_integrity on core.club_teachers;
create trigger club_teachers_tenant_integrity before insert or update on core.club_teachers for each row execute function core.enforce_tenant_integrity();
drop trigger if exists guardians_tenant_integrity on core.guardians;
create trigger guardians_tenant_integrity before insert or update on core.guardians for each row execute function core.enforce_tenant_integrity();
drop trigger if exists student_accounts_tenant_integrity on core.student_accounts;
create trigger student_accounts_tenant_integrity before insert or update on core.student_accounts for each row execute function core.enforce_tenant_integrity();
drop trigger if exists student_guardians_tenant_integrity on core.student_guardians;
create trigger student_guardians_tenant_integrity before insert or update on core.student_guardians for each row execute function core.enforce_tenant_integrity();
drop trigger if exists groups_tenant_integrity on classes.groups;
create trigger groups_tenant_integrity before insert or update on classes.groups for each row execute function core.enforce_tenant_integrity();
drop trigger if exists sessions_tenant_integrity on classes.sessions;
create trigger sessions_tenant_integrity before insert or update on classes.sessions for each row execute function core.enforce_tenant_integrity();
drop trigger if exists student_tariffs_tenant_integrity on payments.student_tariffs;
create trigger student_tariffs_tenant_integrity before insert or update on payments.student_tariffs for each row execute function core.enforce_tenant_integrity();
drop trigger if exists student_charges_tenant_integrity on payments.student_charges;
create trigger student_charges_tenant_integrity before insert or update on payments.student_charges for each row execute function core.enforce_tenant_integrity();
drop trigger if exists teacher_settlements_tenant_integrity on payments.teacher_settlements;
create trigger teacher_settlements_tenant_integrity before insert or update on payments.teacher_settlements for each row execute function core.enforce_tenant_integrity();
drop trigger if exists teacher_rates_tenant_integrity on payments.teacher_rates;
create trigger teacher_rates_tenant_integrity before insert or update on payments.teacher_rates for each row execute function core.enforce_tenant_integrity();
drop trigger if exists student_charge_lines_tenant_integrity on payments.student_charge_lines;
create trigger student_charge_lines_tenant_integrity before insert or update on payments.student_charge_lines for each row execute function core.enforce_tenant_integrity();
drop trigger if exists teacher_settlement_lines_tenant_integrity on payments.teacher_settlement_lines;
create trigger teacher_settlement_lines_tenant_integrity before insert or update on payments.teacher_settlement_lines for each row execute function core.enforce_tenant_integrity();

create or replace function core.validate_club_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names tz where tz.name = new.timezone) then
    raise exception using errcode = '22023', message = 'La zona horaria del club no es válida';
  end if;
  return new;
end
$$;
drop trigger if exists clubs_validate_timezone on core.clubs;
create trigger clubs_validate_timezone before insert or update of timezone on core.clubs
for each row execute function core.validate_club_timezone();

-- Validate student/class tenancy in addition to category on direct writes.
create or replace function classes.validate_session_student_category() returns trigger
language plpgsql set search_path = ''
as $$
declare
  session_row classes.sessions%rowtype;
  student_row core.students%rowtype;
begin
  select * into session_row from classes.sessions where id = new.session_id;
  select * into student_row from core.students where id = new.student_id;
  if session_row.id is null or student_row.id is null
    or session_row.organization_id <> student_row.organization_id
    or session_row.club_id <> student_row.club_id
    or session_row.category <> student_row.category then
    raise exception using errcode = '23514', message = 'El alumno debe pertenecer al mismo club, organización y categoría que la clase';
  end if;
  return new;
end
$$;

-- Reject invalid transaction owners and close the NULL-due bypass.
create or replace function payments.validate_transaction() returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  due bigint;
  already_paid bigint;
  period_date date;
  org uuid;
  creator_org uuid;
  creator_role core.app_role;
  creator_active boolean;
begin
  if tg_table_name = 'student_transactions' then
    select coalesce(c.override_amount_cents, c.calculated_amount_cents), c.period, c.organization_id
      into due, period_date, org from payments.student_charges c where c.id = new.charge_id for update;
    if not found or due is null or period_date is null or org is null then
      raise exception using errcode = '23503', message = 'El cargo no existe';
    end if;
    select coalesce(sum(t.amount_cents), 0) into already_paid from payments.student_transactions t
      where t.charge_id = new.charge_id and (tg_op <> 'UPDATE' or t.id <> new.id);
  else
    select coalesce(c.override_amount_cents, c.calculated_amount_cents), c.period, c.organization_id
      into due, period_date, org from payments.teacher_settlements c where c.id = new.settlement_id for update;
    if not found or due is null or period_date is null or org is null then
      raise exception using errcode = '23503', message = 'La liquidación no existe';
    end if;
    select coalesce(sum(t.amount_cents), 0) into already_paid from payments.teacher_transactions t
      where t.settlement_id = new.settlement_id and (tg_op <> 'UPDATE' or t.id <> new.id);
  end if;
  if exists(select 1 from payments.billing_periods bp where bp.organization_id = org and bp.period = period_date and bp.status = 'closed') then
    raise exception using errcode = '55000', message = 'El periodo está cerrado';
  end if;
  select organization_id, role, active into creator_org, creator_role, creator_active from core.profiles where id = new.created_by;
  if creator_org is distinct from org or creator_role <> 'admin'::core.app_role or not creator_active
    or ((select auth.uid()) is not null and new.created_by <> (select auth.uid())) then
    raise exception using errcode = '42501', message = 'El registro debe pertenecer a un administrador activo de la organización';
  end if;
  if already_paid + new.amount_cents > due then
    raise exception using errcode = '23514', message = 'El pago supera el saldo pendiente';
  end if;
  return new;
end
$$;

-- Prevent mutation of any financial record once its billing month is closed.
create or replace function payments.prevent_closed_period_mutation() returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  org uuid;
  period_date date;
begin
  if tg_table_name = 'billing_periods' then
    if tg_op = 'DELETE' then
      if old.status = 'closed' then raise exception using errcode = '55000', message = 'No se puede eliminar un periodo cerrado'; end if;
      return old;
    end if;
    if (new.organization_id, new.period) is distinct from (old.organization_id, old.period) then
      raise exception using errcode = '55000', message = 'No se puede mover un periodo de facturación';
    end if;
    if old.status = 'closed' and new.status <> 'closed' then
      raise exception using errcode = '55000', message = 'No se puede reabrir un periodo cerrado';
    end if;
    return new;
  elsif tg_table_name in ('student_charges', 'teacher_settlements') then
    if tg_op = 'UPDATE' then
      if (new.organization_id, new.period) is distinct from (old.organization_id, old.period) then
        raise exception using errcode = '55000', message = 'No se puede mover un cargo o liquidación a otro periodo';
      end if;
    end if;
    org := old.organization_id;
    period_date := old.period;
  elsif tg_table_name = 'student_charge_lines' then
    select c.organization_id, c.period into org, period_date from payments.student_charges c where c.id = old.charge_id;
    if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
      raise exception using errcode = '55000', message = 'No se pueden modificar líneas de un periodo cerrado';
    end if;
    if tg_op = 'UPDATE' then
      if new.charge_id is distinct from old.charge_id then
        select c.organization_id, c.period into org, period_date from payments.student_charges c where c.id = new.charge_id;
        if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
          raise exception using errcode = '55000', message = 'No se pueden mover líneas a un periodo cerrado';
        end if;
      end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  elsif tg_table_name = 'teacher_settlement_lines' then
    select s.organization_id, s.period into org, period_date from payments.teacher_settlements s where s.id = old.settlement_id;
    if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
      raise exception using errcode = '55000', message = 'No se pueden modificar líneas de un periodo cerrado';
    end if;
    if tg_op = 'UPDATE' then
      if new.settlement_id is distinct from old.settlement_id then
        select s.organization_id, s.period into org, period_date from payments.teacher_settlements s where s.id = new.settlement_id;
        if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
          raise exception using errcode = '55000', message = 'No se pueden mover líneas a un periodo cerrado';
        end if;
      end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  elsif tg_table_name = 'student_transactions' then
    select c.organization_id, c.period into org, period_date from payments.student_charges c where c.id = old.charge_id;
    if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
      raise exception using errcode = '55000', message = 'No se pueden modificar pagos de un periodo cerrado';
    end if;
    if tg_op = 'UPDATE' then
      if new.charge_id is distinct from old.charge_id then
        select c.organization_id, c.period into org, period_date from payments.student_charges c where c.id = new.charge_id;
        if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
          raise exception using errcode = '55000', message = 'No se pueden mover pagos a un periodo cerrado';
        end if;
      end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  elsif tg_table_name = 'teacher_transactions' then
    select s.organization_id, s.period into org, period_date from payments.teacher_settlements s where s.id = old.settlement_id;
    if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
      raise exception using errcode = '55000', message = 'No se pueden modificar pagos de un periodo cerrado';
    end if;
    if tg_op = 'UPDATE' then
      if new.settlement_id is distinct from old.settlement_id then
        select s.organization_id, s.period into org, period_date from payments.teacher_settlements s where s.id = new.settlement_id;
        if exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
          raise exception using errcode = '55000', message = 'No se pueden mover pagos a un periodo cerrado';
        end if;
      end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if org is not null and period_date is not null
    and exists(select 1 from payments.billing_periods p where p.organization_id = org and p.period = period_date and p.status = 'closed') then
    raise exception using errcode = '55000', message = 'No se puede modificar información de un periodo cerrado';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

drop trigger if exists billing_period_closed_guard on payments.billing_periods;
create trigger billing_period_closed_guard before update or delete on payments.billing_periods for each row execute function payments.prevent_closed_period_mutation();
drop trigger if exists student_charges_closed_guard on payments.student_charges;
create trigger student_charges_closed_guard before update or delete on payments.student_charges for each row execute function payments.prevent_closed_period_mutation();
drop trigger if exists teacher_settlements_closed_guard on payments.teacher_settlements;
create trigger teacher_settlements_closed_guard before update or delete on payments.teacher_settlements for each row execute function payments.prevent_closed_period_mutation();
drop trigger if exists student_charge_lines_closed_guard on payments.student_charge_lines;
create trigger student_charge_lines_closed_guard before update or delete on payments.student_charge_lines for each row execute function payments.prevent_closed_period_mutation();
drop trigger if exists teacher_settlement_lines_closed_guard on payments.teacher_settlement_lines;
create trigger teacher_settlement_lines_closed_guard before update or delete on payments.teacher_settlement_lines for each row execute function payments.prevent_closed_period_mutation();
drop trigger if exists student_transactions_closed_guard on payments.student_transactions;
create trigger student_transactions_closed_guard before update or delete on payments.student_transactions for each row execute function payments.prevent_closed_period_mutation();
drop trigger if exists teacher_transactions_closed_guard on payments.teacher_transactions;
create trigger teacher_transactions_closed_guard before update or delete on payments.teacher_transactions for each row execute function payments.prevent_closed_period_mutation();

-- Serialize paid-total checks with transaction inserts, which lock the parent row.
create or replace function payments.prevent_override_below_paid() returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  paid bigint;
  due bigint;
begin
  if tg_table_name = 'student_charges' then
    if new.override_amount_cents is not distinct from old.override_amount_cents and new.calculated_amount_cents = old.calculated_amount_cents then return new; end if;
    perform 1 from payments.student_charges where id = new.id for update;
    select coalesce(sum(amount_cents), 0) into paid from payments.student_transactions where charge_id = new.id;
    due := coalesce(new.override_amount_cents, new.calculated_amount_cents);
  else
    if new.override_amount_cents is not distinct from old.override_amount_cents and new.calculated_amount_cents = old.calculated_amount_cents then return new; end if;
    perform 1 from payments.teacher_settlements where id = new.id for update;
    select coalesce(sum(amount_cents), 0) into paid from payments.teacher_transactions where settlement_id = new.id;
    due := coalesce(new.override_amount_cents, new.calculated_amount_cents);
  end if;
  if paid > due then raise exception using errcode = '23514', message = 'El importe no puede quedar por debajo de lo ya cobrado o pagado'; end if;
  return new;
end
$$;
drop trigger if exists student_charge_override_guard on payments.student_charges;
create trigger student_charge_override_guard before update of override_amount_cents, calculated_amount_cents on payments.student_charges for each row execute function payments.prevent_override_below_paid();
drop trigger if exists teacher_settlement_override_guard on payments.teacher_settlements;
create trigger teacher_settlement_override_guard before update of override_amount_cents, calculated_amount_cents on payments.teacher_settlements for each row execute function payments.prevent_override_below_paid();

-- Ensure a settings row exists before generating a teacher settlement. This
-- prevents an INNER JOIN from silently producing zero-valued settlements.
create or replace function payments.ensure_open_period(p_period date) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare period_id uuid;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para pagos';
  end if;
  if p_period <> date_trunc('month', p_period)::date then
    raise exception using errcode = '22023', message = 'El periodo debe ser el primer día del mes';
  end if;
  insert into payments.settings(organization_id) values ((select core.current_org()))
    on conflict (organization_id) do nothing;
  insert into payments.billing_periods(organization_id, period)
    values ((select core.current_org()), p_period)
    on conflict (organization_id, period) do update set period = excluded.period
    returning id into period_id;
  if exists (select 1 from payments.billing_periods where id = period_id and status = 'closed') then
    raise exception using errcode = '55000', message = 'El periodo está cerrado';
  end if;
  return period_id;
end
$$;

-- Remove the stale unused variable while keeping the existing settlement logic.
create or replace function payments.generate_teacher_settlements(p_period date) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  org_id uuid := (select core.current_org());
  period_id uuid;
  teacher_row record;
  v_settlement_id uuid;
  made integer := 0;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para pagos';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(org_id::text || p_period::text, 1));
  period_id := payments.ensure_open_period(p_period);
  for teacher_row in
    select distinct s.teacher_id
    from classes.sessions s
    join core.clubs c on c.id = s.club_id
    where s.organization_id = org_id
      and (s.starts_at at time zone c.timezone)::date >= p_period
      and (s.starts_at at time zone c.timezone)::date < (p_period + interval '1 month')::date
      and s.status = 'completed'
  loop
    insert into payments.teacher_settlements(organization_id, teacher_id, period)
    values (org_id, teacher_row.teacher_id, p_period)
    on conflict (teacher_id, period) do update set updated_at = now()
      where not exists (select 1 from payments.billing_periods where id = period_id and status = 'closed')
        and not exists (select 1 from payments.teacher_transactions tx where tx.settlement_id = payments.teacher_settlements.id)
    returning id into v_settlement_id;
    if v_settlement_id is not null then
      delete from payments.teacher_settlement_lines where settlement_id = v_settlement_id;
      insert into payments.teacher_settlement_lines(settlement_id, session_id, session_starts_at, duration_minutes, enrolled_count, rate_per_hour_cents, amount_cents)
      select v_settlement_id, s.id, s.starts_at, extract(epoch from (s.ends_at - s.starts_at))::int / 60, count(ss.student_id)::smallint,
        case when count(ss.student_id) >= coalesce(tr.student_threshold, ps.teacher_student_threshold) then coalesce(tr.threshold_rate_cents, ps.teacher_rate_threshold_cents) else coalesce(tr.below_threshold_cents, ps.teacher_rate_below_cents) end,
        round((case when count(ss.student_id) >= coalesce(tr.student_threshold, ps.teacher_student_threshold) then coalesce(tr.threshold_rate_cents, ps.teacher_rate_threshold_cents) else coalesce(tr.below_threshold_cents, ps.teacher_rate_below_cents) end)::numeric * extract(epoch from (s.ends_at - s.starts_at)) / 3600)::int
      from classes.sessions s
      left join classes.session_students ss on ss.session_id = s.id
      join payments.settings ps on ps.organization_id = s.organization_id
      left join payments.teacher_rates tr on tr.teacher_id = s.teacher_id
      join core.clubs c on c.id = s.club_id
      where s.teacher_id = teacher_row.teacher_id and s.organization_id = org_id and s.status = 'completed'
        and (s.starts_at at time zone c.timezone)::date >= p_period
        and (s.starts_at at time zone c.timezone)::date < (p_period + interval '1 month')::date
      group by s.id, s.starts_at, s.ends_at, tr.student_threshold, tr.threshold_rate_cents, tr.below_threshold_cents,
        ps.teacher_student_threshold, ps.teacher_rate_threshold_cents, ps.teacher_rate_below_cents;
      update payments.teacher_settlements ts
      set calculated_amount_cents = coalesce((select sum(line.amount_cents) from payments.teacher_settlement_lines line where line.settlement_id = ts.id), 0), updated_at = now()
      where ts.id = v_settlement_id;
      made := made + 1;
    end if;
    v_settlement_id := null;
  end loop;
  return made;
end
$$;

-- Keep student and tariff creation in one transaction.
create or replace function payments.create_student_with_tariff(
  p_club_id uuid,
  p_first_name text,
  p_last_name text,
  p_birth_date date,
  p_category core.student_category,
  p_gender core.student_gender,
  p_level core.student_level,
  p_email text,
  p_phone text,
  p_tariff_id uuid,
  p_starts_on date
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  org uuid := (select core.current_org());
  tariff_category core.student_category;
  new_student_id uuid;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para crear alumnos con tarifa';
  end if;
  if org is null then raise exception using errcode = '42501', message = 'Organización no disponible'; end if;
  select category into tariff_category from payments.tariffs
    where id = p_tariff_id and organization_id = org and active;
  if tariff_category is null or tariff_category <> p_category then
    raise exception using errcode = '23514', message = 'La tarifa debe estar activa y coincidir con la categoría del alumno';
  end if;
  insert into core.students(organization_id, club_id, first_name, last_name, birth_date, category, gender, level, email, phone)
  values (org, p_club_id, p_first_name, p_last_name, p_birth_date, p_category, p_gender, p_level, nullif(p_email, ''), nullif(p_phone, ''))
  returning id into new_student_id;
  insert into payments.student_tariffs(student_id, tariff_id, starts_on)
  values (new_student_id, p_tariff_id, p_starts_on);
  return new_student_id;
end
$$;

-- Group and member inserts either all succeed or all roll back.
create or replace function classes.create_group(
  p_name text,
  p_club_id uuid,
  p_teacher_id uuid,
  p_category core.student_category,
  p_level core.student_level,
  p_weekday smallint,
  p_start_time time,
  p_duration_minutes smallint,
  p_capacity smallint,
  p_starts_on date,
  p_ends_on date,
  p_student_ids uuid[]
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  org uuid := (select core.current_org());
  new_group_id uuid;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('classes')) then
    raise exception using errcode = '42501', message = 'No autorizado para crear grupos';
  end if;
  if org is null then raise exception using errcode = '42501', message = 'Organización no disponible'; end if;
  if coalesce(array_length(p_student_ids, 1), 0) > 16 then
    raise exception using errcode = '22023', message = 'El grupo no puede superar los 16 alumnos';
  end if;
  insert into classes.groups(organization_id, club_id, teacher_id, name, category, level, weekday, start_time, duration_minutes, capacity, starts_on, ends_on)
  values (org, p_club_id, p_teacher_id, p_name, p_category, p_level, p_weekday, p_start_time, p_duration_minutes, p_capacity, p_starts_on, p_ends_on)
  returning id into new_group_id;
  insert into classes.group_members(group_id, student_id, starts_on)
  select new_group_id, member.student_id, p_starts_on
  from (select distinct unnest(coalesce(p_student_ids, '{}'::uuid[])) as student_id) member;
  return new_group_id;
end
$$;

-- Change tariff atomically while serializing changes for the same student.
create or replace function payments.change_student_tariff(p_student_id uuid, p_tariff_id uuid, p_starts_on date)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  org uuid := (select core.current_org());
  student_category core.student_category;
  tariff_category core.student_category;
  current_assignment payments.student_tariffs%rowtype;
  ending_date date;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para cambiar tarifas';
  end if;
  select category into student_category from core.students
    where id = p_student_id and organization_id = org for update;
  select category into tariff_category from payments.tariffs
    where id = p_tariff_id and organization_id = org and active;
  if student_category is null or tariff_category is null or student_category <> tariff_category then
    raise exception using errcode = '23514', message = 'La tarifa debe estar activa y coincidir con la categoría del alumno';
  end if;
  select * into current_assignment from payments.student_tariffs
    where student_id = p_student_id and ends_on is null
    order by starts_on desc limit 1 for update;
  if found and current_assignment.starts_on >= p_starts_on then
    raise exception using errcode = '23514', message = 'La nueva tarifa debe empezar después de la tarifa actual';
  end if;
  if found then
    ending_date := p_starts_on - 1;
    update payments.student_tariffs set ends_on = ending_date where id = current_assignment.id;
  end if;
  insert into payments.student_tariffs(student_id, tariff_id, starts_on)
  values (p_student_id, p_tariff_id, p_starts_on);
end
$$;

-- Generate student charges and teacher settlements as one atomic operation.
create or replace function payments.generate_period_payments(p_period date)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para generar pagos';
  end if;
  perform payments.generate_student_charges(p_period);
  perform payments.generate_teacher_settlements(p_period);
end
$$;

grant execute on function payments.create_student_with_tariff(uuid,text,text,date,core.student_category,core.student_gender,core.student_level,text,text,uuid,date) to authenticated, service_role;
grant execute on function classes.create_group(text,uuid,uuid,core.student_category,core.student_level,smallint,time,smallint,smallint,date,date,uuid[]) to authenticated, service_role;
grant execute on function payments.change_student_tariff(uuid,uuid,date) to authenticated, service_role;
grant execute on function payments.generate_period_payments(date) to authenticated, service_role;
revoke execute on function payments.create_student_with_tariff(uuid,text,text,date,core.student_category,core.student_gender,core.student_level,text,text,uuid,date) from public, anon;
revoke execute on function classes.create_group(text,uuid,uuid,core.student_category,core.student_level,smallint,time,smallint,smallint,date,date,uuid[]) from public, anon;
revoke execute on function payments.change_student_tariff(uuid,uuid,date) from public, anon;
revoke execute on function payments.generate_period_payments(date) from public, anon;

-- A teacher settlement line is a permanent reference to a class and must not
-- silently outlive it.
alter table payments.teacher_settlement_lines
  add constraint teacher_settlement_lines_session_fk foreign key (session_id) references classes.sessions(id) on delete restrict not valid;

-- Cover foreign keys used by RLS, joins, and delete/update checks.
create index if not exists student_charge_lines_charge_idx on payments.student_charge_lines(charge_id);
create index if not exists student_charge_lines_tariff_idx on payments.student_charge_lines(tariff_id) where tariff_id is not null;
create index if not exists student_tariffs_tariff_idx on payments.student_tariffs(tariff_id);
create index if not exists student_transactions_created_by_idx on payments.student_transactions(created_by);
create index if not exists teacher_transactions_created_by_idx on payments.teacher_transactions(created_by);
create index if not exists teacher_settlement_lines_session_idx on payments.teacher_settlement_lines(session_id);

do $$
declare extension_schema text;
begin
  select n.nspname into extension_schema
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'btree_gist';
  if extension_schema is not null and extension_schema <> 'extensions' then
    execute 'alter extension btree_gist set schema extensions';
  end if;
end
$$;

-- Trigger functions are callable only through their table triggers.
revoke all on function core.prevent_profile_role_escalation() from public, anon, authenticated;
revoke all on function core.enforce_tenant_integrity() from public, anon, authenticated;
revoke all on function core.validate_club_timezone() from public, anon, authenticated;
revoke all on function classes.validate_session_student_category() from public, anon, authenticated;
revoke all on function payments.validate_transaction() from public, anon, authenticated;
revoke all on function payments.prevent_closed_period_mutation() from public, anon, authenticated;
revoke all on function payments.prevent_override_below_paid() from public, anon, authenticated;

-- New exposed-schema tables must opt in to authenticated grants explicitly.
alter default privileges in schema core revoke select, insert, update, delete on tables from authenticated;
alter default privileges in schema classes revoke select, insert, update, delete on tables from authenticated;
alter default privileges in schema payments revoke select, insert, update, delete on tables from authenticated;
revoke usage on schema core, classes, payments from anon;
grant usage on schema core, classes, payments to authenticated, service_role;

select pg_notify('pgrst', 'reload schema');
