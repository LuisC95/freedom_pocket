-- Conecta fases de ideación con resúmenes por fase + metadata UI estructurada
-- en los mensajes. Permite que la IA vea contexto previo sin arrastrar todo el
-- historial, y que emita opciones clickeables + sugerencias de transición.

alter table public.idea_sessions
  add column if not exists phase_summaries jsonb not null default '{}'::jsonb;

comment on column public.idea_sessions.phase_summaries is
  'Map phase_key -> { summary: text, generated_at: iso, model: text, tokens: int }';

alter table public.idea_session_messages
  add column if not exists ui_data jsonb;

comment on column public.idea_session_messages.ui_data is
  'Structured UI payload: { options?: {id,label,detail_prompt?}[], phase_ready?: {target,reason}|null, kind?: "phase_transition"|"option_click", from?, to?, summary? }';

create index if not exists idea_session_messages_ui_data_gin
  on public.idea_session_messages using gin (ui_data);
