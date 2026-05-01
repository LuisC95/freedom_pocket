-- Credit card limit tracking for Mi Brújula liabilities.

alter table public.liabilities
  add column if not exists credit_limit numeric(12, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'liabilities_credit_limit_non_negative'
  ) then
    alter table public.liabilities
      add constraint liabilities_credit_limit_non_negative
      check (credit_limit is null or credit_limit >= 0);
  end if;
end $$;
