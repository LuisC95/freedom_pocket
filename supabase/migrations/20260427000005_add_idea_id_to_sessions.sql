-- Migration 005: Add missing idea_id column to idea_sessions
-- La tabla idea_sessions se creó sin la columna idea_id.
-- El código M4 asume que existe. Esta migración la agrega.

alter table public.idea_sessions
  add column if not exists idea_id uuid references public.ideas(id) on delete cascade;

-- Las sesiones existentes quedarán con idea_id = null.
-- Se requiere idea_id para nuevas sesiones.
-- Las queries existentes filtran por idea_id, así que rows null simplemente
-- no aparecerán hasta que se vinculen.

create index if not exists idea_sessions_idea_id_idx
  on public.idea_sessions (idea_id);
