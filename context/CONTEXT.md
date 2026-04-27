# Freedom Pocket — Contexto de Desarrollo

## Estado Actual (26-abr-2026, 19:35 ET)

### Git
- Branch: `main`
- HEAD: `152cb62` feat(ideas): implementar M4 Motor AI
- Remoto: `origin/main` (push exitoso)

### Módulos implementados
| Módulo | Estado | Commit |
|--------|--------|--------|
| Login/Auth (Clerk) | Legacy | — |
| PDF Reader (mi-realidad) | Reparado | e0654ba, fe54dfc |
| M4 Ideas UI | ✅ Completo | 8e69d41 |
| M4 Motor AI | ✅ Completo | 152cb62 |

### M4 Ideas — Componentes UI
- `src/modules/ideas/components/IdeasPage.tsx` — tablero principal con 3 zonas + 4 filtros
- `src/modules/ideas/components/IdeaCard.tsx` — card con score, status, activity dot, next step
- `src/modules/ideas/components/IdeaDetail.tsx` — bottom sheet con stats + next step hero
- `src/modules/ideas/components/NewIdeaSheet.tsx` — 3 entry points (No sé/Vaga/Clara)
- `src/modules/ideas/components/ScoreBadge.tsx` — badge colorizado por rango de score
- `src/modules/ideas/components/ActivityDot.tsx` — indicador de actividad reciente
- `src/modules/ideas/components/IdeasList.tsx` — versión legacy refactorizada
- `src/app/(protected)/ideas/page.tsx` — SSR que pasa data a IdeasPage

### M4 Ideas — Motor AI
- `src/modules/ideas/ai/context.ts` — buildUserContext() + extractAndSaveProfileTags()
- `src/modules/ideas/ai/summary.ts` — generatePhaseSummary() con AI + persistencia
- `src/modules/ideas/ai/resolver.ts` — resuelve proveedor AI
- `src/modules/ideas/ai/structured.ts` — parsea bloque META de la AI
- `src/modules/ideas/ai/prompts.ts` — system prompts por fase + output contract
- `src/modules/ideas/ai/usage.ts` — tracking de tokens
- `src/modules/ideas/ai/provider.ts` — normalizeProviderForStorage

### M4 Ideas — Server Actions
- `src/modules/ideas/actions/messages.ts` — sendMessage con contexto + límites + ready_to_save
- `src/modules/ideas/actions/sessions.ts` — CRUD + completeSession con summary automático
- `src/modules/ideas/actions/tags.ts` — CRUD de user_profile_tags
- `src/modules/ideas/actions/phases.ts` — gestión de cambio de fase
- `src/modules/ideas/actions/ideas.ts` — guardar ideas

### DB (Supabase)
- `user_profile_tags` ✅ migración aplicada
- `idea_sessions.phase_summary` ✅ columna agregada
- `idea_sessions.next_step` ✅ columna agregada

### Handoffs recibidos (diseño pendiente)
- `context/HANDOFF_M4_UX.md` — UI implementada al 100%
- `context/HANDOFF_M4_MOTOR_AI.md` — Motor AI implementado al 100%
- **Pendiente**: Diseñar UI/UX del chat AI (burbujas, input, opciones META, indicador de límites)
