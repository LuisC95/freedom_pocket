# Freedom Pocket — Contexto de Desarrollo

## Estado Actual (26-abr-2026, ~22:00 ET)

### Git
- Branch: `main`
- HEAD: `3523af1` feat: implementar chat M4, resumen, transición de fases y componentes UX
- Remoto: `origin/main` (push exitoso)

### Commits del día
| Commit | SHA | Descripción |
|--------|-----|-------------|
| 1 | e0654ba | pdf-parse → pdf2json |
| 2 | fe54dfc | text extraction manual |
| 3 | 8e69d41 | UI Ideas (tablero, cards, sheets) |
| 4 | 152cb62 | Motor AI (contexto, límites, tags, resumen) |
| 5 | 3523af1 | Chat UI, resumen, transición, fases |

### Módulos implementados
| Módulo | Estado | Commit |
|--------|--------|--------|
| Login/Auth (Clerk) | Legacy | — |
| PDF Reader (mi-realidad) | Reparado | e0654ba, fe54dfc |
| M4 Ideas UI Tablero | ✅ Completo | 8e69d41 |
| M4 Motor AI | ✅ Completo | 152cb62 |
| M4 Chat UI | ✅ Completo | 3523af1 |
| M4 Resumen Idea | ✅ Completo | 3523af1 |
| M4 Transición Fases | ✅ Completo | 3523af1 |

### M4 Ideas — Componentes UI
- `IdeasPage.tsx` — tablero principal con 3 zonas (En marcha / Por evaluar / Descartadas) + 4 filtros
- `IdeaCard.tsx` — card con score, status, activity dot, next step; variantes full y compact
- `IdeaDetail.tsx` — bottom sheet con stats + next step hero para click en card
- `NewIdeaSheet.tsx` — 3 entry points (No sé por dónde empezar / Tengo algo vago / Tengo una idea clara)
- `PhaseBar.tsx` — mini barra O-D-I-E para headers de chat y resumen
- `ChatBubble.tsx` — burbujas estilo coach (blanco redondeado) y usuario (verde gradiente)
- `TypingIndicator.tsx` — 3 dots animados + texto contextual rotativo
- `SuggestionChips.tsx` — 3 chips por fase para reducir bloqueo
- `PhaseTransition.tsx` — overlay full-screen con animaciones al completar fase
- `IdeaSummaryEntry.tsx` — pantalla de resumen de idea con estado de fases
- `ScoreBadge.tsx`, `ActivityDot.tsx`, `IdeasList.tsx`

### M4 Ideas — Páginas
- `/ideas` → Tablero con server-side data fetch
- `/ideas/[ideaId]` → Resumen de idea (última pregunta, fases completadas, continuar al chat)
- `/ideas/[ideaId]/chat` → Chat completo con coach AI

### M4 Ideas — Motor AI
- `context.ts` — buildUserContext() + extractAndSaveProfileTags()
- `summary.ts` — generatePhaseSummary() con AI + persistencia
- `resolver.ts` — resuelve proveedor AI
- `structured.ts` — parsea bloque META de la AI
- `prompts.ts` — system prompts socráticos por fase (observar/definir/idear/evaluar)
- `usage.ts` — tracking de tokens
- `provider.ts` — normalizeProviderForStorage

### M4 Ideas — Server Actions
- `messages.ts` — sendMessage con contexto + límites (6/px desde constants.ts) + ready_to_save
- `sessions.ts` — CRUD + completeSession con summary automático + tags extraction
- `tags.ts` — CRUD de user_profile_tags
- `phases.ts` — gestión de cambio de fase
- `ideas.ts` — guardar ideas

### DB (Supabase)
- `user_profile_tags` ✅ migración aplicada por Luis via Dashboard
- `idea_sessions.phase_summary` ✅ columna agregada
- `idea_sessions.next_step` ✅ columna agregada
- `idea_sessions.completed_at` ✅ columna agregada
- **Pendiente**: RLS policies para user_profile_tags (verificar si aplicadas)
- **Pendiente**: Función SQL `promote_idea_to_operando`

### Handoffs recibidos
- `context/HANDOFF_M4_UX.md` — UI implementada al 100%
- `context/HANDOFF_M4_MOTOR_AI.md` — Motor AI implementado al 100%
- `context/HANDOFF_M4_UNIFIED.md` — Unificado: todo implementado (chat, resume, fases, AI)
- `context/references/IdeasPageMockup.tsx` — Mockup de referencia guardado

### Flujo de usuario actual
1. Tablero: ve ideas agrupadas por zona (en marcha / por evaluar)
2. Click en card:
   - `generated` → navega directo al chat (fase observar)
   - `committed`, `validando`, `construyendo` → navega a resumen con estado de fases
   - `operando`, `discarded` → navega a resumen sin botón continuar
3. Chat: coach AI con contexto del usuario, sugerencias, contador de mensajes, límite por fase
4. Al completar fase: transición full-screen con resumen AI → siguiente fase o final

### Pendientes para próxima sesión
- Verificar RLS policies de user_profile_tags aplicadas correctamente
- Verificar build de Vercel
- Función SQL `promote_idea_to_operando` (diseño separado)
- End-to-end validation en preview
