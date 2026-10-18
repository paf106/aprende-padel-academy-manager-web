create or replace function payments.period_totals(p_period date)
returns table (
  student_due_cents bigint,
  student_paid_cents bigint,
  student_count bigint,
  teacher_due_cents bigint,
  teacher_paid_cents bigint,
  teacher_count bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare org_id uuid := (select core.current_org());
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para consultar pagos';
  end if;
  if p_period <> date_trunc('month', p_period)::date then
    raise exception using errcode = '22023', message = 'El periodo debe ser el primer día del mes';
  end if;
  return query select
    coalesce((select sum(coalesce(c.override_amount_cents, c.calculated_amount_cents)) from payments.student_charges c where c.organization_id = org_id and c.period = p_period), 0)::bigint,
    coalesce((select sum(t.amount_cents) from payments.student_transactions t join payments.student_charges c on c.id = t.charge_id where c.organization_id = org_id and c.period = p_period), 0)::bigint,
    (select count(*) from payments.student_charges c where c.organization_id = org_id and c.period = p_period)::bigint,
    coalesce((select sum(coalesce(s.override_amount_cents, s.calculated_amount_cents)) from payments.teacher_settlements s where s.organization_id = org_id and s.period = p_period), 0)::bigint,
    coalesce((select sum(t.amount_cents) from payments.teacher_transactions t join payments.teacher_settlements s on s.id = t.settlement_id where s.organization_id = org_id and s.period = p_period), 0)::bigint,
    (select count(*) from payments.teacher_settlements s where s.organization_id = org_id and s.period = p_period)::bigint;
end
$$;

create or replace function payments.period_payment_rows(
  p_period date,
  p_kind text,
  p_status text default 'all',
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  subject_id uuid,
  subject_name text,
  calculated_amount_cents integer,
  override_amount_cents integer,
  paid_amount_cents bigint,
  total_count bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  org_id uuid := (select core.current_org());
  normalized_search text := extensions.unaccent(pg_catalog.lower(pg_catalog.btrim(coalesce(p_search, ''))));
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para consultar pagos';
  end if;
  if p_period <> pg_catalog.date_trunc('month', p_period)::date then
    raise exception using errcode = '22023', message = 'El periodo debe ser el primer día del mes';
  end if;
  if p_kind not in ('student', 'teacher') or p_status not in ('all', 'pending', 'partial', 'paid', 'none') then
    raise exception using errcode = '22023', message = 'Filtro de pagos no válido';
  end if;

  if p_kind = 'student' then
    return query
    with paid as (
      select t.charge_id, sum(t.amount_cents)::bigint as amount
      from payments.student_transactions t
      group by t.charge_id
    ), base as (
      select c.id, c.student_id as subject_id, pg_catalog.concat_ws(' ', st.first_name, st.last_name) as subject_name,
        c.calculated_amount_cents, c.override_amount_cents, coalesce(paid.amount, 0)::bigint as paid_amount_cents,
        coalesce(c.override_amount_cents, c.calculated_amount_cents) as due_cents
      from payments.student_charges c
      join core.students st on st.id = c.student_id and st.organization_id = org_id
      left join paid on paid.charge_id = c.id
      where c.organization_id = org_id and c.period = p_period
        and (normalized_search = '' or pg_catalog.strpos(extensions.unaccent(pg_catalog.lower(pg_catalog.concat_ws(' ', st.first_name, st.last_name))), normalized_search) > 0)
    ), filtered as (
      select base.* from base
      where p_status = 'all'
        or (p_status = 'none' and base.due_cents = 0)
        or (p_status = 'paid' and base.due_cents > 0 and base.paid_amount_cents >= base.due_cents)
        or (p_status = 'partial' and base.paid_amount_cents > 0 and base.paid_amount_cents < base.due_cents)
        or (p_status = 'pending' and base.due_cents > base.paid_amount_cents and base.paid_amount_cents = 0)
    )
    select filtered.id, filtered.subject_id, filtered.subject_name, filtered.calculated_amount_cents,
      filtered.override_amount_cents, filtered.paid_amount_cents, count(*) over ()
    from filtered
    order by filtered.subject_name, filtered.id
    limit greatest(least(coalesce(p_limit, 50), 100), 1)
    offset greatest(coalesce(p_offset, 0), 0);
  else
    return query
    with paid as (
      select t.settlement_id, sum(t.amount_cents)::bigint as amount
      from payments.teacher_transactions t
      group by t.settlement_id
    ), base as (
      select s.id, s.teacher_id as subject_id, p.full_name as subject_name,
        s.calculated_amount_cents, s.override_amount_cents, coalesce(paid.amount, 0)::bigint as paid_amount_cents,
        coalesce(s.override_amount_cents, s.calculated_amount_cents) as due_cents
      from payments.teacher_settlements s
      join core.profiles p on p.id = s.teacher_id and p.organization_id = org_id
      left join paid on paid.settlement_id = s.id
      where s.organization_id = org_id and s.period = p_period
        and (normalized_search = '' or pg_catalog.strpos(extensions.unaccent(pg_catalog.lower(p.full_name)), normalized_search) > 0)
    ), filtered as (
      select base.* from base
      where p_status = 'all'
        or (p_status = 'none' and base.due_cents = 0)
        or (p_status = 'paid' and base.due_cents > 0 and base.paid_amount_cents >= base.due_cents)
        or (p_status = 'partial' and base.paid_amount_cents > 0 and base.paid_amount_cents < base.due_cents)
        or (p_status = 'pending' and base.due_cents > base.paid_amount_cents and base.paid_amount_cents = 0)
    )
    select filtered.id, filtered.subject_id, filtered.subject_name, filtered.calculated_amount_cents,
      filtered.override_amount_cents, filtered.paid_amount_cents, count(*) over ()
    from filtered
    order by filtered.subject_name, filtered.id
    limit greatest(least(coalesce(p_limit, 50), 100), 1)
    offset greatest(coalesce(p_offset, 0), 0);
  end if;
end
$$;

create or replace function private.session_has_settlement(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (select private.active_admin())
    and exists (
      select 1
      from payments.teacher_settlement_lines line
      join payments.teacher_settlements settlement on settlement.id = line.settlement_id
      where line.session_id = p_session_id
        and settlement.organization_id = (select private.active_org_id())
    )
$$;
revoke all on function private.session_has_settlement(uuid) from public, anon;
grant execute on function private.session_has_settlement(uuid) to authenticated, service_role;

-- Keep teacher settlement line validation separate: the shared tenant trigger
-- references student_charge_lines-only fields in a compound predicate.
create or replace function payments.validate_teacher_settlement_line()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  settlement_org uuid;
  settlement_teacher uuid;
  session_org uuid;
  session_teacher uuid;
  session_status classes.session_status;
begin
  select organization_id, teacher_id into settlement_org, settlement_teacher
  from payments.teacher_settlements where id = new.settlement_id;
  select organization_id, teacher_id, status into session_org, session_teacher, session_status
  from classes.sessions where id = new.session_id;
  if settlement_org is null or session_org is null or settlement_org <> session_org
    or settlement_org <> (select core.current_org()) or settlement_teacher is distinct from session_teacher then
    raise exception using errcode = '23514', message = 'La liquidación y la clase deben pertenecer al mismo profesor y organización';
  end if;
  if session_status <> 'completed' then
    raise exception using errcode = '23514', message = 'Solo se pueden liquidar clases terminadas';
  end if;
  return new;
end
$$;
drop trigger if exists teacher_settlement_lines_tenant_integrity on payments.teacher_settlement_lines;
create trigger teacher_settlement_lines_tenant_integrity
before insert or update on payments.teacher_settlement_lines
for each row execute function payments.validate_teacher_settlement_line();
revoke all on function payments.validate_teacher_settlement_line() from public, anon;
grant execute on function payments.validate_teacher_settlement_line() to authenticated, service_role;

create or replace function classes.set_session_status(p_session_id uuid, p_status classes.session_status, p_reason text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare session_row classes.sessions%rowtype;
begin
  if not (select core.is_admin()) then
    raise exception using errcode = '42501', message = 'Solo administración puede cambiar el estado';
  end if;
  if p_status = 'cancelled' and nullif(pg_catalog.btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'Indica el motivo de cancelación';
  end if;
  select * into session_row
  from classes.sessions
  where id = p_session_id and organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Clase no encontrada'; end if;
  if p_status is distinct from session_row.status and (select private.session_has_settlement(p_session_id)) then
    raise exception using errcode = '55000', message = 'No se puede cambiar el estado: la clase ya está incluida en una liquidación';
  end if;
  update classes.sessions
  set status = p_status,
      cancellation_reason = case when p_status = 'cancelled' then pg_catalog.btrim(p_reason) else null end
  where id = p_session_id;
end
$$;

create or replace function classes.reschedule_session(p_session_id uuid, p_local_start timestamp, p_duration_minutes smallint, p_notes text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare session_row classes.sessions%rowtype; club_timezone text; next_start timestamptz; next_end timestamptz;
begin
  if not (select core.is_admin()) then raise exception using errcode = '42501', message = 'Solo administración puede reprogramar'; end if;
  if p_duration_minutes not between 30 and 180 then raise exception using errcode = '22023', message = 'Duración no válida'; end if;
  select * into session_row
  from classes.sessions
  where id = p_session_id and organization_id = (select core.current_org()) and (select core.module_enabled('classes'))
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Clase no encontrada'; end if;
  select c.timezone into club_timezone from core.clubs c where c.id = session_row.club_id;
  next_start := p_local_start at time zone club_timezone;
  next_end := (p_local_start + pg_catalog.make_interval(mins => p_duration_minutes)) at time zone club_timezone;
  if (next_start is distinct from session_row.starts_at or next_end is distinct from session_row.ends_at)
    and (select private.session_has_settlement(p_session_id)) then
    raise exception using errcode = '55000', message = 'No se puede reprogramar: la clase ya está incluida en una liquidación';
  end if;
  update classes.sessions
  set starts_at = next_start,
      ends_at = next_end,
      notes = nullif(pg_catalog.btrim(p_notes), '')
  where id = session_row.id;
end
$$;

create or replace function payments.generate_period_payments(p_period date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare org_id uuid := (select core.current_org());
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para generar pagos';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(org_id::text || p_period::text, 1));
  perform payments.generate_student_charges(p_period);
  perform payments.generate_teacher_settlements(p_period);

  update payments.student_charges charge
  set calculated_amount_cents = coalesce((select sum(tx.amount_cents) from payments.student_transactions tx where tx.charge_id = charge.id), 0),
      updated_at = now()
  where charge.organization_id = org_id and charge.period = p_period and charge.override_amount_cents is null
    and exists (select 1 from payments.student_transactions tx where tx.charge_id = charge.id)
    and not exists (
      select 1 from core.students student
      join payments.student_tariffs assignment on assignment.student_id = student.id
      join payments.tariffs tariff on tariff.id = assignment.tariff_id and tariff.active
      where student.id = charge.student_id and student.organization_id = org_id and student.active
        and assignment.starts_on < (p_period + interval '1 month')::date
        and coalesce(assignment.ends_on, 'infinity'::date) >= p_period
    );
  delete from payments.student_charges charge
  where charge.organization_id = org_id and charge.period = p_period and charge.override_amount_cents is null
    and not exists (select 1 from payments.student_transactions tx where tx.charge_id = charge.id)
    and not exists (
      select 1 from core.students student
      join payments.student_tariffs assignment on assignment.student_id = student.id
      join payments.tariffs tariff on tariff.id = assignment.tariff_id and tariff.active
      where student.id = charge.student_id and student.organization_id = org_id and student.active
        and assignment.starts_on < (p_period + interval '1 month')::date
        and coalesce(assignment.ends_on, 'infinity'::date) >= p_period
    );

  delete from payments.teacher_settlement_lines line
  using payments.teacher_settlements settlement
  where settlement.id = line.settlement_id and settlement.organization_id = org_id and settlement.period = p_period
    and settlement.override_amount_cents is null
    and not exists (select 1 from payments.teacher_transactions tx where tx.settlement_id = settlement.id)
    and not exists (
      select 1 from classes.sessions session join core.clubs club on club.id = session.club_id
      where session.organization_id = org_id and session.teacher_id = settlement.teacher_id and session.status = 'completed'
        and (session.starts_at at time zone club.timezone)::date >= p_period
        and (session.starts_at at time zone club.timezone)::date < (p_period + interval '1 month')::date
    );
  update payments.teacher_settlements settlement
  set calculated_amount_cents = coalesce((select sum(tx.amount_cents) from payments.teacher_transactions tx where tx.settlement_id = settlement.id), 0),
      updated_at = now()
  where settlement.organization_id = org_id and settlement.period = p_period and settlement.override_amount_cents is null
    and exists (select 1 from payments.teacher_transactions tx where tx.settlement_id = settlement.id)
    and not exists (
      select 1 from classes.sessions session join core.clubs club on club.id = session.club_id
      where session.organization_id = org_id and session.teacher_id = settlement.teacher_id and session.status = 'completed'
        and (session.starts_at at time zone club.timezone)::date >= p_period
        and (session.starts_at at time zone club.timezone)::date < (p_period + interval '1 month')::date
    );
  delete from payments.teacher_settlements settlement
  where settlement.organization_id = org_id and settlement.period = p_period and settlement.override_amount_cents is null
    and not exists (select 1 from payments.teacher_transactions tx where tx.settlement_id = settlement.id)
    and not exists (
      select 1 from classes.sessions session join core.clubs club on club.id = session.club_id
      where session.organization_id = org_id and session.teacher_id = settlement.teacher_id and session.status = 'completed'
        and (session.starts_at at time zone club.timezone)::date >= p_period
        and (session.starts_at at time zone club.timezone)::date < (p_period + interval '1 month')::date
    );
end
$$;

revoke all on function payments.period_totals(date) from public, anon;
revoke all on function payments.period_payment_rows(date, text, text, text, integer, integer) from public, anon;
grant execute on function payments.period_totals(date) to authenticated;
grant execute on function payments.period_payment_rows(date, text, text, text, integer, integer) to authenticated;
grant execute on function classes.set_session_status(uuid, classes.session_status, text) to authenticated;
grant execute on function classes.reschedule_session(uuid, timestamp, smallint, text) to authenticated;
grant execute on function payments.generate_period_payments(date) to authenticated, service_role;
revoke execute on function payments.generate_period_payments(date) from public, anon;
select pg_notify('pgrst', 'reload schema');
