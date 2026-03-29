# 📋 Resumen Contextual — Fastlane Compass
## Estado al cierre de sesión — Módulo 1 (Mi Realidad) completo y commiteado en branch `miRealidad`

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
| AI | Claude API (`@anthropic-ai/sdk` instalado) |
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

---

## 🏗 Estructura de Módulos
```
Fastlane Compass
├── Módulo 0 — Core (users, households, periods, settings)
├── Módulo 1 — Mi Realidad Actual ✅
├── Módulo 2 — Dashboard Financiero
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
- **22 tablas en producción** ✅ (21 originales + `income_entries`)
- Todos los `user_id` FK apuntan a `profiles.id`, NO a `auth.users(id)` directamente
- **IMPORTANTE:** Los archivos locales `supabase/migrations/` y `supabase/seed/` son OBSOLETOS — no usar

| Módulo | Tablas |
|---|---|
| 0 — Core | `profiles`, `user_settings`, `periods`, `module_unlocks`, `households`, `household_members` |
| 1 — Realidad | `incomes`, `income_entries`, `real_hours` |
| 2 — Dashboard | `transaction_categories`, `recurring_templates`, `transactions`, `budgets` |
| 3 — Brújula | `investments`, `freedom_goals`, `businesses`, `business_cents_scores`, `progress_score_history` |
| 4 — Ideas | `idea_sessions`, `ideas`, `idea_deep_dives`, `idea_session_messages` |
| Motor AI | `ai_context_items`, `ai_recommendations` |

### Tabla `income_entries` (nueva — ya creada en Supabase ✅)
```sql
id               uuid PK
income_id        uuid FK → incomes.id ON DELETE CASCADE
user_id          uuid FK → profiles.id
amount           numeric NOT NULL CHECK > 0
currency         text default 'USD'
entry_date       date NOT NULL
hours_worked     numeric NULL
notes            text NULL
entry_type       text CHECK IN ('earning', 'deduction')
deduction_category text NULL  -- federal_tax|state_tax|social_security|medicare|health_insurance|dental_insurance|vision_insurance|retirement_401k|other
created_at       timestamptz
```

### `user_settings` (columnas nuevas ✅)
```sql
precio_hora_referencia  numeric NULL
anio_referencia         integer NULL
```

---

## 📁 Estructura de Carpetas (Next.js)
```
src/
├── app/
│   ├── (protected)/
│   │   ├── layout.tsx             ← PIN auth + sidebar + bottom nav ✅
│   │   ├── dashboard/page.tsx     ← UI con datos reales ✅
│   │   ├── mi-realidad/page.tsx   ← Server component → MiRealidadClient ✅
│   │   ├── brujula/page.tsx       ← stub
│   │   ├── ideas/page.tsx         ← stub
│   │   └── motor-ai/page.tsx      ← stub
│
├── modules/
│   ├── mi-realidad/
│   │   ├── types/index.ts         ← tipos completos ✅
│   │   ├── actions/index.ts       ← 7 server actions ✅
│   │   └── components/
│   │       ├── MiRealidadClient.tsx      ← hero card + income list + horas modal ✅
│   │       └── RegisterPaymentModal.tsx  ← modal oscuro con scanner paystub ✅
│   ├── dashboard/
│   │   ├── actions/index.ts       ✅
│   │   └── types/index.ts         ✅
│
├── references/
│   └── RegisterPaymentModal.reference.tsx  ← fuente de verdad visual del modal
│
├── lib/
│   ├── supabase/server.ts         ← createClient + createAdminClient ✅
│   ├── dev-user.ts                ← DEV_USER_ID ✅
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
| `scanPaystub(base64, mimeType)` | Llama Claude Vision API — soporta imágenes y PDF |
| `checkAndUnlockModule2()` | Inserta en `module_unlocks` si hay ingresos + horas |

### Algoritmo 1 — Precio Real por Hora
- Si hay `income_entries` este mes → usa `ganancias - deducciones` como ingreso real
- Si no hay entries → normaliza `amount` base según frecuencia (weekly×4.33, biweekly×2, monthly×1)
- `horas_reales = contratadas + extra + desplazamiento + preparación + carga_mental`
- `precio_por_hora = total_ingresos_mes / (horas_reales × 4.33)`

### UI (`MiRealidadClient.tsx` + `RegisterPaymentModal.tsx`)
- **Hero card dark** con Precio Real por Hora + desglose de horas (4 estados: sin_datos, solo_ingresos, solo_horas, completo)
- **Income list**: fuentes con entries inline (fecha, tipo earning/deduction, monto +/-)
- **Botones siempre visibles**: "+ Nueva fuente" (abre IncomeModal blanco) y "+ Registrar pago" (abre RegisterPaymentModal oscuro)
- **IncomeModal**: monto + periodicidad solo para `fixed`/`hourly`; comisión/proyecto/pasivo omiten esos campos
- **RegisterPaymentModal**: diseño oscuro `#1A2520`, scanner paystub (imagen o PDF ≤2 pág), filas múltiples de ganancias + deducciones, totales Bruto/Deducciones/Neto en tiempo real, columna Horas solo para fuentes tipo `hourly`

---

## 📐 Los 8 Algoritmos
| # | Nombre | Módulo | Estado |
|---|---|---|---|
| 1 | Precio Real por Hora | Módulo 1 | ✅ Implementado |
| 2 | Tracker de Transacciones | Módulo 2 | ❌ |
| 3 | Costo en Tiempo de Vida | Módulo 2 | ❌ |
| 4 | Días de Libertad | Módulo 3 | ❌ |
| 5 | Fórmula Fastlane | Módulo 3 | ❌ |
| 6 | Score de Progreso | Módulo 3 | ❌ |
| 7 | Design Thinking + Evaluación de Ideas | Módulo 4 | ❌ |
| 8 | Motor AI Transversal | Global | ❌ |

---

## 🚦 Estado del Proyecto

### Completado ✅
- Concepto, stack, algoritmos (8), household feature, estrategia dev
- 22 tablas en Supabase en producción (incluyendo `income_entries`)
- Next.js 16.2.1 + Supabase SSR conectado
- shadcn/ui configurado, `@anthropic-ai/sdk` instalado
- UI/UX: paleta, tipografía, layout — CERRADO
- Sidebar + BottomNav + layout con PIN auth
- Dashboard con datos reales
- **Módulo 1 — Mi Realidad** completo (branch `miRealidad`, commit `c166971`)

### Próximos pasos
1. ✅ ~~Módulo 1 — Mi Realidad~~
2. ❌ **Merge branch `miRealidad` → `main`** cuando esté validado en browser
3. ❌ **Módulo 2 — Dashboard funcional** (CRUD transacciones, presupuestos, plantillas recurrentes)
4. ❌ **Módulo 3 — Mi Brújula** (inversiones, metas, días de libertad, fórmula Fastlane)
5. ❌ **Módulo 4 — Ideas de Negocio** (sesiones AI, evaluación CENTS)
6. ❌ **Motor AI** (recomendaciones transversales, contexto persistente)
7. ❌ **Auth real** (login/register con Supabase) — al momento de salir a producción
