-- M4 v2 — Mapa, Cazador, Banco de Ideas y Sprints
-- Diseñado: 29-abr-2026

alter table public.profiles
  add column if not exists occupation text;

comment on column public.profiles.occupation is
  'Ocupación del usuario. Alimenta la personalización del Mapa de Oportunidades.';

alter table public.ideas
  add column if not exists source text not null default 'manual',
  add column if not exists potential_score integer,
  add column if not exists discard_reason text;

update public.ideas
set source = 'manual'
where source is null;

update public.ideas
set status = case
  when status in ('generated', 'committed', 'validando') then 'nueva'
  when status = 'construyendo' then 'en_sprint'
  when status = 'operando' then 'promovida'
  when status = 'discarded' then 'descartada'
  else status
end
where status in ('generated', 'committed', 'validando', 'construyendo', 'operando', 'discarded');

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.ideas'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.ideas drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.ideas'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source%'
  loop
    execute format('alter table public.ideas drop constraint %I', constraint_name);
  end loop;
end $$;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.ideas'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%potential_score%'
  loop
    execute format('alter table public.ideas drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.ideas
  add constraint ideas_status_check
    check (status in ('nueva', 'en_sprint', 'sprint_completado', 'promovida', 'descartada')),
  add constraint ideas_source_check
    check (source in ('cazador', 'mapa', 'manual')),
  add constraint ideas_potential_score_check
    check (potential_score is null or potential_score between 0 and 100);

alter table public.ideas alter column status set default 'nueva';
alter table public.ideas alter column source set default 'manual';
alter table public.ideas alter column source set not null;

create table if not exists public.observation_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  idea_id uuid references public.ideas(id) on delete set null,
  observation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_observation_patterns on public.observation_patterns;
create trigger set_updated_at_observation_patterns
  before update on public.observation_patterns
  for each row execute function public.update_updated_at_column();

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  category text,
  potential_score integer check (potential_score between 0 and 100),
  pattern_id uuid references public.observation_patterns(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  tasks_json jsonb not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.sprints.tasks_json is
  'Array de 5 tareas generadas por AI. Estructura: [{day_number, emoji, title, task, duration_minutes, detail, goal}]';

create table if not exists public.sprint_day_progress (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 5),
  notes text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (sprint_id, day_number)
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null default 'cazador' check (feature in ('cazador')),
  current_count integer not null default 0,
  longest_count integer not null default 0,
  last_activity date,
  unique (user_id, feature)
);

create index if not exists idx_observations_user_date
  on public.observations(user_id, created_at desc);

create index if not exists idx_observation_patterns_user_date
  on public.observation_patterns(user_id, created_at desc);

create index if not exists idx_sprints_user
  on public.sprints(user_id);

create index if not exists idx_sprints_idea
  on public.sprints(idea_id);

create index if not exists idx_sprint_day_progress_sprint
  on public.sprint_day_progress(sprint_id, day_number);

alter table public.observations enable row level security;
alter table public.observation_patterns enable row level security;
alter table public.sprints enable row level security;
alter table public.sprint_day_progress enable row level security;
alter table public.streaks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'observations' and policyname = 'Users manage own observations') then
    create policy "Users manage own observations"
      on public.observations for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'observation_patterns' and policyname = 'Users manage own observation patterns') then
    create policy "Users manage own observation patterns"
      on public.observation_patterns for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sprints' and policyname = 'Users manage own sprints') then
    create policy "Users manage own sprints"
      on public.sprints for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sprint_day_progress' and policyname = 'Users manage progress for own sprints') then
    create policy "Users manage progress for own sprints"
      on public.sprint_day_progress for all
      using (
        exists (
          select 1 from public.sprints
          where sprints.id = sprint_day_progress.sprint_id
            and sprints.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.sprints
          where sprints.id = sprint_day_progress.sprint_id
            and sprints.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'streaks' and policyname = 'Users manage own streaks') then
    create policy "Users manage own streaks"
      on public.streaks for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
