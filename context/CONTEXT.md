# Fastlane Compass — Contexto del Proyecto
## Estado: M1 ✅ · M2 ✅ · M3 ✅ · M4 🔄 (schema ✅, UI pendiente) · Motor AI ❌

---

## Reglas de trabajo
- Paso a paso, un paso a la vez
- Preguntar antes de ejecutar
- Contraseña para ejecución acelerada: **"al infinito y más allá"**
- Recomendar nueva conversación cuando el contexto se sature

---

## Stack Técnico
| Elemento | Decisión |
|---|---|
| Framework | Next.js 14 (corriendo 16.2.1) |
| Base de datos | Supabase (PostgreSQL) — proyecto: Freedom_Pocket (`rkhrwfdhivsvlronfaaf`), us-east-2 |
| Estilos | Tailwind + shadcn/ui (Radix, preset Nova, Tailwind v3) |
| Gráficas | Recharts |
| AI | Claude API (`@anthropic-ai/sdk`) — capa `AIProvider` multi-proveedor (Anthropic/OpenAI/Google) |
| Deploy | Vercel |
| Moneda | ExchangeRate-API (1,500 llamadas/mes) — sin tabla en DB |

---

## Acceso (Dev)
- **Sin Supabase auth** — se saltea hasta lanzamiento público
- PIN: `DEV_ACCESS_PIN` (.env.local = `310595`) — cookie `dev_access`
- DB: **service_role key** vía `createAdminClient` — bypassa RLS
- Usuario: `DEV_USER_ID` en `src/lib/dev-user.ts` = `1e04cc3d-2c30-4cf9-a977-bb7209aece3a`
- Dev server: puerto 3000

---

## Sistema de Diseño (CERRADO)

### Paleta — B Crecimiento
| Token | Hex | Uso |
|---|---|---|
| Base | `#F2F7F4` | Fondo general |
| Dark | `#1A2520` | Sidebar, hero cards |
| Acento | `#2E7D52` | CTAs, activo |
| Acento claro | `#3A9E6A` | Hover, positivos |
| Surface | `#EAF0EC` | Mini cards, stats |
| Premium | `#C69B30` | Motor AI chip |
| Alerta | `#E84434` | Negativo, deudas |
| Texto primario | `#141F19` | Títulos, valores |
| Texto secundario | `#7A9A8A` | Labels, metadata |

**Tipografía:** IBM Plex Mono (números/métricas) · IBM Plex Sans (UI/texto)
**Layout:** Desktop: sidebar fijo 68px + `ml-[68px]` · Mobile: bottom nav 60px + `mb-[60px]`

**Patrones clave:**
- Página: `<div className="p-4 pb-8 max-w-2xl mx-auto">` + header `h1` 22px + subtítulo 12px `#7A9A8A`
- Hero card: `bg-[#1A2520] rounded-xl px-[18px] py-[16px] mb-4`
- Modal: `fixed inset-0 z-50 … bg-black/60` → `bg-white rounded-2xl p-6 max-w-md`
- Section header: `text-[13px] font-semibold text-[#141F19]` + botón acción `text-[12px] text-[#2E7D52]`

---

## Módulos
```
Fastlane Compass
├── Módulo 0 — Core (users, households, periods, settings)
├── Módulo 1 — Mi Realidad Actual ✅
├── Módulo 2 — Dashboard Financiero ✅
├── Módulo 3 — Mi Brújula ✅
├── Módulo 4 — Ideas de Negocio 🔄 (schema completo, pendiente tipos + server actions + UI)
└── ⚡ Motor AI — Capa transversal ❌
```

**Onboarding progresivo:**
- M1 completo → M2 (`checkAndUnlockModule2`) · 10 tx → M3 · M3 + 1 meta → M4

---

## Base de Datos
- **Migraciones aplicadas directo en Supabase** vía MCP (`apply_migration`)
- `supabase/migrations/` y `supabase/seed/` locales son **OBSOLETOS** — no usar
- Todos los `user_id` FK → `profiles.id`
- `update_updated_at_column()` vive en schema `public` (no `storage`)

| Módulo | Tablas |
|---|---|
| 0 — Core | `profiles` ⚠️ (ver nota is_admin), `user_settings`, `periods`, `module_unlocks`, `households`, `household_members` |
| 1 — Realidad | `incomes`, `income_entries`, `real_hours` |
| 2 — Dashboard | `transaction_categories`, `recurring_templates`, `transactions`, `budgets` |
| 3 — Brújula | `assets`, `liabilities`, `businesses`, `freedom_goals`, `progress_score_history` |
| 4 — Ideas | `idea_sessions`, `ideas`, `idea_deep_dives`, `idea_session_messages` |
| Infraestructura tiers | `user_subscriptions`, `user_api_keys`, `ai_usage_logs` ✅ creadas |
| Motor AI | `ai_context_items`, `ai_recommendations` |

### ⚠️ Campo nuevo en `profiles`
```sql
is_admin BOOLEAN NOT NULL DEFAULT FALSE
```
Usuarios con `is_admin = true` están exentos de todos los límites de tier y AI.
DEV_USER_ID tiene `is_admin = true`. Para exentar a otro usuario: `UPDATE profiles SET is_admin = TRUE WHERE id = '...'`.

---

## Estructura de Carpetas
```
src/
├── app/(protected)/
│   ├── layout.tsx               ← PIN auth + sidebar + bottom nav
│   ├── dashboard/page.tsx
│   ├── mi-realidad/page.tsx     ← header + período activo guard
│   ├── brujula/page.tsx         ← header (score + level) + BrujulaClient
│   └── [ideas|motor-ai]/page.tsx  ← stubs
├── modules/
│   ├── mi-realidad/
│   │   ├── types/index.ts
│   │   ├── actions/index.ts     ← 11 server actions
│   │   └── components/
│   │       ├── MiRealidadClient.tsx
│   │       ├── RegisterPaymentModal.tsx
│   │       └── IncomeSlider.tsx
│   ├── dashboard/
│   │   ├── types/index.ts
│   │   ├── actions/index.ts     ← 14 server actions
│   │   └── components/
│   │       ├── DashboardClient.tsx, HeroCard.tsx, RecurringBanner.tsx
│   │       ├── AddTransactionModal.tsx, ChartModal.tsx
│   │       ├── RecurringTemplateModal.tsx, TransactionSlider.tsx
│   └── brujula/
│       ├── types/index.ts
│       ├── actions/index.ts     ← getBrujulaData + CRUD assets/liabilities/businesses/goals
│       └── components/
│           ├── BrujulaClient.tsx
│           ├── AssetModal.tsx, LiabilityModal.tsx
│           ├── BusinessModal.tsx, FreedomGoalModal.tsx
└── lib/
    ├── supabase/server.ts       ← createClient + createAdminClient
    └── dev-user.ts              ← DEV_USER_ID
```

---

## Los 8 Algoritmos
| # | Nombre | Estado |
|---|---|---|
| 1 | Precio Real por Hora | ✅ M1 |
| 2 | Tracker de Transacciones | ✅ M2 |
| 3 | Autonomía Económica (días libres) | ✅ M2 |
| 4 | Días de Libertad | ✅ M3 |
| 5 | Fórmula Fastlane | ✅ M3 |
| 6 | Score de Progreso (4 dimensiones) | ✅ M3 |
| 7 | Design Thinking + Evaluación de Ideas (CENTS) | 🔄 M4 |
| 8 | Motor AI Transversal | ❌ Global |

---

## Módulo 1 — Mi Realidad (COMPLETO ✅)
_[sin cambios — ver versiones previas de CONTEXT.md]_

## Módulo 2 — Dashboard Financiero (COMPLETO ✅)
_[sin cambios — ver versiones previas de CONTEXT.md]_

## Módulo 3 — Mi Brújula (COMPLETO ✅)
_[sin cambios — ver versiones previas de CONTEXT.md]_

---

# 🆕 MÓDULO 4 — Ideas de Negocio (SCHEMA ✅ · UI PENDIENTE)

## Filosofía
M4 implementa el **Algoritmo 7** de DeMarco: Design Thinking + Evaluación CENTS.
No es una pantalla, es un **proceso/embudo**:

```
GENERAR → EVALUAR → PROFUNDIZAR → INCUBAR
Design Thinking  CENTS (5 mandamientos)  Deep Dive AI  Business en M3
```

### Los 5 Mandamientos CENTS de DeMarco
1. **C**ontrol — ¿tú estás al volante?
2. **E**ntrada (Barrera) — ¿hay barrera de entrada suficiente?
3. **N**ecesidad — ¿resuelve un problema real?
4. **T**iempo — ¿se desvincula de tu tiempo?
5. **S**cala — ¿puede llegar a millones?

---

## Schema M4 — Estado final post-migraciones (16-abr-2026)

### `idea_sessions`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles.id ON DELETE CASCADE | |
| `entry_point` | text NOT NULL | CHECK: `sin_idea` / `idea_vaga` / `idea_clara` |
| `raw_input` | text | NOT NULL si entry_point != 'sin_idea' |
| `status` | text NOT NULL DEFAULT 'in_progress' | CHECK: `in_progress` / `completed` / `abandoned` |
| `started_at` | timestamptz DEFAULT now() | |
| `completed_at` | timestamptz | NOT NULL si status='completed' |

### `ideas`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles.id ON DELETE CASCADE | |
| `session_id` | uuid FK → idea_sessions.id ON DELETE SET NULL | nullable — permite ideas sueltas |
| `title` | text NOT NULL | |
| `concept` | text NOT NULL | |
| `need_identified` | text | |
| `fastlane_potential` | text | |
| `business_model` | text | CHECK: `saas` / `producto_fisico` / `servicio` / `contenido` / `renta` / `custom` |
| `cents_score_control` | integer | CHECK 1–10, nullable |
| `cents_score_entry` | integer | CHECK 1–10, nullable |
| `cents_score_need` | integer | CHECK 1–10, nullable |
| `cents_score_time` | integer | CHECK 1–10, nullable |
| `cents_score_scale` | integer | CHECK 1–10, nullable |
| `cents_preliminary_score` | integer **GENERATED ALWAYS** | Suma de los 5 (0–50). Calculado por DB. |
| `status` | text NOT NULL DEFAULT 'generated' | CHECK: `generated` / `committed` / `validando` / `construyendo` / `operando` / `discarded` |
| `committed_at` | timestamptz | NOT NULL si status != generated/discarded |
| `created_at`, `updated_at` | timestamptz | |

**Nota:** `cents_preliminary_score` es GENERATED STORED — nunca se escribe directamente, la DB lo calcula. La validación "operando requiere los 5 scores completos" va en la capa de aplicación.

### `idea_deep_dives`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `idea_id` | uuid FK | |
| `market_analysis` | text | → Mandamiento Escala |
| `competition_analysis` | text | → Mandamiento Entrada |
| `revenue_model` | text | → Mandamiento Necesidad |
| `required_resources` | text | → Mandamiento Control |
| `time_to_first_revenue` | text | → Mandamiento Tiempo |
| `first_steps` | text | → Ejecución |
| `validation_metrics` | text | → Ejecución |
| `ai_notes` | text | Respuestas AI guardadas (evita re-consultar) |
| `created_at`, `updated_at` | timestamptz | |

### `idea_session_messages`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid NOT NULL | |
| `role` | text NOT NULL | `user` / `assistant` |
| `content` | text NOT NULL | |
| `phase` | text NOT NULL | `discovery` / `ideation` / `evaluation` / `deep_dive` |
| `sequence_order` | integer NOT NULL | |
| `created_at` | timestamptz DEFAULT now() | |
| `user_id` | uuid NOT NULL FK → profiles.id | Denormalizado para queries de consumo sin JOIN |
| `provider` | text NOT NULL | CHECK: `anthropic` / `openai` / `google` |
| `model` | text NOT NULL | Ej: `claude-sonnet-4-6`, `gpt-4o` |
| `tokens_input` | integer NOT NULL DEFAULT 0 | 0 en mensajes role=user |
| `tokens_output` | integer NOT NULL DEFAULT 0 | 0 en mensajes role=user |
| `cost_usd` | numeric(10,6) NOT NULL DEFAULT 0 | Pre-calculado al momento de la llamada |
| `response_time_ms` | integer | nullable |

**Nota:** el costo total se atribuye al mensaje `role='assistant'`. Los mensajes `role='user'` llevan tokens/cost en 0, pero `provider` y `model` siempre completos.

---

## Infraestructura Multi-Tier (CREADA ✅)

### Modelo de monetización — 4 tiers
| Tier | Nombre | Precio | AI | Fase lanzamiento |
|---|---|---|---|---|
| 1 | Free | $0 | Sin AI (M4 solo formularios CENTS) | **Activo ahora** |
| 2 | Pro | $5–7/mes | Features premium NO-AI | Fase 2 (3–6 meses) |
| 3 | Pro + AI (BYOK) | $5–7 + costo de su key | Usuario trae su key | **Activo ahora** |
| 4 | Premium AI | $19–29/mes | AI incluido, infra propia | Fase 3 (6–12 meses) |

### `user_subscriptions`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL UNIQUE FK → profiles.id | Una fila por usuario |
| `tier` | text NOT NULL DEFAULT 'free' | CHECK: `free` / `pro` / `pro_byok` / `premium_ai` |
| `status` | text NOT NULL DEFAULT 'active' | CHECK: `active` / `cancelled` / `past_due` / `trialing` |
| `stripe_customer_id` | text | nullable |
| `stripe_subscription_id` | text | nullable |
| `current_period_start/end` | timestamptz | nullable |
| `cancel_at_period_end` | boolean DEFAULT false | |
| `created_at`, `updated_at` | timestamptz | |

**Seed:** DEV_USER_ID tiene `tier='free'`, `status='active'`.

### `user_api_keys`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL FK → profiles.id | |
| `provider` | text NOT NULL | CHECK: `anthropic` / `openai` / `google` |
| `vault_secret_id` | uuid NOT NULL | Referencia a `vault.secrets.id`. **Nunca guardar la key en texto.** |
| `key_hint` | text NOT NULL | Últimos 4 chars para mostrar en UI (ej: `...xy4K`) |
| `is_active` | boolean DEFAULT true | |
| `last_used_at` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | |

**Índice único:** solo una key activa por usuario+proveedor (`WHERE is_active = TRUE`).

**Flujo Vault:**
```typescript
// Guardar key
const secret_id = await supabase.rpc('vault.create_secret', {
  secret: apiKeyPlainText,
  name: `${userId}_${provider}_${Date.now()}`,
});
await supabase.from('user_api_keys').insert({
  user_id, provider, vault_secret_id: secret_id,
  key_hint: apiKeyPlainText.slice(-4),
});

// Leer key para usarla
const { data: keyRow } = await supabase
  .from('user_api_keys')
  .select('vault_secret_id')
  .eq('user_id', userId).eq('provider', provider).eq('is_active', true).single();

const { data: secret } = await supabase
  .from('vault.decrypted_secrets')
  .select('decrypted_secret')
  .eq('id', keyRow.vault_secret_id).single();
```

### `ai_usage_logs`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL FK → profiles.id | |
| `provider` | text NOT NULL | CHECK: `anthropic` / `openai` / `google` |
| `year_month` | text NOT NULL | Formato `YYYY-MM` (ej: `2026-04`) |
| `feature` | text NOT NULL | `ideas_chat` / `motor_ai` / `paystub_scan` / etc. |
| `total_tokens_input` | integer DEFAULT 0 | Acumulado del mes |
| `total_tokens_output` | integer DEFAULT 0 | Acumulado del mes |
| `total_cost_usd` | numeric(10,6) DEFAULT 0 | Acumulado del mes |
| `request_count` | integer DEFAULT 0 | Acumulado del mes |
| `last_request_at` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | |

**Constraint único:** `(user_id, provider, year_month, feature)` — una fila por combinación, el AIProvider hace UPSERT incrementando los totales.

**Flujo UPSERT (implementar con 2 pasos SELECT + UPDATE en AIProvider):**
```typescript
await supabase.from('ai_usage_logs').upsert({
  user_id, provider,
  year_month: new Date().toISOString().slice(0, 7),
  feature: 'ideas_chat',
  // NOTA: usar stored procedure o SELECT+UPDATE para sumar, no reemplazar
}, { onConflict: 'user_id,provider,year_month,feature' });
```

---

## Capa AIProvider — Pendiente implementar

Todas las llamadas AI deben pasar por una capa de abstracción `AIProvider` que:
1. Chequea `profiles.is_admin` — si true, bypassa todos los límites
2. Chequea `user_subscriptions.tier` para saber qué modelo/feature está habilitado
3. Obtiene la key del usuario desde `vault.decrypted_secrets` (BYOK) o usa la key de entorno (dev/premium)
4. Hace la llamada al proveedor correspondiente
5. Hace UPSERT en `ai_usage_logs` con tokens y costo
6. Guarda el mensaje en `idea_session_messages` con todos los campos BYOK

Soporta: `anthropic` / `openai` / `google` — selección por usuario.

---

## 🧭 Punto de partida para la próxima sesión

El schema está completo. El siguiente paso es:

1. **Diseñar `types/index.ts` para M4** — tipos TypeScript que reflejen el schema actualizado
2. **Diseñar `actions/index.ts` para M4** — server actions (getIdeas, createSession, saveMessage, scoreCENTS, etc.)
3. **Diseñar capa `AIProvider`** — wrapper multi-proveedor con lógica de tier + is_admin + usage logging
4. **Diseñar UI de M4** — flujo de 3 entry points (`sin_idea` / `idea_vaga` / `idea_clara`) + mockups
5. **Diseñar flujo BYOK onboarding** — UI para que el usuario ingrese su key
6. **Handoff a Claude Code** para implementación

---

## Aprendizajes operativos (conservar)

- **Schema verification antes de migrar:** siempre `information_schema.tables` + `information_schema.columns` antes de `apply_migration`
- **`execute_sql` vs `apply_migration`:** `execute_sql` para lecturas y data; `apply_migration` solo para DDL
- **Un SELECT por llamada:** si se ejecutan múltiples SELECTs en `execute_sql`, solo retorna el último
- **Constraints con nombres únicos por tabla:** usar sufijos descriptivos (`_logic_check` vs `_category_check`)
- **Función trigger en schema correcto:** `update_updated_at_column()` debe vivir en `public`, no en `storage`. Si el STEP 0 la detecta en otro schema, crearla con `CREATE OR REPLACE FUNCTION public.update_updated_at_column()` antes de las migraciones
- **Mostrar opciones visuales antes de decidir:** Luis es visual, prefiere mockups interactivos sobre descripción textual
- **`createAdminClient()` siempre:** nunca SSR client para datos
- **`CONTEXT.md` como memoria activa:** se reemplaza entre sesiones con versión actualizada. El archivo lo usa tanto Claude.ai (planning) como Claude Code (implementación)

---

## Tools y recursos
- **Supabase MCP:** `execute_sql` + `apply_migration` con project_id `rkhrwfdhivsvlronfaaf`
- **Claude Code:** creación e implementación de archivos
- **Claude Vision API:** integrada en M1 (paystub scanner)
- **Recharts:** todas las visualizaciones de datos
- **Vercel:** deploy
- **Fuente conceptual:** "La Vía Rápida del Millonario" / "The Millionaire Fastlane" (MJ DeMarco)