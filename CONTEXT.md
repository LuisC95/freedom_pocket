# 📋 Resumen Contextual — Fastlane Compass
## Estado al cierre de sesión — Dashboard funcional con datos reales, listo para planificar módulos

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
| AI | Claude API |
| Deploy | Vercel |
| Datos financieros | Manual MVP → Plaid V2 |
| Integración bancaria | Plaid (USA) — V2 |
| APIs de inversiones | Alpha Vantage / Polygon.io (bolsa) + CoinGecko (crypto) — V2 |
| APIs de moneda | ExchangeRate-API (1,500 llamadas/mes gratis) — sin tabla de tasas en DB |

---

## 🔐 Estrategia de Acceso (Dev → Producción)

### Desarrollo (actual)
- **Sin Supabase auth** — se saltea hasta lanzamiento público (Supabase limita logins en free tier)
- PIN hardcodeado en `DEV_ACCESS_PIN` (.env.local = `310595`)
- Validado en `(protected)/layout.tsx` — `isAuthenticated()` chequea cookie `dev_access`
- Acceso a DB vía **service_role key** en servidor (`createAdminClient`) — bypassa RLS
- `DEV_USER_ID` hardcodeado en `src/lib/dev-user.ts` = `1e04cc3d-2c30-4cf9-a977-bb7209aece3a`
- Un usuario de prueba por persona de confianza — creados manualmente en Supabase

### Producción (futuro)
- Remover `DEV_ACCESS_PIN` → middleware se desactiva solo
- Agregar páginas login/register con Supabase auth
- Cambiar `createAdminClient` (service_role) por cliente de auth normal
- El esquema de DB y módulos no cambian

---

## 🎨 Sistema de Diseño (UI/UX — CERRADO)

### Paleta — B Crecimiento
| Token | Hex | Uso |
|---|---|---|
| Base | `#F2F7F4` | Fondo general |
| Sidebar / Cards dark | `#1A2520` | Sidebar, hero cards, bottom nav |
| Acento principal | `#2E7D52` | CTAs, activo, logo |
| Acento claro | `#3A9E6A` | Labels activos, positivos |
| Surface | `#EAF0EC` | Mini cards, stats |
| Premium / AI | `#C69B30` | Motor AI chip, gamification |
| Alerta | `#E84434` | Presupuesto excedido, negativo |
| Texto primario | `#141F19` | Títulos, valores |
| Texto secundario | `#7A9A8A` | Labels, metadata |

### Tipografía
- **IBM Plex Mono** — números, valores monetarios, métricas, datos
- **IBM Plex Sans** — UI, labels, navegación, texto corrido

### Layout
- **Desktop:** Sidebar fijo izquierdo 68px oscuro (`#1A2520`) + área de contenido con `ml-[68px]`
- **Mobile:** Bottom nav fijo 60px oscuro (`#1A2520`) + área de contenido con `mb-[60px]`
- Logo: "FC" en cuadrado redondeado verde `#2E7D52`
- Avatar usuario: círculo verde abajo del sidebar

### Patrones de componentes clave
- **Hero card dark:** `bg-[#1A2520]` con label uppercase + valor IBM Plex Mono grande + badge de delta
- **AI chip dorado:** `bg-[#C69B3015]` border `#C69B3040` + dot `#C69B30` — solo Motor AI y gamification
- **Mini stat card:** `bg-[#EAF0EC]` + label 9px + valor IBM Plex Mono
- **Presupuesto bar:** barra `#3A9E6A` normal, `#E84434` cuando excede
- **Transacciones:** icono redondeado + nombre + categoría + **costo en horas de vida** (Algoritmo 3) siempre visible

---

## 🏗 Estructura de Módulos
```
Fastlane Compass
├── Módulo 0 — Core (users, households, periods, settings)
├── Módulo 1 — Mi Realidad Actual
├── Módulo 2 — Dashboard Financiero
├── Módulo 3 — Mi Brújula
├── Módulo 4 — Ideas de Negocio
└── ⚡ Motor AI — Capa transversal
```

---

## 🔓 Onboarding Progresivo
```
Día 1                    → Módulo 1 disponible
Módulo 1 completo        → desbloquea Módulo 2
10 transacciones         → desbloquea Módulo 3
Módulo 3 + 1 meta        → desbloquea Módulo 4
```
El desbloqueo es por cantidad de datos, no por tiempo.

---

## 🌍 Configuraciones Globales
- **Moneda:** Multi-moneda con USD como referencia, conversión en tiempo real vía API (no tabla en DB)
- **Periodo:** Único y unificado para todos los algoritmos, definido por el usuario
- **Inversiones V2:** Vinculación directa con bróker/exchange (Plaid)
- **Variables custom:** Feature de V2, no en MVP

---

## 👨‍👩‍👧 Household Feature (MVP)
Para parejas/hogares que manejan finanzas conjuntas. Configuración flexible con 3 booleanos:
```
shared_incomes      → ¿los ingresos van al pool común?
shared_expenses     → ¿los gastos son del hogar por defecto?
proportional_split  → false = 50/50 | true = % personalizado
```

**Permanece estrictamente individual:**
```
├── Precio Real por Hora
├── Días de Libertad
├── Score de Progreso
├── Inversiones
├── Ideas de Negocio
└── Metas de emancipación
```

---

## 📐 Los 8 Algoritmos
| # | Nombre | Módulo |
|---|---|---|
| 1 | Precio Real por Hora | Módulo 1 |
| 2 | Tracker de Transacciones | Módulo 2 |
| 3 | Costo en Tiempo de Vida | Módulo 2 |
| 4 | Días de Libertad | Módulo 3 |
| 5 | Fórmula Fastlane | Módulo 3 |
| 6 | Score de Progreso | Módulo 3 |
| 7 | Design Thinking + Evaluación de Ideas | Módulo 4 |
| 8 | Motor AI Transversal | Global |

---

## 🗄 Base de Datos
- **Supabase project:** Freedom_Pocket (`rkhrwfdhivsvlronfaaf`) — ACTIVE_HEALTHY, us-east-2
- **21 tablas en producción** ✅
- Todos los `user_id` FK apuntan a `profiles.id`, NO a `auth.users(id)` directamente
- **IMPORTANTE:** El archivo `supabase/migrations/20260326000001_core_schema.sql` local está OBSOLETO — no usar
- **IMPORTANTE:** El archivo `supabase/seed/dev_data.sql` local es INCOMPATIBLE con el schema real — no usar

| Módulo | Tablas |
|---|---|
| 0 — Core | `profiles`, `user_settings`, `periods`, `module_unlocks`, `households`, `household_members` |
| 1 — Realidad | `incomes`, `real_hours` |
| 2 — Dashboard | `transaction_categories`, `recurring_templates`, `transactions`, `budgets` |
| 3 — Brújula | `investments`, `freedom_goals`, `businesses`, `business_cents_scores`, `progress_score_history` |
| 4 — Ideas | `idea_sessions`, `ideas`, `idea_deep_dives`, `idea_session_messages` |
| Motor AI | `ai_context_items`, `ai_recommendations` |

### Schema real — campos clave
| Tabla | Campo | Tipo |
|---|---|---|
| `transactions` | `category_id` | UUID FK → transaction_categories |
| `transactions` | `type` | `expense` \| `income_extra` |
| `transactions` | `transaction_date` | date |
| `budgets` | `percentage` + `category_id` | sin `amount`, sin `period_id` |
| `real_hours` | contracted_hours_per_week, extra_hours_per_week, commute_minutes_per_day, preparation_minutes_per_day, mental_load_hours_per_week, working_days_per_week | — |

---

## 📁 Estructura de Carpetas (Next.js)
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         ← stub vacío
│   │   └── register/page.tsx      ← stub vacío
│   ├── (protected)/
│   │   ├── layout.tsx             ← isAuthenticated() con PIN + sidebar + bottom nav ✅
│   │   ├── dashboard/page.tsx     ← UI + actions funcionando con datos reales ✅
│   │   ├── mi-realidad/page.tsx   ← stub
│   │   ├── brujula/page.tsx       ← stub
│   │   ├── ideas/page.tsx         ← stub
│   │   └── motor-ai/page.tsx      ← stub
│   ├── dev-login/
│   │   ├── page.tsx               ← formulario PIN ✅
│   │   └── actions.ts             ← valida PIN y setea cookie ✅
│   ├── globals.css                ← IBM Plex fonts + CSS variables ✅
│   ├── layout.tsx
│   └── page.tsx                   ← redirect a /dashboard ✅
│
├── modules/
│   ├── core/
│   ├── mi-realidad/
│   ├── dashboard/
│   │   ├── actions/index.ts       ← 4 actions con schema real ✅
│   │   └── types/index.ts         ← tipos con schema real ✅
│   ├── brujula/
│   ├── ideas/
│   └── motor-ai/
│
├── components/
│   ├── ui/                        ← shadcn/ui
│   └── shared/
│       ├── layout/Sidebar.tsx     ✅
│       └── navigation/BottomNav.tsx ✅
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts              ← createClient (SSR normal) + createAdminClient (service_role) ✅
│   │   └── client.ts              ✅
│   ├── dev-user.ts                ← DEV_USER_ID hardcodeado ✅
│   ├── ai/
│   └── validations/
│
├── hooks/
├── types/
└── actions/auth.ts
```

---

## 🚦 Estado del Proyecto

### Completado ✅
- Concepto, stack, algoritmos (8), household feature, estrategia dev
- 21 tablas en Supabase en producción
- Next.js 16.2.1 + Supabase SSR conectado (.env.local con credenciales reales)
- shadcn/ui configurado
- UI/UX: paleta B Crecimiento, tipografía IBM Plex, layout — CERRADO
- Sidebar.tsx + BottomNav.tsx + (protected)/layout.tsx
- Estructura de carpetas base
- Acceso por PIN funcional (cookie `dev_access`)
- Dashboard page con UI + actions adaptadas al schema real
- Seed data en Supabase — dashboard muestra datos reales

### Próximos pasos
1. ❌ **Planificación UX + técnica de Módulos 1–4 y Motor AI** ← SIGUIENTE
2. ❌ **Módulo 1 — Mi Realidad** (ingreso de datos base: ingresos, horas reales)
3. ❌ **Módulo 2 — Dashboard funcional** (CRUD transacciones, presupuestos, plantillas recurrentes)
4. ❌ **Módulo 3 — Mi Brújula** (inversiones, metas, días de libertad, fórmula Fastlane)
5. ❌ **Módulo 4 — Ideas de Negocio** (sesiones AI, evaluación CENTS)
6. ❌ **Motor AI** (recomendaciones transversales, contexto persistente)
7. ❌ **Auth real** (login/register con Supabase) — al momento de salir a producción
