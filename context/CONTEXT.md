# Fastlane Compass — Contexto del Proyecto
## Estado: M1 ✅ · M2 ✅ · M3 ✅ · M4 (schema ✅ · UX ✅ · types ✅ · constants ✅ · actions ✅ · mappers ✅ · AIProvider ⏳) · Motor AI ❌

> Memoria activa del proyecto. Lo usan Claude.ai (planning) y Claude Code (implementación).

---

## Reglas de trabajo
- Paso a paso · preguntar antes de ejecutar
- Contraseña ejecución acelerada: **"al infinito y más allá"**
- Lenguaje aterrizado · en español
- Recomendar nueva conversación cuando el contexto se sature
- Visual-first: mockups > descripciones cuando aplica
- Presentar opciones antes de decidir

---

## Stack
| Elemento | Decisión |
|---|---|
| Framework | Next.js 14 (corriendo 16.2.1) |
| DB | Supabase PostgreSQL (project id en variables de entorno) |
| Estilos | Tailwind v3 + shadcn/ui preset Nova |
| Gráficas | Recharts |
| AI | Capa `AIProvider` multi-proveedor (Anthropic / OpenAI / Google) — ⏳ implementar |
| Deploy | Vercel |
| Moneda | ExchangeRate-API |

## Acceso Dev
- PIN: configurar `DEV_ACCESS_PIN_*` solo en variables de entorno
- DB: **service_role** via `createAdminClient()` — bypassa RLS siempre y solo debe usarse server-side
- `DEV_USER_ID_*`: configurar solo en variables de entorno
- Puerto: 3000

---

## Sistema de Diseño

### Paleta (nombres internos — ver Rebranding)
```
Base       #F2F7F4   Fondo general
Dark       #1A2520   Sidebar, hero cards
Acento     #2E7D52   CTAs, estado activo
Acento +   #3A9E6A   Hover, positivos
Surface    #EAF0EC   Mini cards, stats
Premium    #C69B30   Motor AI (gold)
Alerta     #E84434   Negativo, deudas
Texto      #141F19   Títulos, valores
Texto sec  #7A9A8A   Labels, metadata
Borde      #e0ebe4   Divisorias
```

**Tipografía:** IBM Plex Mono (números) · IBM Plex Sans (UI)
**Layout:** Desktop sidebar 68px · Mobile bottom nav 60px

**Patrones:**
- Página: `<div className="p-4 pb-8 max-w-2xl mx-auto">` + h1 22px + subtítulo 12px `#7A9A8A`
- Hero card: `bg-[#1A2520] rounded-xl px-[18px] py-[16px] mb-4`
- Modal: `fixed inset-0 z-50 … bg-black/60` → `bg-white rounded-2xl p-6 max-w-md`
- Section header: `text-[13px] font-semibold text-[#141F19]` + botón acción `text-[12px] text-[#2E7D52]`

---

## Módulos & Algoritmos

```
M0 Core · M1 Mi Realidad ✅ · M2 Dashboard ✅ · M3 Brújula ✅ · M4 Ideas 🔄 · Motor AI ❌
```

8 algoritmos: 1-Precio Real/Hora ✅ · 2-Tracker TX ✅ · 3-Autonomía ✅ · 4-Días Libertad ✅ · 5-Fórmula ✅ · 6-Score Progreso ✅ · 7-CENTS 🔄 · 8-Motor AI ❌

Onboarding: M1 → M2 (10 tx) → M3 → M4 (M3 + 1 meta).

---

## Base de Datos

- Migraciones aplicadas vía MCP `apply_migration` · `supabase/migrations|seed/` locales OBSOLETAS
- Todo `user_id` FK → `profiles.id`
- `update_updated_at_column()` vive en schema `public`
- **Generated types en `src/types/database.types.ts`** — regenerar vía MCP `generate_typescript_types` después de cada migración

| Módulo | Tablas |
|---|---|
| M0 | `profiles` *(+ `is_admin` bool)*, `user_settings`, `periods`, `module_unlocks`, `households`, `household_members` |
| M1 | `incomes`, `income_entries`, `real_hours` |
| M2 | `transaction_categories`, `recurring_templates`, `transactions`, `budgets` |
| M3 | `assets`, `asset_snapshots`, `liabilities`, `businesses`, `business_cents_scores`, `freedom_goals`, `progress_score_history` |
| M4 | `idea_sessions`, `ideas`, `idea_deep_dives`, `idea_session_messages` |
| Tiers | `user_subscriptions`, `user_api_keys`, `ai_usage_logs` |
| Motor AI | `ai_context_items`, `ai_recommendations` |

`is_admin=true` → exento de todos los límites de tier y AI.

---

## Estructura de Carpetas

```
src/
├── app/(protected)/            ← PIN auth + sidebar + bottom nav
│   ├── dashboard/page.tsx
│   ├── mi-realidad/page.tsx
│   ├── brujula/page.tsx
│   └── [ideas|motor-ai]/page.tsx
├── modules/
│   ├── mi-realidad/   types · actions (11) · components
│   ├── dashboard/     types · actions (14) · components
│   ├── brujula/       types · actions · components
│   └── ideas/         types ✅ · constants ✅ · mappers ✅ · actions ✅ · ai/ ⏳
├── types/
│   ├── actions.ts              ← ActionResult<T> global
│   └── database.types.ts       ← autogenerado por Supabase (NO editar a mano)
└── lib/
    ├── supabase/server.ts      ← createClient + createAdminClient
    └── dev-user.ts
```

---

# 🆕 MÓDULO 4 — Ideas de Negocio

## Filosofía
M4 es un **embudo**, no una pantalla. Implementa Algoritmo 7 (CENTS de DeMarco) en 4 fases:

```
Discovery → Ideation → Evaluación → Deep Dive → (promover a Operando = crea negocio en M3)
```

## Schema M4 (verificado 18-abr-2026)

### `idea_sessions`
| Col | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK profiles.id CASCADE | |
| `entry_point` | text NOT NULL | `sin_idea` / `idea_vaga` / `idea_clara` |
| `raw_input` | text | NOT NULL si entry_point != 'sin_idea' |
| `status` | text NOT NULL DEFAULT `in_progress` | `in_progress` / `completed` / `abandoned` |
| `started_at`, `completed_at` | timestamptz | |

### `ideas`
| Col | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK profiles.id CASCADE | |
| `session_id` | uuid FK idea_sessions.id SET NULL | nullable (ideas sueltas) |
| `title`, `concept` | text NOT NULL | |
| `need_identified`, `fastlane_potential` | text | nullable |
| `business_model` | text | `saas` / `producto_fisico` / `servicio` / `contenido` / `renta` / `custom` |
| `cents_score_{control,entry,need,time,scale}` | int 1-10 nullable | |
| `cents_preliminary_score` | **int GENERATED ALWAYS** | Suma 0-50, nunca escribir directo. `null` si no hay ningún score (preservado en mappers — ver C1 más abajo) |
| `status` | text DEFAULT `generated` | `generated` / `committed` / `validando` / `construyendo` / `operando` / `discarded` |
| `committed_at`, `promoted_at` | timestamptz nullable | |
| `discarded_at`, `discard_reason` | timestamptz + text nullable | Agregados 18-abr-2026 (migración `add_discard_fields_to_ideas`). Usados por `discardIdea`. |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

### `idea_deep_dives` (1-a-1 con ideas)
| Col | Pregunta UX (lenguaje plano) |
|---|---|
| `idea_id` FK | |
| `market_analysis` | ¿Cuánta gente tiene este problema? |
| `competition_analysis` | ¿Quién más intenta resolver esto? |
| `revenue_model` | ¿Cómo vas a cobrar? |
| `required_resources` | ¿Qué necesitás para arrancar? |
| `time_to_first_revenue` | ¿En cuánto tiempo primer cliente pagando? |
| `first_steps` | ¿Próximos 3 pasos concretos? |
| `validation_metrics` | ¿Cómo vas a saber si funciona? |
| `ai_notes` | respuestas AI guardadas (**no cuenta para `fields_completed`**) |

### `idea_session_messages` (chat segmentado por fase)
| Col | Tipo | Notas |
|---|---|---|
| `session_id` | uuid FK NOT NULL | |
| `user_id` | uuid FK NOT NULL | denormalizado para queries sin JOIN |
| `role` | text NOT NULL | `user` / `assistant` |
| `content` | text NOT NULL | |
| `phase` | text NOT NULL | `discovery` / `ideation` / `evaluation` / `deep_dive` — **clave para costos** |
| `sequence_order` | int NOT NULL | calculado en action (MAX + 1) |
| `provider` | text NOT NULL | `anthropic` / `openai` / `google` — nombre real, **no** `ai_provider` |
| `model` | text NOT NULL | `claude-sonnet-4-6` etc. — nombre real, **no** `ai_model` |
| `tokens_input`, `tokens_output` | int NOT NULL default 0 | |
| `cost_usd` | numeric(10,6) NOT NULL | Supabase devuelve `string` → `mapMessage` convierte con `Number()` |
| `response_time_ms` | int nullable | |

**Regla:** mensajes `role='user'` llevan `tokens_input`, `tokens_output`, `cost_usd` en 0, pero `provider` y `model` siempre completos (del provider resuelto).

**⚠️ No existe columna `is_byok`** — si se necesita distinguir, lookup en `user_subscriptions.tier`.

---

## 🎨 Decisiones UX locked-in

### 3 Entry points
| Entry | Cuándo | Ruta |
|---|---|---|
| `sin_idea` | No sabe qué hacer | AI pregunta skills → discovery largo |
| `idea_vaga` | Tiene algo vago | AI refina → ideation directo |
| `idea_clara` | La tiene clara | Va directo a evaluación CENTS |

### CENTS anti-bias
Scoring con lenguaje plano (sin jerga del framework) + anclas concretas 1=X, 10=Y. Sugerencias AI van **colapsadas** con link "Ver qué opina la AI" — user puntúa primero, ve AI después.

### Feature pendiente: sugerencia AI de score inicial
Hook de conversión Free → BYOK/Premium. Free ve idea sin puntuar (`score=null`, UI muestra `—/50`) + CTA "¿Querés que la AI te sugiera un score inicial?" — requiere AI. Implementar en Fase 3. **Depende de que `mappers.ts` preserve `null` en `cents_preliminary_score` (decisión C1 tomada — ya aplicada).**

---

## 🔧 Diseño técnico M4 (decisiones locked-in)

### Archivos producidos
```
src/
├── types/
│   ├── actions.ts              ✅ ActionResult<T> global
│   └── database.types.ts       ✅ generated por Supabase MCP
└── modules/ideas/
    ├── constants.ts            ✅ metadata UX (labels, preguntas, anclas)
    ├── mappers.ts              ✅ 4 mappers puros (Raw → Domain)
    ├── types/
    │   └── index.ts            ✅ Row types vía Omit<Raw, ...> + literal unions
    └── actions/                ✅ 16 actions implementadas
        ├── sessions.ts         ✅ 4 actions (createSession, getSession, completeSession, abandonSession)
        ├── messages.ts         ✅ 1 action (sendMessage) — compilable, requiere AIProvider en runtime
        ├── ideas.ts            ✅ 4 actions (createIdeaFromSession, getIdea, listIdeas, updateCENTS)
        ├── transitions.ts      ✅ 5 actions (commitIdea, startValidando, startConstruyendo, promoteToOperando, discardIdea)
        └── deepDive.ts         ✅ 2 actions (upsertDeepDiveField, getDeepDive)

⏳ Pendientes de diseño:
    ai/resolver.ts              ← resolveAIProvider(userId)
    ai/provider.ts              ← capa AIProvider
```

### Decisiones arquitectónicas (no re-discutir)

| # | Decisión |
|---|---|
| 1 | **`ActionResult<T>`** — discriminated union `{ ok: true, data } \| { ok: false, error }`. Todas las actions la devuelven. |
| 2 | **Campos derivados** (`cents_complete`, `fields_completed`, `is_complete`) los calculan los mappers. No la UI ni los actions. |
| 3 | **`sendMessage`** resuelve suscripción y key antes de llamar al AIProvider. El provider no sabe de suscripciones. |
| 4 | **`promoteToOperando`** usa transacción SQL vía `rpc()` → función `promote_idea_to_operando`. Atómica (idea + business en M3). ⏳ función SQL pendiente. |
| 5 | **`sequence_order`** = `MAX + 1` en el action. Chat es estrictamente secuencial, no hay race condition realista. |
| 6 | **Mappers centralizados** por tabla. `cost_usd string → number` vive en `mapMessage`. |
| 7 | **`listIdeas`** filtra solo por `status`. Paginación y otros filtros se agregan si aparece el caso. |
| 8 | **`is_admin`** es responsabilidad del AIProvider, no de las actions. |
| 9 | **Flags opcionales** en `getSession` (`includeMessages`, `includeIdeas`) y `getIdea` (`includeDeepDive`, `includeSession`). Evita queries innecesarias en listas. |
| 10 | **`sendMessage`** devuelve `{ userMessage, assistantMessage }` — no re-fetchea historial. UI hace append local. |
| 11 | **Helper `assertValidTransition()`** central contra `IDEA_STATUS_TRANSITIONS` de constants.ts. 5 transiciones lo usan. |
| 12 | **`upsertDeepDiveField`** acepta los 8 campos editables (7 plan + `ai_notes`) con whitelist de seguridad. |
| 13 | **Types refactor:** Row types heredan de `Database['public']['Tables'][...]['Row']` con `Omit + intersection` para preservar literal unions. No declarar Row types a mano. |
| 14 | **Mappers reciben Raw** (generated types), hacen el cast a literal unions internamente (decisión A1). Los 14 actions no hacen casts. |
| 15 | **`isFilled()` en mapDeepDive** valida null + whitespace (decisión B2 — defensa barata contra edge cases futuros). |
| 16 | **`cents_preliminary_score` pass-through `number \| null`** (decisión C1). `null` = no puntuado aún, `0-50` = puntuado. No normalizar. Habilita feature AI futuro + mejor UX en listados. |

### Contrato `AIProvider` (para implementar)
```typescript
interface AIProvider {
  provider: 'anthropic' | 'openai' | 'google'
  model:    string
  chat(input: {
    messages: { role: 'user' | 'assistant'; content: string }[]
    system?:  string
  }): Promise<ActionResult<{
    content:           string
    provider:          string
    model:             string
    tokens_input:      number
    tokens_output:     number
    cost_usd:          number
    response_time_ms?: number
  }>>
}
```

### Lógica obligatoria del AIProvider
1. Check `profiles.is_admin` → si `true`, bypass TODO
2. Check `user_subscriptions.tier` → features/modelos habilitados
3. Get key: `vault.decrypted_secrets` (BYOK) o env key (premium)
4. Call al proveedor correspondiente
5. UPSERT en `ai_usage_logs` con tokens + costo
6. Solo envía mensajes de la fase activa (control de tokens)

---

## 🏗️ Infraestructura Multi-Tier

### 4 Tiers
| Tier | Precio | AI | Fase lanzamiento |
|---|---|---|---|
| Free | $0 | Sin AI — M4 solo formularios CENTS | **Activo ahora** |
| Pro | $5-7/mes | Premium NO-AI (households, exports) | Fase 2 (3-6 meses) |
| Pro + BYOK | $5-7/mes + key propia | Usuario trae su key | **Activo ahora** |
| Premium AI | $19-29/mes | Todo incluido, infra nuestra | Fase 3 (6-12 meses) |

### `user_subscriptions`
Una fila por usuario (incluido Free), sin histórico. `tier` / `status` / Stripe nullable / periodos / `cancel_at_period_end`.

### `user_api_keys` (BYOK con Supabase Vault)
Las keys **NUNCA** en la tabla — solo `vault_secret_id`. `key_hint` guarda últimos 4 chars. Índice único: una key activa por proveedor por usuario (`WHERE is_active=TRUE`).

```typescript
// Guardar
const secret_id = await supabase.rpc('vault.create_secret', {
  secret: apiKeyPlainText, name: `${userId}_${provider}_${Date.now()}`
});
await supabase.from('user_api_keys').insert({
  user_id, provider, vault_secret_id: secret_id, key_hint: apiKeyPlainText.slice(-4)
});

// Leer
const { data: keyRow } = await supabase.from('user_api_keys')
  .select('vault_secret_id')
  .eq('user_id', userId).eq('provider', provider).eq('is_active', true).single();
const { data: secret } = await supabase.from('vault.decrypted_secrets')
  .select('decrypted_secret').eq('id', keyRow.vault_secret_id).single();
```

### `ai_usage_logs` (agregado mensual)
UPSERT por `(user_id, provider, year_month, feature)`. `year_month` = `YYYY-MM`. `feature` ej: `ideas_chat`, `motor_ai`, `paystub_scan`. UPSERT real requiere stored procedure o SELECT+UPDATE (no reemplazar).

---

## 📋 Migraciones SQL pendientes

### ✅ Aplicadas

- `add_discard_fields_to_ideas` (18-abr-2026) — agregó `discarded_at` y `discard_reason` a `ideas`

### ⏳ Pendientes

**Función `promote_idea_to_operando(p_idea_id, p_user_id, p_business_name)`**

Atómica. Debe:
1. Verificar ownership + status=`construyendo`
2. Verificar deep_dive con los 7 campos completos (sin `ai_notes`)
3. INSERT en `businesses` con `business_name`
4. UPDATE `ideas` → `status='operando'`, `promoted_at=now()`
5. RETURN el row actualizado de `ideas`

Schema de `businesses` ya verificado (tiene `source_idea_id` FK).

---

## 🐞 Deuda técnica pre-existente (no bloqueante)

Errores de TypeScript detectados durante Fase A M4 que **ya existían antes** de los cambios. No relacionados con M4 — abrir sesión dedicada cuando haya tiempo:

| Archivo | Error |
|---|---|
| `references/RegisterPaymentModal.reference.tsx:41` | Cannot find name `RegisterPaymentPayload` |
| `src/modules/dashboard/components/TransactionSlider.tsx:98` | Cannot find name `fmtHours` |

Type-check de todo lo demás: ✅ limpio.

---

## ⚠️ Rebranding legal pre-deploy

Términos de MJ DeMarco (IP registrada) a reemplazar antes del launch:
- `CENTS`, `Fastlane`, `Fastlane Formula`, `Fastlane Compass`
- `Freedom Days`, `La Vía Rápida`, `millonario`, `vía rápida del millonario`

**Sí se pueden usar:** conceptos económicos (desvincular dinero del tiempo, barreras de entrada, ingreso pasivo, escalabilidad). Son ideas comunes.

**Scope:** UI copy + nombres de módulos + identificadores en código + nombres en DB. Sesión dedicada antes del deploy.

---

## 🧭 Punto de partida para la próxima sesión

**M4 Fase A ✅ cerrada:** schema + UX + types + constants + mappers.
**M4 Fase B ✅ cerrada:** 16 actions implementadas + `src/types/actions.ts`. Type-check limpio (solo 2 errores pre-existentes M2 + 1 esperado `ai/resolver` pendiente).

**Próximo paso — Fase C:**
1. Función SQL `promote_idea_to_operando()` — Claude.ai diseña + aplica vía MCP
2. Capa `AIProvider` + `resolveAIProvider()` — Claude.ai diseña
3. Action 15 (`sendMessage`) — implementa una vez que AIProvider existe
4. Flujo BYOK onboarding UI

**Después — Fase D:**
- Rebranding legal antes de deploy
- Deuda técnica pre-existente (M2)

---

## Aprendizajes operativos (conservar)

**Supabase MCP:**
- Verificar schema antes de migrar: `information_schema.tables` + `information_schema.columns` con `table_schema='public'`
- `execute_sql` (data + lecturas) vs `apply_migration` (DDL) — nunca mezclar
- Un SELECT por call en `execute_sql` (múltiples devuelve solo el último)
- `execute_sql` con `DROP CONSTRAINT IF EXISTS` como workaround si `apply_migration` con mismo nombre ya fue registrada
- `createAdminClient()` siempre — nunca SSR client para data
- **Post-migración: regenerar `database.types.ts` vía `generate_typescript_types` MCP**
- `generated types` tipa columnas con CHECK constraint como `string` genérico — resolver con `Omit<Raw, ...> & { campo: LiteralUnion }` en los Row types del dominio

**Flujo de trabajo:**
- Mockups interactivos > descripciones — Luis decide más rápido con visuales
- Presentar opciones A/B/C antes de decidir, no asumir
- `CONTEXT.md` como memoria activa entre sesiones
- Handoffs detallados cuando la ventana se llena → nueva conversación limpia
- **Verificar schema real antes de cerrar código** — no asumir nombres de columnas, `information_schema.columns` es la fuente de verdad
- **Verificar imports de módulos existentes antes de asumir rutas** — el handoff de M4 usaba `@/lib/supabase/admin` pero el proyecto usa `@/lib/supabase/server`. Antes de aceptar un handoff, cruzar los imports con los módulos ya funcionando
- **`conversation_search` puede rescatar diseños previos** — antes de reinventar algo "perdido", buscar si ya se diseñó en otra sesión
- **Distinguir "diseñado en Claude.ai" vs "implementado en filesystem"** — no asumir que ✅ en CONTEXT.md significa que el archivo existe en disco

**Patrones TypeScript:**
- Literal unions derivadas de `typeof CONSTANT[number]['key']` (single source of truth)
- Domain types con campos derivados opcionales (`cents_complete?`, `is_complete?`)
- Discriminated unions para errores (`ActionResult<T>`)
- Row types vía `Omit<Database['public']['Tables'][X]['Row'], campos_literal> & { campos_literal: LiteralUnion }` — hereda cambios de schema automáticamente
- Mappers reciben Raw (generated), devuelven Domain — casts concentrados en un solo archivo

---

## Tools
- **Supabase MCP:** `execute_sql` + `apply_migration` + `generate_typescript_types` con project_id desde variables de entorno
- **Claude Code:** implementación de archivos (delegado desde Claude.ai)
- **Claude Vision:** integrada en M1 (paystub scanner)
- **Recharts:** visualizaciones
- **Vercel:** deploy
- **Fuente conceptual:** "La Vía Rápida del Millonario" (MJ DeMarco) — ver Rebranding
