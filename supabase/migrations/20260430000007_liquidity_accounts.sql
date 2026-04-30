alter table public.assets
  add column if not exists institution text,
  add column if not exists liquidity_kind text check (liquidity_kind in ('bank', 'cash')),
  add column if not exists account_ownership text not null default 'regular' check (account_ownership in ('regular', 'joint')),
  add column if not exists household_manage_access boolean not null default true;

update public.assets
set liquidity_kind = 'bank',
    institution = coalesce(institution, name)
where is_liquid = true
  and liquidity_kind is null;

alter table public.transactions
  add column if not exists liquidity_asset_id uuid references public.assets(id) on delete set null,
  add column if not exists exclude_from_metrics boolean not null default false;

alter table public.income_entries
  add column if not exists liquidity_asset_id uuid references public.assets(id) on delete set null;

alter table public.recurring_templates
  add column if not exists payment_source text not null default 'cash_debit' check (payment_source in ('cash_debit', 'credit_card')),
  add column if not exists liability_id uuid references public.liabilities(id) on delete set null,
  add column if not exists liquidity_asset_id uuid references public.assets(id) on delete set null;

create table if not exists public.liquidity_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  asset_id uuid not null references public.assets(id) on delete cascade,
  movement_type text not null check (movement_type in ('income_deposit', 'expense_payment', 'credit_card_payment', 'cash_deposit', 'manual_adjustment')),
  amount numeric(12, 2) not null,
  currency text not null default 'USD',
  related_transaction_id uuid references public.transactions(id) on delete set null,
  related_income_entry_batch_id uuid,
  related_liability_id uuid references public.liabilities(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists liquidity_movements_asset_idx on public.liquidity_movements(asset_id, created_at desc);
create index if not exists liquidity_movements_user_idx on public.liquidity_movements(user_id, created_at desc);
create index if not exists transactions_liquidity_asset_idx on public.transactions(liquidity_asset_id);
create index if not exists income_entries_liquidity_asset_idx on public.income_entries(liquidity_asset_id);
create index if not exists recurring_templates_liquidity_asset_idx on public.recurring_templates(liquidity_asset_id);

alter table public.liquidity_movements enable row level security;

drop policy if exists "liquidity_movements: owner access" on public.liquidity_movements;
create policy "liquidity_movements: owner access"
  on public.liquidity_movements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
