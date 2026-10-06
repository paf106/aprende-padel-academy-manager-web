-- Transactions are an append-only audit ledger, not editable balances.
drop policy if exists payments_admin_student_transactions on payments.student_transactions;
drop policy if exists payments_admin_teacher_transactions on payments.teacher_transactions;
create policy student_transactions_admin_select on payments.student_transactions for select to authenticated
  using (exists(select 1 from payments.student_charges c where c.id=charge_id and (select core.admin_org_check(c.organization_id)) and (select core.module_enabled('payments'))));
create policy student_transactions_admin_insert on payments.student_transactions for insert to authenticated
  with check (exists(select 1 from payments.student_charges c where c.id=charge_id and (select core.admin_org_check(c.organization_id)) and (select core.module_enabled('payments'))) and created_by=(select auth.uid()));
create policy teacher_transactions_admin_select on payments.teacher_transactions for select to authenticated
  using (exists(select 1 from payments.teacher_settlements s where s.id=settlement_id and (select core.admin_org_check(s.organization_id)) and (select core.module_enabled('payments'))));
create policy teacher_transactions_admin_insert on payments.teacher_transactions for insert to authenticated
  with check (exists(select 1 from payments.teacher_settlements s where s.id=settlement_id and (select core.admin_org_check(s.organization_id)) and (select core.module_enabled('payments'))) and created_by=(select auth.uid()));
select pg_notify('pgrst','reload schema');
