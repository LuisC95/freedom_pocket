-- Persisted session state for AI-guided flow + pinned context controls

alter table public.idea_sessions
  add column if not exists current_phase text;

alter table public.idea_sessions
  add column if not exists ready_to_save boolean not null default false;

update public.idea_sessions
set current_phase = case entry_point
  when 'sin_idea' then 'observar'
  when 'idea_vaga' then 'definir'
  when 'idea_clara' then 'evaluar'
  else 'observar'
end
where current_phase is null;

alter table public.idea_sessions
  alter column current_phase set default 'observar';

alter table public.idea_sessions
  alter column current_phase set not null;

alter table public.idea_session_messages
  add column if not exists is_pinned boolean not null default false;

alter table public.idea_session_messages
  add column if not exists pinned_at timestamptz;

alter table public.idea_session_messages
  add column if not exists pinned_by uuid references auth.users(id) on delete set null;

create index if not exists idea_session_messages_session_pinned_idx
  on public.idea_session_messages (session_id, is_pinned, sequence_order);

create index if not exists idea_session_messages_session_created_idx
  on public.idea_session_messages (session_id, created_at desc);
