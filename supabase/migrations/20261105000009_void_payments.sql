-- Payments are never edited or deleted. A payment entered by mistake is voided with a new row that points to it,
-- and neither of the two counts in the account balance.
alter table payments.payments add column reverses_id uuid references payments.payments (id) on delete restrict;
alter table payments.payments add column void_reason text not null default '';
alter table payments.payments add constraint payments_not_self_voiding check (reverses_id is null or reverses_id <> id);
create unique index payments_reverses_idx on payments.payments (reverses_id) where reverses_id is not null;
notify pgrst, 'reload schema';
