# 📋 Resumen Contextual — Fastlane Compass
## Estado al cierre de sesión — Módulo 2 (Dashboard Financiero) completo en branch `main`

---

## 📌 Reglas de trabajo
- Paso a paso, un paso a la vez
- Preguntar antes de ejecutar
- Contraseña para ejecución acelerada: **"al infinito y más allá"**
- Recomendar nueva conversación cuando el contexto se sature

---

## 🧭 El Producto
**Fastlane Compass** — App web personal basada en "La Vía Rápida del Millonario" (MJ DeMarco).
Objetivo: desvincular el dinero del tiempo y trackear el progreso hacia la emancipación económica.

---

## ⚙️ Stack Técnico
| Elemento | Decisión |
|---|---|
| Stack | Next.js 14 (corriendo 16.2.1) |
| Base de datos | Supabase (PostgreSQL + auth) |
| Estilos | Tailwind + shadcn/ui (Radix, preset Nova, Tailwind v3) |
| Gráficas | Recharts |
| AI | Claude API (`@anthropic-ai/sdk` instalado) — modelo `claude-opus-4-6` |
| Deploy | Vercel |
| Datos financieros | Manual MVP → Plaid V2 |
| Integración bancaria | Plaid (USA) — V2 |
| APIs de inversiones | Alpha Vantage / Polygon.io (bolsa) + CoinGecko (crypto) — V2 |
| APIs de moneda | ExchangeRate-API (1,500 llamadas/mes gratis) — sin tabla de tasas en DB |

---

## 🔐 Estrategia de Acceso (Dev → Producción)

### Desarrollo (actual)
- **Sin Supabase auth** — se saltea hasta lanzamiento público
- PIN hardcodeado en `DEV_ACCESS_PIN` (.env.local = `310595`)
- Validado en `(protected)/layout.tsx` — `isAuthenticated()` chequea cookie `dev_access`
- Acceso a DB vía **service_role key** en servidor (`createAdminClient`) — bypassa RLS
- `DEV_USER_ID` hardcodeado en `src/lib/dev-user.ts` = `1e04cc3d-2c30-4cf9-a977-bb7209aece3a`

### Producción (futuro)
- Remover `DEV_ACCESS_PIN` → middleware se desactiva solo
- Agregar páginas login/register con Supabase auth
- Cambiar `createAdminClient` por cliente de auth normal

---

## 🎨 Sistema de Diseño (UI/UX — CERRADO)

### Paleta — B Crecimiento
| Token | Hex | Uso |
|---|---|---|
| Base | `#F2F7F4` | Fondo general |
| Sidebar / Cards dark | `#1A2520` | Sidebar, hero cards, modales oscuros, bottom nav |
| Acento principal | `#2E7D52` | CTAs, activo, logo |
| Acento claro | `#3A9E6A` | Labels activos, positivos |
| Surface | `#EAF0EC` | Mini cards, stats |
| Premium / AI | `#C69B30` | Motor AI chip, gamification |
| Alerta | `#E84434` | Presupuesto excedido, negativo, deducciones |
| Texto primario | `#141F19` | Títulos, valores |
| Texto secundario | `#7A9A8A` | Labels, metadata |

### Tipografía
- **IBM Plex Mono** — números, valores monetarios, métricas, datos
- **IBM Plex Sans** — UI, labels, navegación, texto corrido

### Layout
- **Desktop:** Sidebar fijo izquierdo 68px oscuro (`#1A2520`) + área de contenido con `ml-[68px]`
- **Mobile:** Bottom nav fijo 60px oscuro (`#1A2520`) + área de contenido con `mb-[60px]`

### Patrones de componentes clave
- **Hero card dark:** `bg-[#1A2520]` con label uppercase + valor IBM Plex Mono grande + badge de delta
- **Modal oscuro:** `bg-[#1A2520]`, inline styles, IBM Plex Sans/Mono — patrón de `RegisterPaymentModal`
- **AI chip dorado:** `bg-[#C69B3015]` border `#C69B3040` + dot `#C69B30` — solo Motor AI
- **Mini stat card:** `bg-[#EAF0EC]` + label 9px + valor IBM Plex Mono
- **Sheet (bottom/center):** `alignItems: 'flex-end'` + `className="sm:items-center"` — bottom en móvil, centrado en desktop

---

## 🏗 Estructura de Módulos
```
Fastlane Compass
├── Módulo 0 — Core (users, households, periods, settings)
├── Módulo 1 — Mi Realidad Actual ✅
├── Módulo 2 — Dashboard Financiero ✅
├── Módulo 3 — Mi Brújula
├── Módulo 4 — Ideas de Negocio
└── ⚡ Motor AI — Capa transversal
```

---

## 🔓 Onboarding Progresivo
```
Día 1                    → Módulo 1 disponible
Módulo 1 completo        → desbloquea Módulo 2  (checkAndUnlockModule2)
10 transacciones         → desbloquea Módulo 3
Módulo 3 + 1 meta        → desbloquea Módulo 4
```

---

## 🗄 Base de Datos
- **Supabase project:** Freedom_Pocket (`rkhrwfdhivsvlronfaaf`) — ACTIVE_HEALTHY, us-east-2
- **22 tablas en producción** ✅ (+ columnas nuevas en `recurring_templates`)
- Todos los `user_id` FK apuntan a `profiles.id`, NO a `auth.users(id)` directamente
- **IMPORTANTE:** Los archivos locales `supabase/migrations/` y `supabase/seed/` son OBSOLETOS — no usar
- Las migraciones DDL se aplican directo en Supabase vía MCP (`apply_migration`)

| Módulo | Tablas |
|---|---|
| 0 — Core | `profiles`, `user_settings`, `periods`, `module_unlocks`, `households`, `household_members` |
| 1 — Realidad | `incomes`, `income_entries`, `real_hours` |
| 2 — Dashboard | `transaction_categories`, `recurring_templates`, `transactions`, `budgets` |
| 3 — Brújula | `investments`, `freedom_goals`, `businesses`, `business_cents_scores`, `progress_score_history` |
| 4 — Ideas | `idea_sessions`, `ideas`, `idea_deep_dives`, `idea_session_messages` |
| Motor AI | `ai_context_items`, `ai_recommendations` |

### Columnas nuevas en `recurring_templates` (migración aplicada ✅)
```sql
frequency          TEXT NOT NULL DEFAULT 'monthly'
                   CHECK IN ('daily','weekly','biweekly','monthly','annual','custom')
month_of_year      INT  CHECK BETWEEN 1 AND 12  -- solo para annual
custom_interval_days INT CHECK > 0              -- solo para custom
```

---

## 📁 Estructura de Carpetas (Next.js)
```
src/
├── app/
│   ├── (protected)/
│   │   ├── layout.tsx               ← PIN auth + sidebar + bottom nav ✅
│   │   ├── dashboard/page.tsx       ← Server component → DashboardClient ✅
│   │   ├── mi-realidad/page.tsx     ← Server component → MiRealidadClient ✅
│   │   ├── brujula/page.tsx         ← stub
│   │   ├── ideas/page.tsx           ← stub
│   │   └── motor-ai/page.tsx        ← stub
│
├── modules/
│   ├── mi-realidad/
│   │   ├── types/index.ts           ← tipos completos ✅
│   │   ├── actions/index.ts         ← 8 server actions ✅
│   │   └── components/
│   │       ├── MiRealidadClient.tsx
│   │       └── RegisterPaymentModal.tsx
│   ├── dashboard/
│   │   ├── types/index.ts           ← tipos completos ✅
│   │   ├── actions/index.ts         ← 14 server actions ✅
│   │   └── components/
│   │       ├── DashboardClient.tsx  ← contenedor cliente + FAB ✅
│   │       ├── HeroCard.tsx         ← neto protagonista + autonomía económica ✅
│   │       ├── RecurringBanner.tsx  ← banner recurrentes pendientes ✅
│   │       ├── AddTransactionModal.tsx ← modal crear/editar gasto ✅
│   │       └── TransactionSlider.tsx   ← 3 tabs: gastos/presupuestos/recurrentes ✅
│
├── lib/
│   ├── supabase/server.ts           ← createClient + createAdminClient ✅
│   ├── dev-user.ts                  ← DEV_USER_ID ✅
```

---

## 🧩 Módulo 1 — Mi Realidad (COMPLETO ✅)

### Server Actions (`src/modules/mi-realidad/actions/index.ts`)
| Action | Descripción |
|---|---|
| `getMiRealidadData()` | Carga período, ingresos+entries, horas, calcula Precio Real por Hora |
| `createIncome(data)` | Crea fuente de ingreso |
| `updateIncome(data)` | Edita fuente (valida ownership) |
| `deleteIncome(id)` | Elimina fuente (valida ownership) |
| `upsertRealHours(data)` | INSERT o UPDATE horas reales |
| `registerPayment(payload)` | Batch insert de `income_entries` (ganancias + deducciones) |
| `scanPaystub(base64, mimeType)` | Claude Vision API (`claude-opus-4-6`) — imágenes y PDF |
| `checkAndUnlockModule2()` | Inserta en `module_unlocks` si hay ingresos + horas |

### Algoritmo 1 — Precio Real por Hora
- Si hay `income_entries` este mes → usa `ganancias - deducciones` como ingreso real
- Si no hay entries → normaliza `amount` base según frecuencia (weekly×4.33, biweekly×2, monthly×1)
- `horas_reales = contratadas + extra + desplazamiento + preparación + carga_mental`
- `precio_por_hora = total_ingresos_mes / (horas_reales × 4.33)`

---

## 🧩 Módulo 2 — Dashboard Financiero (COMPLETO ✅)

### Arquitectura de datos
- **M1 es dueño de los ingresos** (`incomes` + `income_entries`) — dinero-tiempo
- **M2 solo registra gastos** (`transactions` con `type = 'expense'`)
- `net_period = total_income_period - total_expense_period`

### Ventana rodante de métricas
- Siempre cubre `diasDelMes - 1` días hacia atrás desde hoy
- `total_income_period`: usa `income_entries` reales en la ventana; fallback a proyección mensual si no hay
- `total_expense_period`: transacciones con `transaction_date >= ventanaStr`

### Métricas de autonomía económica
- `gasto_diario = total_expense_period / (diasDelMes - 1)` — burn rate diario
- `dias_autonomia = net_period / gasto_diario` — días que podrías vivir sin trabajar
- Por transacción: `dias_auto = amount / gasto_diario` → display en días (≥1d) u horas (<1d)
- `price_per_hour` sigue siendo estructural desde M1 (referencia en AddTransactionModal)

### Server Actions (`src/modules/dashboard/actions/index.ts`)
| Action | Descripción |
|---|---|
| `getDashboardData()` | Single fetch — período, transacciones, budgets, recurrentes, categorías, ingresos |
| `createTransaction(data)` | Crea gasto + snapshot de price_per_hour + recalcula presupuestos |
| `updateTransaction(id, data)` | Edita gasto |
| `deleteTransaction(id)` | Elimina gasto + recalcula presupuestos |
| `getCategories()` | Categorías del usuario |
| `createCategory(data)` | Crea categoría custom |
| `upsertBudget(category_id, suggested)` | Crea o actualiza límite sugerido |
| `recalculateBudgetAvgs()` | (privado) Recalcula promedios históricos por categoría |
| `getPendingRecurringTransactions()` | Plantillas pendientes de confirmación |
| `approveRecurringTransaction(id)` | Crea transacción desde plantilla + actualiza last_confirmed_at |
| `createRecurringTemplate(data)` | Crea plantilla recurrente con frecuencia |
| `updateRecurringTemplate(id, data)` | Edita plantilla |
| `deleteRecurringTemplate(id)` | Elimina plantilla |
| `confirmRecurringTemplate(id)` | Marca como activa (sin crear transacción) |

### Frecuencias de plantillas recurrentes
| Frecuencia | Campo referencia | Lógica pending |
|---|---|---|
| `daily` | — | Pendiente si no confirmada hoy |
| `weekly` | `day_of_month` = día semana (1=Lun..7=Dom) | Pendiente si es el día correcto esta semana |
| `biweekly` | `day_of_month` = día semana | Pendiente si es el día correcto y han pasado ≥14 días |
| `monthly` | `day_of_month` = día del mes (1-31) | Pendiente si `day_of_month <= hoy` y no confirmada este período |
| `annual` | `day_of_month` + `month_of_year` | Pendiente si mes y día coinciden y no confirmada este año |
| `custom` | `custom_interval_days` | Pendiente si han pasado ≥ N días desde last_confirmed_at |

### Componentes UI
- **`DashboardClient.tsx`** — contenedor cliente, FAB, estado de modales, router.refresh()
- **`HeroCard.tsx`** — neto protagonista 38px, chip `+X.Xd autonomía`, barra retención, explicación autonomía económica, historial 6 meses (Recharts ComposedChart)
- **`RecurringBanner.tsx`** — banner dorado con recurrentes pendientes, botón "✓ Aprobar"
- **`AddTransactionModal.tsx`** — monto + categoría grid + fecha + notas + toggle recurrente (con selector de frecuencia y campos condicionales)
- **`TransactionSlider.tsx`** — 3 tabs (Gastos/Presupuestos/Recurrentes) + TxSheet + BudgetSheet + RecurringSheet

---

## 📐 Los 8 Algoritmos
| # | Nombre | Módulo | Estado |
|---|---|---|---|
| 1 | Precio Real por Hora | Módulo 1 | ✅ Implementado |
| 2 | Tracker de Transacciones | Módulo 2 | ✅ Implementado |
| 3 | Autonomía Económica (días libres) | Módulo 2 | ✅ Implementado |
| 4 | Días de Libertad | Módulo 3 | ❌ |
| 5 | Fórmula Fastlane | Módulo 3 | ❌ |
| 6 | Score de Progreso | Módulo 3 | ❌ |
| 7 | Design Thinking + Evaluación de Ideas | Módulo 4 | ❌ |
| 8 | Motor AI Transversal | Global | ❌ |

---

## 🚦 Estado del Proyecto

### Completado ✅
- Concepto, stack, algoritmos (8), household feature, estrategia dev
- 22 tablas en Supabase en producción + columnas nuevas en `recurring_templates`
- Next.js 16.2.1 + Supabase SSR conectado
- shadcn/ui configurado, `@anthropic-ai/sdk` instalado
- UI/UX: paleta, tipografía, layout — CERRADO
- Sidebar + BottomNav + layout con PIN auth
- **Módulo 1 — Mi Realidad** completo
- **Módulo 2 — Dashboard Financiero** completo

### Próximos pasos
1. ✅ ~~Módulo 1 — Mi Realidad~~
2. ✅ ~~Módulo 2 — Dashboard Financiero~~
3. ❌ **Módulo 3 — Mi Brújula** (inversiones, metas, días de libertad, fórmula Fastlane)
4. ❌ **Módulo 4 — Ideas de Negocio** (sesiones AI, evaluación CENTS)
5. ❌ **Motor AI** (recomendaciones transversales, contexto persistente)
6. ❌ **Auth real** (login/register con Supabase) — al momento de salir a producción
