-- M4 Motor AI — contexto de usuario, límites y cierre de fases
-- Migration 004: user_profile_tags + columnas de soporte en idea_sessions
-- Diseñado: 26-abr-2026

-- ============================================================
-- 1. Tabla de tags de perfil de usuario
-- ============================================================
create table if not exists public.user_profile_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null,
  category text not null, -- 'habilidad' | 'industria' | 'interes' | 'contexto'
  source text not null default 'ai', -- 'ai' (detectado) | 'user' (agregado manualmente)
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evitar duplicados por usuario+tag
create unique index idx_user_profile_tags_user_tag
  on public.user_profile_tags(user_id, tag);

-- Búsqueda por usuario
create index idx_user_profile_tags_user
  on public.user_profile_tags(user_id);

-- RLS: cada usuario solo ve/edita sus propios tags
alter table public.user_profile_tags enable row level security;

create policy "Usuarios ven sus propios tags"
  on public.user_profile_tags for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propios tags"
  on public.user_profile_tags for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan sus propios tags"
  on public.user_profile_tags for update
  using (auth.uid() = user_id);

create policy "Usuarios borran sus propios tags"
  on public.user_profile_tags for delete
  using (auth.uid() = user_id);

-- ============================================================
-- 2. Columnas adicionales en idea_sessions
-- ============================================================
alter table public.idea_sessions
  add column if not exists phase_summary text,
  add column if not exists next_step text;

comment on column public.idea_sessions.phase_summary is
  'Resumen generado por la AI al cerrar una sesión';

comment on column public.idea_sessions.next_step is
  'Próximo paso concreto generado por la AI al cerrar la sesión';
