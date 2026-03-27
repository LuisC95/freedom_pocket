-- ─────────────────────────────────────────────────────────────────────────────
-- Fastlane Compass — core schema
-- ─────────────────────────────────────────────────────────────────────────────

-- ── periods ──────────────────────────────────────────────────────────────────
create table public.periods (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  label       text        not null,                          -- "Marzo 2026"
  start_date  date        not null,
  end_date    date        not null,
  is_active   boolean     not null default false,
  created_at  timestamptz not null default now(),

  constraint periods_dates_check check (end_date >= start_date)
);

-- Solo un periodo activo por usuario
create unique index periods_one_active_per_user
  on public.periods (user_id)
  where (is_active = true);

create index periods_user_id_idx on public.periods (user_id);


-- ── transactions ─────────────────────────────────────────────────────────────
create table public.transactions (
  id          uuid           primary key default gen_random_uuid(),
  user_id     uuid           not null references auth.users(id) on delete cascade,
  period_id   uuid           not null references public.periods(id) on delete cascade,
  type        text           not null check (type in ('income', 'expense')),
  amount      numeric(12, 2) not null check (amount > 0),
  category    text           not null,
  description text           not null default '',
  date        date           not null,
  created_at  timestamptz    not null default now()
);

create index transactions_user_period_idx  on public.transactions (user_id, period_id);
create index transactions_user_period_type on public.transactions (user_id, period_id, type);
create index transactions_date_idx         on public.transactions (date desc);


-- ── budgets ───────────────────────────────────────────────────────────────────
create table public.budgets (
  id          uuid           primary key default gen_random_uuid(),
  user_id     uuid           not null references auth.users(id) on delete cascade,
  period_id   uuid           not null references public.periods(id) on delete cascade,
  category    text           not null,
  amount      numeric(12, 2) not null check (amount > 0),
  created_at  timestamptz    not null default now(),

  -- Una sola fila por categoría dentro del mismo periodo
  unique (user_id, period_id, category)
);

create index budgets_user_period_idx on public.budgets (user_id, period_id);


-- ── real_hours ────────────────────────────────────────────────────────────────
create table public.real_hours (
  id            uuid           primary key default gen_random_uuid(),
  user_id       uuid           not null references auth.users(id) on delete cascade,
  period_id     uuid           not null references public.periods(id) on delete cascade,
  hours_worked  numeric(6, 2)  not null check (hours_worked > 0),
  created_at    timestamptz    not null default now()
);

create index real_hours_user_period_idx on public.real_hours (user_id, period_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.periods      enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;
alter table public.real_hours   enable row level security;

-- periods
create policy "periods: owner access"
  on public.periods for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- transactions
create policy "transactions: owner access"
  on public.transactions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- budgets
create policy "budgets: owner access"
  on public.budgets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- real_hours
create policy "real_hours: owner access"
  on public.real_hours for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
