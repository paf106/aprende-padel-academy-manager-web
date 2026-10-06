create or replace function classes.validate_group_member() returns trigger
language plpgsql set search_path = ''
as $$
declare g classes.groups%rowtype; s core.students%rowtype; n integer;
begin
 select * into g from classes.groups where id=new.group_id;
 select * into s from core.students where id=new.student_id;
 if g.id is null or s.id is null or g.organization_id<>s.organization_id or g.club_id<>s.club_id or g.category<>s.category then
   raise exception using errcode='23514',message='El alumno debe pertenecer al mismo club y categoría que el grupo';
 end if;
 select count(*) into n from classes.group_members gm where gm.group_id=new.group_id and gm.student_id<>new.student_id and gm.starts_on<=coalesce(new.ends_on,'infinity'::date) and coalesce(gm.ends_on,'infinity'::date)>=new.starts_on;
 if n>=g.capacity then raise exception using errcode='23514',message='El grupo ha alcanzado su aforo'; end if;
 return new;
end $$;

create or replace function payments.validate_transaction() returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare due integer; already_paid integer; period_date date; org uuid;
begin
  if tg_table_name='student_transactions' then
    select coalesce(c.override_amount_cents,c.calculated_amount_cents), c.period, c.organization_id into due,period_date,org from payments.student_charges c where c.id=new.charge_id for update;
    select coalesce(sum(t.amount_cents),0) into already_paid from payments.student_transactions t where t.charge_id=new.charge_id and (tg_op<>'UPDATE' or t.id<>new.id);
  else
    select coalesce(c.override_amount_cents,c.calculated_amount_cents), c.period, c.organization_id into due,period_date,org from payments.teacher_settlements c where c.id=new.settlement_id for update;
    select coalesce(sum(t.amount_cents),0) into already_paid from payments.teacher_transactions t where t.settlement_id=new.settlement_id and (tg_op<>'UPDATE' or t.id<>new.id);
  end if;
  if exists(select 1 from payments.billing_periods bp where bp.organization_id=org and bp.period=period_date and bp.status='closed') then raise exception using errcode='55000',message='El periodo está cerrado'; end if;
  if already_paid+new.amount_cents>due then raise exception using errcode='23514',message='El pago supera el saldo pendiente'; end if;
  return new;
end $$;
create trigger validate_student_transaction before insert or update on payments.student_transactions for each row execute function payments.validate_transaction();
create trigger validate_teacher_transaction before insert or update on payments.teacher_transactions for each row execute function payments.validate_transaction();
grant execute on function payments.validate_transaction() to service_role;
select pg_notify('pgrst','reload schema');
