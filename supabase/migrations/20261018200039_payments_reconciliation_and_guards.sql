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
declare
  org_id uuid := (select core.current_org());
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para consultar pagos';
  end if;
  if p_period <> pg_catalog.date_trunc('month', p_period)::date then
    raise exception using errcode = '22023', message = 'El periodo debe ser el primer día del mes';
  end if;

  return query
  select
    coalesce((select sum(coalesce(c.override_amount_cents, c.calculated_amount_cents)) from payments.student_charges c where c.organization_id = org_id and c.period = p_period), 0)::bigint,
    coalesce((select sum(t.amount_cents) from payments.student_transactions t join payments.student_charges c on c.id = t.charge_id where c.organization_id = org_id and c.period = p_period), 0)::bigint,
    (select count(*) from payments.student_charges c where c.organization_id = org_id and c.period = p_period)::bigint,
    coalesce((select sum(coalesce(s.override_amount_cents, s.calculated_amount_cents)) from payments.teacher_settlements s where s.organization_id = org_id and s.period = p_period), 0)::bigint,
    coalesce((select sum(t.amount_cents) from payments.teacher_transactions t join payments.teacher_settlements s on s.id = t.settlement_id where s.organization_id = org_id and s.period = p_period), 0)::bigint,
    (select count(*) from payments.teacher_settlements s where s.organization_id = org_id and s.period = p_period)::bigint;
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

create or replace function classes.set_session_status(p_session_id uuid, p_status classes.session_status, p_reason text default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  session_row classes.sessions%rowtype;
begin
  if not (select core.is_admin()) then
    raise exception using errcode = '42501', message = 'Solo administración puede cambiar el estado';
  end if;
  if p_status = 'cancelled' and nullif(pg_catalog.btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'Indica el motivo de cancelación';
  end if;
  select * into session_row
  from classes.sessions
  where id = p_session_id
    and organization_id = (select core.current_org())
    and (select core.module_enabled('classes'))
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Clase no encontrada';
  end if;
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
declare
  session_row classes.sessions%rowtype;
  club_timezone text;
begin
  if not (select core.is_admin()) then
    raise exception using errcode = '42501', message = 'Solo administración puede reprogramar';
  end if;
  if p_duration_minutes not between 30 and 180 then
    raise exception using errcode = '22023', message = 'Duración no válida';
  end if;
  select * into session_row
  from classes.sessions
  where id = p_session_id
    and organization_id = (select core.current_org())
    and (select core.module_enabled('classes'))
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Clase no encontrada';
  end if;
  if (select private.session_has_settlement(p_session_id)) then
    raise exception using errcode = '55000', message = 'No se puede reprogramar: la clase ya está incluida en una liquidación';
  end if;
  select c.timezone into club_timezone from core.clubs c where c.id = session_row.club_id;
  update classes.sessions
  set starts_at = p_local_start at time zone club_timezone,
      ends_at = (p_local_start + pg_catalog.make_interval(mins => p_duration_minutes)) at time zone club_timezone,
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
declare
  org_id uuid := (select core.current_org());
  period_id uuid;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then
    raise exception using errcode = '42501', message = 'No autorizado para generar pagos';
  end if;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(org_id::text || p_period::text, 1));
  period_id := payments.ensure_open_period(p_period);
  perform payments.generate_student_charges(p_period);
  perform payments.generate_teacher_settlements(p_period);

  update payments.student_charges charge
  set calculated_amount_cents = coalesce((select sum(tx.amount_cents) from payments.student_transactions tx where tx.charge_id = charge.id), 0),
      updated_at = pg_catalog.now()
  where charge.organization_id = org_id
    and charge.period = p_period
    and charge.override_amount_cents is null
    and exists (select 1 from payments.student_transactions tx where tx.charge_id = charge.id)
    and not exists (
      select 1
      from core.students student
      join payments.student_tariffs assignment on assignment.student_id = student.id
      join payments.tariffs tariff on tariff.id = assignment.tariff_id and tariff.active
      where student.id = charge.student_id
        and student.organization_id = org_id
        and student.active
        and assignment.starts_on < (p_period + interval '1 month')::date
        and coalesce(assignment.ends_on, 'infinity'::date) >= p_period
    );

  delete from payments.student_charges charge
  where charge.organization_id = org_id
    and charge.period = p_period
    and charge.override_amount_cents is null
    and not exists (select 1 from payments.student_transactions tx where tx.charge_id = charge.id)
    and not exists (
      select 1
      from core.students student
      join payments.student_tariffs assignment on assignment.student_id = student.id
      join payments.tariffs tariff on tariff.id = assignment.tariff_id and tariff.active
      where student.id = charge.student_id
        and student.organization_id = org_id
        and student.active
        and assignment.starts_on < (p_period + interval '1 month')::date
        and coalesce(assignment.ends_on, 'infinity'::date) >= p_period
    );

  delete from payments.teacher_settlement_lines line
  using payments.teacher_settlements settlement
  where settlement.id = line.settlement_id
    and settlement.organization_id = org_id
    and settlement.period = p_period
    and settlement.override_amount_cents is null
    and not exists (select 1 from payments.teacher_transactions tx where tx.settlement_id = settlement.id)
    and not exists (
      select 1 from classes.sessions session
      join core.clubs club on club.id = session.club_id
      where session.organization_id = org_id
        and session.teacher_id = settlement.teacher_id
        and session.status = 'completed'
        and (session.starts_at at time zone club.timezone)::date >= p_period
        and (session.starts_at at time zone club.timezone)::date < (p_period + interval '1 month')::date
    );

  update payments.teacher_settlements settlement
  set calculated_amount_cents = coalesce((select sum(tx.amount_cents) from payments.teacher_transactions tx where tx.settlement_id = settlement.id), 0),
      updated_at = pg_catalog.now()
  where settlement.organization_id = org_id
    and settlement.period = p_period
    and settlement.override_amount_cents is null
    and exists (select 1 from payments.teacher_transactions tx where tx.settlement_id = settlement.id)
    and not exists (
      select 1 from classes.sessions session
      join core.clubs club on club.id = session.club_id
      where session.organization_id = org_id
        and session.teacher_id = settlement.teacher_id
        and session.status = 'completed'
        and (session.starts_at at time zone club.timezone)::date >= p_period
        and (session.starts_at at time zone club.timezone)::date < (p_period + interval '1 month')::date
    );

  delete from payments.teacher_settlements settlement
  where settlement.organization_id = org_id
    and settlement.period = p_period
    and settlement.override_amount_cents is null
    and not exists (select 1 from payments.teacher_transactions tx where tx.settlement_id = settlement.id)
    and not exists (
      select 1 from classes.sessions session
      join core.clubs club on club.id = session.club_id
      where session.organization_id = org_id
        and session.teacher_id = settlement.teacher_id
        and session.status = 'completed'
        and (session.starts_at at time zone club.timezone)::date >= p_period
        and (session.starts_at at time zone club.timezone)::date < (p_period + interval '1 month')::date
    );
end
$$;

revoke all on function payments.period_totals(date) from public, anon;
grant execute on function payments.period_totals(date) to authenticated;
grant execute on function classes.set_session_status(uuid, classes.session_status, text) to authenticated;
grant execute on function classes.reschedule_session(uuid, timestamp, smallint, text) to authenticated;
grant execute on function payments.generate_period_payments(date) to authenticated, service_role;
revoke execute on function payments.generate_period_payments(date) from public, anon;
