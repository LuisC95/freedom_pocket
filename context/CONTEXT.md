# Fastlane Compass — Contexto del Proyecto
## Estado: M1 ✅ · M2 ✅ · M3 ✅ · M4 (schema ✅ · UX ✅ · types ✅ · constants ✅ · mappers ✅ · actions ✅ · AIProvider ✅) · Motor AI ❌

> Memoria activa del proyecto. Verificado contra filesystem: 26-abr-2026.
> Lo usan Claude.ai (planning) y Claude Code (implementación).

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
| AI | Capa `AIProvider` multi-proveedor (Anthropic / OpenAI / Google) — ✅ implementada |
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
M0 Core · M1 Mi Realidad ✅ · M2 Dashboard ✅ · M3 Brújula ✅ · M4 Ideas ✅ · Motor AI ❌
```

8 algoritmos: 1-Precio Real/Hora ✅ · 2-Tracker TX ✅ · 3-Autonomía ✅ · 4-Días Libertad ✅ · 5-Fórmula ✅ · 6-Score Progreso ✅ · 7-CENTS ✅ · 8-Motor AI ❌

Onboarding: M1 → M2 (10 tx) → M3 → M4 (M3 + 1 meta).

| Módulo | Actions |
|---|---|
| M1 Mi Realidad | 11 |
| M2 Dashboard | 18 |
| M3 Brújula | 14 |
| M4 Ideas | 18 |

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
│   ├── ideas/page.tsx          ← M4 con EntryPointSelector + IdeasList
│   └── motor-ai/page.tsx       ← Stub (solo <h1>)
├── modules/
│   ├── mi-realidad/   types · actions (11) · components
│   ├── dashboard/     types · actions (18) · components
│   ├── brujula/       types · actions (14) · components
│   ├── ideas/         types · constants · mappers · actions (18) · ai/ ✅
│   └── motor-ai/      types · actions · components · hooks · lib — todo stubs
├── types/
│   ├── actions.ts              ← ActionResult<T> global
│   └── database.types.ts       ← autogenerado por Supabase (NO editar a mano)
└── lib/
    ├── supabase/server.ts      ← createClient + createAdminClient
    └── dev-user.ts
```

---

# 🆕 MÓDULO 4 — Ideas de Negocio

## Status: ✅ Completado (schema + UX + types + constants + mappers + actions + AIProvider + IdeasPage)

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
| `cents_preliminary_score` | **int GENERATED ALWAYS** | Suma 0-50, nunca escribir directo. `null` si no hay ningún score |
| `status` | text DEFAULT `generated` | `generated` / `committed` / `validando` / `construyendo` / `operando` / `discarded` |
| `committed_at`, `promoted_at` | timestamptz nullable | |
| `discarded_at`, `discard_reason` | timestamptz + text nullable | |
| `created_at`, `updated_at` | timestamptz NOT NULL | |

### `idea_deep_dives` (1-a-1 con ideas)
| Col | Pregunta UX |
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
| `user_id` | uuid FK NOT NULL | denormalizado |
| `role` | text NOT NULL | `user` / `assistant` |
| `content` | text NOT NULL | |
| `phase` | text NOT NULL | `discovery` / `ideation` / `evaluation` / `deep_dive` — **clave para costos** |
| `sequence_order` | int NOT NULL | MAX + 1 en action |
| `provider` | text NOT NULL | `anthropic` / `openai` / `google` |
| `model` | text NOT NULL | `claude-sonnet-4-6` etc. |
| `tokens_input`, `tokens_output` | int NOT NULL default 0 | |
| `cost_usd` | numeric(10,6) NOT NULL | Supabase devuelve `string` |
| `response_time_ms` | int nullable | |

---

## 🎨 Decisiones UX locked-in

### Entry points
| Entry | Cuándo | Ruta |
|---|---|---|
| `sin_idea` | No sabe qué hacer | AI pregunta skills → discovery largo |
| `idea_vaga` | Tiene algo vago | AI refina → ideation directo |
| `idea_clara` | La tiene clara | Va directo a evaluación CENTS |

### CENTS anti-bias
Scoring con lenguaje plano (sin jerga del framework) + anclas concretas 1=X, 10=Y. Sugerencias AI van **colapsadas** con link "Ver qué opina la AI".

---

## 🔧 Diseño técnico M4 — Estado de archivos

### Implementado y verificado

```
src/types/actions.ts                    ← ActionResult<T> global
src/types/database.types.ts             ← generated por Supabase MCP (regenerar post-migración)
src/modules/ideas/
├── constants.ts                        ✅ (labels, preguntas, anclas)
├── mappers.ts                          ✅ (4 mappers puros Raw → Domain)
├── types/index.ts                      ✅ (Row types vía Omit + literal unions)
├── actions/ (1,436 líneas, 18 funciones)
│   ├── sessions.ts     4 functions     ✅
│   ├── messages.ts     2 functions     ✅ (sendMessage + getSessionMessages)
│   ├── ideas.ts        4 functions     ✅
│   ├── transitions.ts  5 functions     ✅
│   ├── deepDive.ts     2 functions     ✅
│   └── phases.ts       1 function      ✅
├── ai/ (540 líneas, 5 archivos)
│   ├── provider.ts    205 líneas       ✅ (core AIProvider)
│   ├── resolver.ts     99 líneas       ✅ (resuelve proveedor+key por usuario)
│   ├── prompts.ts      86 líneas       ✅ (prompts del sistema)
│   ├── structured.ts   94 líneas       ✅ (respuestas estructuradas)
│   └── usage.ts        56 líneas       ✅ (tracking de costos)
├── components/
│   ├── EntryPointSelector.tsx          ✅
│   ├── IdeasList.tsx                   ✅
│   └── ...                             ✅
└── pages/
    └── (protected)/ideas/page.tsx      ✅ (vista completa con admin guard)
```

### Decisiones arquitectónicas locked-in (no re-discutir)
Ver sección "Decisiones" en sesiones anteriores — 16 decisiones documentadas en handoffs.

---

### ⏳ Pendiente único: función SQL `promote_idea_to_operando()`
- Referenciada en `transitions.ts` vía `supabase.rpc()`
- Debe verificar ownership + status + deep_dive completo
- INSERT en `businesses` + UPDATE `ideas` (atómico)
- Crear migración SQL

---

## 🏗️ Infraestructura Multi-Tier

### 4 Tiers
| Tier | Precio | AI | Fase lanzamiento |
|---|---|---|---|
| Free | $0 | Sin AI — M4 solo formularios CENTS | **Activo al launch** |
| Pro | $5-7/mes | Premium NO-AI (households, exports) | Dormido — Fase 2 (3-6 meses) |
| Pro + BYOK | $5-7/mes + key propia | Usuario trae su key | Dormido — Fase 2/3 |
| Premium AI | $19-29/mes | Todo incluido, infra nuestra | Dormido — Fase 3 (6-12 meses) |

**Estrategia de launch (decidida 20-abr-2026):** launch público solo con Free (M1+M2+M3). M4 con AI = beta privada para admin + early adopters autorizados manualmente — Luis paga el consumo Anthropic en esa fase. Pricing se decide post-launch con datos reales.

### `user_subscriptions` / `user_api_keys` / `ai_usage_logs`
Tablas creadas e inactivas. La lógica de AIProvider (resolver.ts, provider.ts) ya contempla check de tier, BYOK y logging. Ver handoffs anteriores para patrón Vault.

---

## ⚠️ Rebranding legal pre-deploy

Términos de MJ DeMarco (IP registrada) a reemplazar antes del launch:
- `CENTS`, `Fastlane`, `Fastlane Formula`, `Fastlane Compass`
- `Freedom Days`, `La Vía Rápida`, `millonario`, `vía rápida del millonario`

**Sí se pueden usar:** conceptos económicos (desvincular dinero del tiempo, barreras de entrada, ingreso pasivo, escalabilidad).

**Scope:** UI copy + nombres de módulos + identificadores en código + nombres en DB. Sesión dedicada antes del deploy.

---

## 🧭 Estado actual y próximos pasos

### M4 — Todo completado ✅
- Schema: ✅ | UX: ✅ | Types: ✅ | Constants: ✅
- Mappers: ✅ | Actions (18): ✅ | AIProvider: ✅ | IdeasPage: ✅

### ⏳ Lo que falta
1. **Función SQL `promote_idea_to_operando`** — la única migración pendiente
2. **Motor AI (Algoritmo 8)** — módulo `src/modules/motor-ai/` es stubs (18 líneas total). Página en `app/(protected)/motor-ai/page.tsx` es un `<h1>` placeholder. Pendiente de diseño e implementación completa.
3. **Rebranding legal** antes del deploy público
4. **BYOK onboarding UI** — AIProvider ya lo soporta, falta flujo en frontend

---

## 🐛 Paystub Scanner — Bug y Fix (26-abr-2026)

### Problema en producción
Scanner de paystubs mostraba "No se pudo procesar el archivo" en Vercel.

**Causa raíz:** `pdf-parse` depende de `pdfjs-dist` que intenta cargar `pdf.worker.mjs` desde `/var/task/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs` — archivo no empaquetado en el bundle serverless de Vercel.

### Solución
**Reemplazar `pdf-parse` por `pdf2json ^4.0.3`** — librería que bundlea pdfjs internamente sin worker externo. Pdf2json v4 viene con tipos TypeScript incluidos (no necesita `pdf2json.d.ts`).

### Cambios en el código
| Archivo | Cambio |
|---|---|
| `package.json` | `pdf-parse` + `@types/pdf-parse` + `@napi-rs/canvas` → eliminados. `pdf2json ^4.0.3` agregado |
| `next.config.mjs` | `serverExternalPackages: ['pdf2json']` |
| `src/modules/mi-realidad/actions/index.ts` | `extractPdfText()` reescrita con `PDFParser` de pdf2json |

La extracción de texto se hace manualmente desde `parser.data.Pages[].Texts[].R[].T` con `decodeURIComponent()`, porque `getRawTextContent()` devuelve vacío en pdf2json v4.

### Commits
- `e0654ba` — fix: reemplazar pdf-parse por pdf2json para serverless de Vercel
- `fe54dfc` — fix: extraer texto desde parser.data en vez de getRawTextContent

Tests local: 3,073 caracteres extraídos de paystub real.

---

## Aprendizajes operativos (conservar)

**Supabase MCP:**
- Verificar schema antes de migrar: `information_schema.tables` + `information_schema.columns`
- `execute_sql` (data) vs `apply_migration` (DDL) — nunca mezclar
- Un SELECT por call (múltiples devuelve solo el último)
- `createAdminClient()` siempre — nunca SSR client para data
- Post-migración: regenerar `database.types.ts` vía `generate_typescript_types`

**Flujo de trabajo:**
- CONTEXT.md como memoria activa — verificar contra filesystem antes de asumir
- Distinguir "diseñado" vs "implementado en disco"
- Handoffs detallados entre sesiones largas
- Host: WSL2 en Windows. SSH key registrada en GitHub para push.

**Patrones TypeScript:**
- Row types vía `Omit<Database['...']['Row'], ...> & { campo: LiteralUnion }`
- Mappers reciben Raw (generated), devuelven Domain
- ActionResult<T>` como discriminated union

---

## Tools
- **Supabase MCP:** `execute_sql` + `apply_migration` + `generate_typescript_types`
- **Claude Code:** implementación de archivos (delegado desde Claude.ai)
- **Claude Vision:** integrada en M1 (paystub scanner)
- **Recharts:** visualizaciones
- **Vercel:** deploy
- **Git push:** SSH (no PAT fine-grained)
- **Fuente conceptual:** "La Vía Rápida del Millonario" (MJ DeMarco) — ver Rebranding
