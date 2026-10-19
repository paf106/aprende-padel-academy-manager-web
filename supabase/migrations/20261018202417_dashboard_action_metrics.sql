create or replace function core.dashboard_action_metrics(p_period date)
returns table (
  pending_attendance_sessions bigint,
  students_without_tariff bigint,
  unpaid_student_charges bigint,
  outstanding_student_cents bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_org_id uuid := (select core.current_org());
  pending_sessions bigint := 0;
  missing_tariffs bigint := 0;
  unpaid_count bigint := 0;
  outstanding_cents bigint := 0;
begin
  if not (select core.is_admin()) then
    raise exception using errcode = '42501', message = 'No autorizado para consultar el resumen';
  end if;
  if p_period <> pg_catalog.date_trunc('month', p_period)::date then
    raise exception using errcode = '22023', message = 'El periodo debe ser el primer día del mes';
  end if;

  if (select core.module_enabled('classes')) then
    select count(*)::bigint into pending_sessions
    from classes.sessions s
    where s.organization_id = current_org_id
      and s.status = 'completed'
      and s.ends_at < pg_catalog.now()
      and exists (
        select 1
        from classes.session_students ss
        left join classes.attendance a on a.session_id = ss.session_id and a.student_id = ss.student_id
        where ss.session_id = s.id and a.student_id is null
      );
  end if;

  if (select core.module_enabled('payments')) then
    select count(*)::bigint into missing_tariffs
    from core.students student
    join core.clubs club on club.id = student.club_id and club.organization_id = student.organization_id
    where student.organization_id = current_org_id
      and student.active
      and not exists (
        select 1
        from payments.student_tariffs assignment
        join payments.tariffs tariff on tariff.id = assignment.tariff_id and tariff.active
        where assignment.student_id = student.id
          and assignment.starts_on <= (pg_catalog.now() at time zone club.timezone)::date
          and (assignment.ends_on is null or assignment.ends_on >= (pg_catalog.now() at time zone club.timezone)::date)
      );

    select count(*) filter (where due_cents > paid_cents)::bigint,
      coalesce(sum(greatest(due_cents - paid_cents, 0)), 0)::bigint
    into unpaid_count, outstanding_cents
    from (
      select coalesce(charge.override_amount_cents, charge.calculated_amount_cents)::bigint as due_cents,
        coalesce((select sum(transaction.amount_cents) from payments.student_transactions transaction where transaction.charge_id = charge.id), 0)::bigint as paid_cents
      from payments.student_charges charge
      where charge.organization_id = current_org_id and charge.period = p_period
    ) amounts;
  end if;

  return query select pending_sessions, missing_tariffs, unpaid_count, outstanding_cents;
end
$$;

revoke all on function core.dashboard_action_metrics(date) from public, anon;
grant execute on function core.dashboard_action_metrics(date) to authenticated;
select pg_notify('pgrst', 'reload schema');
