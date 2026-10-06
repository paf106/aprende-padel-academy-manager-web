create or replace function payments.generate_student_charges(p_period date) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare org_id uuid := (select core.current_org()); period_id uuid; row record; v_charge_id uuid; made integer := 0;
begin
  if not (select core.is_admin()) or not (select core.module_enabled('payments')) then raise exception using errcode='42501', message='No autorizado para pagos'; end if;
  perform pg_advisory_xact_lock(hashtextextended(org_id::text||p_period::text,0));
  period_id := payments.ensure_open_period(p_period);
  for row in
    select distinct on (s.id) s.id student_id, st.id assignment_id, t.id tariff_id, t.name tariff_name, t.monthly_amount_cents
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
grant execute on function payments.generate_student_charges(date) to authenticated,service_role;
revoke execute on function payments.generate_student_charges(date) from public,anon;
select pg_notify('pgrst','reload schema');
