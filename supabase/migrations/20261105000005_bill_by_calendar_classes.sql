-- The monthly fee is always the rate for the classes of the month: prorated when the month has fewer classes than
-- the fee covers, with the extra class charged when it has more. Discounts apply in the same month.
alter table payments.billing_settings
  drop column mode,
  drop column charge_extra_classes,
  drop column credit_timing;
notify pgrst, 'reload schema';
