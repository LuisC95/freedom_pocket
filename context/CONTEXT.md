# Freedom Pocket — Contexto de Desarrollo

## Estado Actual (29-abr-2026)

### Git
- Branch: `main`
- Base vigente: `9d06a76` — `Redesign M4 ideas workflow`
- Ajuste posterior: responsive/espaciado de M4 v2 con shell `ideas-v2-page` y mini chat reposicionado

### Commits recientes relevantes
| SHA | Descripción |
|-----|-------------|
| `9d06a76` | Rediseña M4 Ideas como flujo Mapa/Cazador/Banco/Sprint |
| `0bc9190` | Ajusta layout móvil del chat de ideas previo |
| `d0c91f9` | Último commit de M4 v1 conversacional en remoto antes del rediseño |

---

## M4 Ideas — Estado Vigente

M4 v1 fue reemplazado. El flujo anterior de chat por fases, resumen de idea, deep dive y transitions ya no es la interfaz principal.

### Filosofía v2
- El usuario típico es empleado y puede no tener una idea clara.
- La app empuja acción concreta, no una conversación larga.
- El módulo se divide en 4 pantallas conectadas:
  1. **Mapa de Oportunidades** — entrada personalizada usando datos de M1/M3.
  2. **Cazador de Problemas** — registrar observaciones/quejas reales.
  3. **Banco de Ideas** — crear, revisar y seleccionar ideas.
  4. **Sprint** — plan AI de 5 días para validar una idea.
- El chat queda como apoyo flotante contextual, no como protagonista.

### Rutas actuales
| Ruta | Componente | Propósito |
|------|------------|-----------|
| `/ideas` | `MapaPage` | Landing operativa del módulo con caminos sugeridos |
| `/ideas/cazador` | `CazadorPage` | Registro diario de observaciones y racha |
| `/ideas/banco` | `BancoPage` | Banco de ideas, filtros y creación manual |
| `/ideas/sprint/[sprintId]` | `SprintPage` | Ejecución del sprint de 5 días |
| `/ideas/new` | redirect | Redirige a `/ideas/banco` |
| `/ideas/[ideaId]` | redirect | Redirige a `/ideas/banco` |

Todas las rutas M4 usan `requireAdmin()` por ahora.

### Componentes actuales
- `MapaPage.tsx` — hero con hora real, horas libres, gap mensual y 3 caminos.
- `CazadorPage.tsx` — input de observaciones, racha, patrón detectado y lista.
- `BancoPage.tsx` — filtros, cards de ideas, modal de creación y lanzamiento de sprint.
- `SprintPage.tsx` — timeline de 5 días, notas, progreso y cierre/abandono.
- `MiniChat.tsx` — burbuja flotante con contexto por pantalla.

### Server Actions actuales
- `mapa.ts` — `getMapaData()`.
- `observations.ts` — `addObservation()`, `getObservations()`, `deleteObservation()`, `getStreak()`.
- `patterns.ts` — `detectPatterns()`, `getLatestPattern()`, `convertPatternToIdea()`.
- `ideas.ts` — `createIdea()`, `listIdeas()`, `updateIdea()`, `discardIdea()`.
- `sprints.ts` — `generateSprint()`, `getSprint()`, `getActiveSprintForIdea()`, `completeDayProgress()`, `updateDayNotes()`, `completeSprint()`, `abandonSprint()`.
- `chat.ts` — `sendChatMessage()` para el mini chat contextual.

### AI
- Se mantiene `src/modules/ideas/ai/provider.ts` con `AnthropicProvider` y `DeepSeekProvider`.
- El rediseño usa AI para:
  - Detectar patrones en observaciones.
  - Generar sprints de 5 días.
  - Responder el mini chat contextual.
- `ai_usage_logs` registra consumo con features:
  - `m4_pattern_detection`
  - `m4_sprint_generation`
  - `m4_mini_chat`

### Layout/UX
- Se agregó un shell responsive común `ideas-v2-page` para las rutas principales de M4.
- El shell define ancho máximo, padding lateral y padding inferior suficiente para bottom nav + mini chat.
- `MiniChat` usa clases `ideas-mini-chat-fab` y `ideas-mini-chat-panel` para respetar safe areas, bottom nav en móvil y sidebar en desktop.

---

## DB Esperada Para M4 v2

El código actual asume estas tablas/campos:

- `ideas`
  - Reutiliza `title`, `concept`, `business_model`, `status`.
  - Campos esperados adicionales/compatibles: `source`, `potential_score`, `discard_reason`.
- `observations`
  - `id`, `user_id`, `content`, `category`, `potential_score`, `pattern_id`, `created_at`.
- `observation_patterns`
  - `id`, `user_id`, `title`, `description`, `idea_id`, `observation_count`, `created_at`, `updated_at`.
- `sprints`
  - `id`, `user_id`, `idea_id`, `status`, `tasks_json`, `started_at`, `completed_at`, `created_at`.
- `sprint_day_progress`
  - `id`, `sprint_id`, `day_number`, `notes`, `completed`, `completed_at`, `created_at`.
- `streaks`
  - `id`, `user_id`, `feature`, `current_count`, `longest_count`, `last_activity`.

Pendiente confirmar/aplicar migraciones reales para estas tablas si no existen en Supabase.

---

## Verificación Reciente

- `npx tsc --noEmit` pasa limpio después del rediseño y después del ajuste responsive.
- El código local ya no referencia componentes principales de M4 v1 como `IdeaChat`, `IdeasPage`, `ChatPageClient`, `PhaseBar`, etc.

---

## Pendientes

- Confirmar que el deploy Vercel está usando `9d06a76` o superior.
- Aplicar/verificar schema DB para M4 v2.
- Probar end-to-end:
  - `/ideas`
  - `/ideas/cazador`
  - `/ideas/banco`
  - generación y ejecución de `/ideas/sprint/[sprintId]`
- Validar visualmente responsive en móvil y desktop después del shell `ideas-v2-page`.
- Si se conserva el nombre público del producto, revisar rebranding legal pre-deploy.
