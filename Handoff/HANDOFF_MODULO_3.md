# 🚀 HANDOFF — Fastlane Compass · Módulo 2: Dashboard Financiero
> Documento de traspaso para Claude Code. Leer completo antes de escribir código.

---

## 🧭 Contexto del Proyecto

**Fastlane Compass** — App web personal de finanzas basada en "La Vía Rápida del Millonario" (MJ DeMarco).
Filosofía: desvincular el dinero del tiempo. Cada gasto se expresa también en horas de vida.

### Stack
| Elemento | Valor |
|---|---|
| Framework | Next.js 14 (corriendo 16.2.1) |
| DB | Supabase PostgreSQL (project id en variables de entorno) |
| Estilos | Tailwind CSS v3 + shadcn/ui (preset Nova) |
| Gráficas | Recharts |
| Auth (dev) | PIN hardcodeado — sin Supabase auth todavía |
| Fuentes | IBM Plex Mono (números) + IBM Plex Sans (UI) |
| Deploy | Vercel |

### Acceso a DB
- **Admin client:** `createAdminClient()` en `src/lib/supabase/server.ts` — usa service_role key, bypassa RLS
- **User ID dev:** configurado por variables `DEV_USER_ID_*`
- **Todos los FK de user** apuntan a `profiles.id`, NO a `auth.users(id)`

---

## 🎨 Sistema de Diseño (CERRADO — no modificar)

### Paleta — "B Crecimiento"
```css
--color-base: #F2F7F4;          /* Fondo general */
--color-dark: #1A2520;          /* Sidebar, hero cards, bottom nav */
--color-accent: #2E7D52;        /* CTAs, activo, logo */
--color-accent-light: #3A9E6A;  /* Labels activos, positivos */
--color-surface: #EAF0EC;       /* Mini cards, stats */
--color-gold: #C69B30;          /* Horas de vida chip ONLY */
--color-alert: #E84434;         /* Gastos, negativo */
--color-text-primary: #141F19;  /* Títulos, valores */
--color-text-secondary: #7A9A8A;/* Labels, metadata */
```

### Tipografía
- **IBM Plex Mono** → todos los números, valores monetarios, métricas, horas
- **IBM Plex Sans** → UI, labels, texto corrido, navegación

### Layout
- **Desktop:** Sidebar fijo izquierdo 68px (`#1A2520`) + contenido con `ml-[68px]`
- **Mobile:** Bottom nav fijo 60px (`#1A2520`) + contenido con `mb-[60px]`

### Patrones de componentes
```
Hero card dark:   bg-[#1A2520], label uppercase 9px, valor IBM Plex Mono grande, badge delta
Mini stat card:   bg-[#EAF0EC], label 9px uppercase, valor IBM Plex Mono
Horas chip:       bg-[#C69B3018] border-[#C69B3040] text-[#C69B30] — badge secundario de horas de vida
```

---

## 📁 Estructura de Carpetas

```
src/
├── app/
│   └── (protected)/
│       └── dashboard/
│           └── page.tsx              ← Existe — reemplazar con nuevo módulo
├── modules/
│   ├── mi-realidad/                  ← YA EXISTE — no tocar
│   └── dashboard/
│       ├── types/
│       │   └── index.ts              ← CREAR
│       ├── actions/
│       │   └── index.ts              ← CREAR (14 server actions)
│       └── components/
│           ├── DashboardClient.tsx   ← CREAR — contenedor principal
│           ├── HeroCard.tsx          ← CREAR — neto + gráfica historial
│           ├── TransactionSlider.tsx ← CREAR — tabs: Gastos / Presupuestos / Recurrentes
│           ├── AddTransactionModal.tsx ← CREAR — modal oscuro registro
│           └── RecurringBanner.tsx   ← CREAR — sugerencias pendientes de aprobar
├── lib/
│   ├── supabase/server.ts            ← createAdminClient() ya existe
│   └── dev-user.ts                   ← DEV_USER_ID ya existe
```

---

## 🗄 Schema de DB — Tablas del Módulo 2

> ⚠️ MIGRACIONES YA APLICADAS EN SUPABASE — no volver a ejecutar.

### `transactions`
```sql
id                    uuid PK default uuid_generate_v4()
user_id               uuid NOT NULL FK → profiles.id
period_id             uuid NOT NULL FK → periods.id
category_id           uuid NOT NULL FK → transaction_categories.id
household_id          uuid NULL FK → households.id
recurring_template_id uuid NULL FK → recurring_templates.id
type                  text NOT NULL CHECK IN ('income', 'expense')
amount                numeric NOT NULL
currency              text NOT NULL default 'USD'
transaction_date      date NOT NULL
notes                 text NULL
price_per_hour_snapshot numeric NULL   -- precio/hora al momento de crear la tx (para horas de vida)
split_type            text NULL        -- para household splits (V2)
split_percentage      numeric NULL
status                text NOT NULL default 'pending' CHECK IN ('pending', 'confirmed')
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

### `transaction_categories`
```sql
id          uuid PK default uuid_generate_v4()
user_id     uuid NULL   -- NULL = categoría de sistema, UUID = categoría custom del usuario
name        text NOT NULL
icon        text NULL
color       text NULL
is_custom   boolean NOT NULL default false
applies_to  text NOT NULL default 'expense' CHECK IN ('expense', 'income', 'both')
created_at  timestamptz default now()
```

**Categorías de sistema ya cargadas (user_id = NULL):**
| Nombre | applies_to |
|---|---|
| Alimentación | expense |
| Deudas | expense |
| Educación | expense |
| Entretenimiento | expense |
| Inversiones | income |
| Otros | both |
| Ropa | expense |
| Salud | expense |
| Tecnología | expense |
| Transporte | expense |
| Vivienda | expense |

### `budgets`
```sql
id              uuid PK default uuid_generate_v4()
user_id         uuid NOT NULL FK → profiles.id
category_id     uuid NOT NULL FK → transaction_categories.id
expense_type    text NOT NULL CHECK IN ('fixed', 'variable')
source          text NOT NULL default 'system' CHECK IN ('system', 'user')
is_active       boolean NOT NULL default true
avg_amount      numeric NULL   -- promedio histórico cacheado, calculado por el sistema
suggested_amount numeric NULL  -- marca opcional que el usuario puede establecer
created_at      timestamptz default now()
updated_at      timestamptz default now()
```

### `recurring_templates`
```sql
id                  uuid PK default uuid_generate_v4()
user_id             uuid NOT NULL FK → profiles.id
household_id        uuid NULL FK → households.id
category_id         uuid NOT NULL FK → transaction_categories.id
name                text NOT NULL
type                text NOT NULL CHECK IN ('income', 'expense')
amount              numeric NOT NULL
currency            text NOT NULL default 'USD'
day_of_month        integer NOT NULL        -- día del mes en que cae
is_active           boolean NOT NULL default true
contract_start_date date NULL               -- para contratos (ej: Netflix desde tal fecha)
contract_end_date   date NULL
total_debt_amount   numeric NULL            -- para deudas con monto total
ping_frequency_days integer NULL           -- cada cuántos días pedir confirmación
last_confirmed_at   timestamptz NULL       -- última vez que se confirmó como activo
created_at          timestamptz default now()
updated_at          timestamptz default now()
```

---

## 📐 Algoritmos — Módulo 2

### Algoritmo 2 — Tracker de Transacciones

```typescript
// Calcular horas de vida por transacción (Algoritmo 3 integrado)
function calcularHorasDeVida(amount: number, pricePerHour: number): number {
  if (!pricePerHour || pricePerHour <= 0) return 0
  return Math.round((amount / pricePerHour) * 10) / 10  // 1 decimal
}

// Al crear una transaction, siempre snapshot del precio/hora actual
// El snapshot es de getMiRealidadData().precio_real_por_hora.precio_por_hora
// Si no hay precio calculado en Módulo 1, price_per_hour_snapshot = null

// Neto del período
const neto = totalIngresos - totalGastos

// Tasa de retención (KPI Fastlane)
const tasaRetencion = totalIngresos > 0
  ? Math.round((neto / totalIngresos) * 100)
  : 0

// Horas libres generadas = neto / price_per_hour
const horasLibres = pricePerHour > 0
  ? Math.round((neto / pricePerHour) * 10) / 10
  : null
```

### Algoritmo 3 — Costo en Tiempo de Vida

```typescript
// Integrado en la UI de transacciones
// Cada tx de tipo 'expense' muestra: amount / price_per_hour_snapshot = horas gastadas
// Cada tx de tipo 'income' muestra: amount / price_per_hour_snapshot = horas ganadas

// Total horas gastadas el mes
const totalHorasGastadas = transactions
  .filter(tx => tx.type === 'expense' && tx.price_per_hour_snapshot)
  .reduce((sum, tx) => sum + (tx.amount / tx.price_per_hour_snapshot!), 0)
```

### Presupuestos — Cálculo del Promedio Histórico

```typescript
// avg_amount se recalcula cada vez que se crea o elimina una transaction
// Fórmula: promedio de lo gastado en esa categoría en los últimos 3 meses completos
// (excluir el mes actual porque está incompleto)

async function recalculateBudgetAvgs(userId: string) {
  const hoy = new Date()
  const tresMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
  const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  // Para cada categoría con transacciones en el período:
  // 1. Obtener suma de gastos por mes (solo meses completos)
  // 2. Dividir entre el número de meses con datos (mín 1, máx 3)
  // 3. Upsert en budgets: avg_amount = ese promedio, source = 'system'
}
```

### Sugerencias de Recurrentes

```typescript
// Una plantilla recurrente está "pendiente" en el período actual cuando:
// 1. is_active = true
// 2. No existe ninguna transaction con recurring_template_id = plantilla.id
//    dentro del período activo del usuario
// 3. day_of_month <= día de hoy (solo sugerir si ya debería haber caído)

// Al aprobar: createTransaction con recurring_template_id = plantilla.id
//             y status = 'confirmed'
```

---

## 📦 Types — src/modules/dashboard/types/index.ts

```typescript
export type TransactionType = 'income' | 'expense'
export type ExpenseType = 'fixed' | 'variable'
export type BudgetSource = 'system' | 'user'

export interface TransactionCategory {
  id: string
  user_id: string | null
  name: string
  icon: string | null
  color: string | null
  is_custom: boolean
  applies_to: 'expense' | 'income' | 'both'
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  period_id: string
  category_id: string
  household_id: string | null
  recurring_template_id: string | null
  type: TransactionType
  amount: number
  currency: string
  transaction_date: string
  notes: string | null
  price_per_hour_snapshot: number | null
  split_type: string | null
  split_percentage: number | null
  status: 'pending' | 'confirmed'
  created_at: string
  updated_at: string
  // join
  category?: TransactionCategory
}

export interface TransactionInsert {
  period_id: string
  category_id: string
  type: TransactionType
  amount: number
  currency?: string
  transaction_date: string
  notes?: string | null
  price_per_hour_snapshot?: number | null
  recurring_template_id?: string | null
  status?: 'pending' | 'confirmed'
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  expense_type: ExpenseType
  source: BudgetSource
  is_active: boolean
  avg_amount: number | null
  suggested_amount: number | null
  created_at: string
  updated_at: string
  // join
  category?: TransactionCategory
  // calculado en runtime
  spent_this_month?: number
  pct_of_avg?: number        // spent / avg_amount * 100
}

export interface RecurringTemplate {
  id: string
  user_id: string
  household_id: string | null
  category_id: string
  name: string
  type: TransactionType
  amount: number
  currency: string
  day_of_month: number
  is_active: boolean
  contract_start_date: string | null
  contract_end_date: string | null
  total_debt_amount: number | null
  ping_frequency_days: number | null
  last_confirmed_at: string | null
  created_at: string
  updated_at: string
  // join
  category?: TransactionCategory
  // calculado en runtime
  is_pending_this_period?: boolean  // true si no tiene tx en el período activo
}

// Transacciones agrupadas por fecha para la lista
export interface TransactionGroup {
  date: string              // 'YYYY-MM-DD'
  transactions: Transaction[]
  day_total_income: number
  day_total_expense: number
}

// Historial de 6 meses para la gráfica del hero
export interface MonthlySnapshot {
  month: string             // 'YYYY-MM'
  month_label: string       // 'Oct', 'Nov', etc.
  total_income: number
  total_expense: number
  net: number
}

// Métricas derivadas del hero
export interface DashboardMetrics {
  total_income_period: number
  total_expense_period: number
  net_period: number
  retention_rate: number          // % retenido
  horas_libres: number | null     // neto / price_per_hour
  horas_gastadas: number | null   // total gastos / price_per_hour
  price_per_hour: number | null   // snapshot del Módulo 1
}

// Payload completo que retorna getDashboardData()
export interface DashboardData {
  periodo_activo: { id: string; start_date: string; end_date: string | null } | null
  metrics: DashboardMetrics
  transaction_groups: TransactionGroup[]
  monthly_history: MonthlySnapshot[]     // últimos 6 meses
  budgets: Budget[]
  recurring_templates: RecurringTemplate[]
  pending_recurring: RecurringTemplate[] // plantillas pendientes de aprobar
  categories: TransactionCategory[]
}
```

---

## ⚙️ Server Actions — src/modules/dashboard/actions/index.ts

```typescript
'use server'
// import { DEV_USER_ID } from '@/lib/dev-user'
// import { createAdminClient } from '@/lib/supabase/server'
```

### 14 actions a implementar:

| Action | Descripción |
|---|---|
| `getDashboardData()` | Carga todo en una sola llamada. Ver detalle abajo. |
| `createTransaction(data: TransactionInsert)` | Crea tx + agrega `price_per_hour_snapshot` + llama `recalculateBudgetAvgs()` |
| `updateTransaction(id, data)` | Edita tx. Validar ownership. |
| `deleteTransaction(id)` | Elimina tx + llama `recalculateBudgetAvgs()` |
| `getCategories(applies_to?)` | Devuelve categorías de sistema + custom del usuario, filtradas por `applies_to` |
| `createCategory(data)` | Crea categoría custom (`is_custom: true`, `user_id: DEV_USER_ID`) |
| `upsertBudget(category_id, suggested_amount)` | Upsert de `suggested_amount` en budgets. `source = 'user'`. |
| `recalculateBudgetAvgs()` | **Llamada interna.** Recalcula `avg_amount` por categoría desde últimos 3 meses completos. Upsert en budgets. |
| `getPendingRecurringTransactions()` | Plantillas activas sin tx en el período activo y `day_of_month <= today`. |
| `approveRecurringTransaction(template_id)` | Crea transaction desde la plantilla con `status = 'confirmed'` y `recurring_template_id`. |
| `createRecurringTemplate(data)` | Crea plantilla recurrente. |
| `updateRecurringTemplate(id, data)` | Edita plantilla. Validar ownership. |
| `deleteRecurringTemplate(id)` | Elimina plantilla. Validar ownership. |
| `confirmRecurringTemplate(id)` | Actualiza `last_confirmed_at = now()` — ping de "sigue activo". |

### Detalle `getDashboardData()`:

```typescript
// 1. Período activo del usuario
// 2. Transactions del período activo con JOIN a transaction_categories
//    → agrupar por transaction_date desc → TransactionGroup[]
// 3. Historial 6 meses: query agrupado por DATE_TRUNC('month', transaction_date)
//    para los 6 meses anteriores al mes actual → MonthlySnapshot[]
// 4. Budgets activos con JOIN a transaction_categories
//    + calcular spent_this_month (suma de transactions del mes actual por category_id)
//    + calcular pct_of_avg = spent_this_month / avg_amount * 100
// 5. Recurring templates activos con JOIN a transaction_categories
//    + marcar is_pending_this_period
// 6. price_per_hour: leer user_settings o calcular desde Módulo 1
//    (SELECT precio_hora_referencia FROM user_settings WHERE user_id = DEV_USER_ID)
//    Si no hay → buscar en incomes/real_hours y calcular (reutilizar lógica de getMiRealidadData)
// 7. Calcular DashboardMetrics desde los datos anteriores
// 8. Categories: todas las de sistema + las custom del usuario
```

---

## 🖥 UI — Estructura de Componentes

### `src/app/(protected)/dashboard/page.tsx`
Server component ligero — llama `getDashboardData()` y pasa al cliente.

```typescript
export default async function DashboardPage() {
  const data = await getDashboardData()
  return <DashboardClient data={data} />
}
```

### `DashboardClient.tsx` — Contenedor principal
```
<HeroCard metrics={} monthly_history={} />
<RecurringBanner pending={} onApprove={} />   ← solo si hay pendientes
<TransactionSlider
  transaction_groups={}
  budgets={}
  recurring_templates={}
  categories={}
/>
<FAB onClick={openAddModal} />                 ← botón "+" flotante
<AddTransactionModal ... />
```

### `HeroCard.tsx` — Hero card oscuro (`bg-[#1A2520]`)

**Jerarquía visual (de mayor a menor importancia):**

```
[LABEL pequeño] "retenido este mes"
[VALOR GRANDE 38px verde IBM Plex Mono] "+$1,582"          ← PROTAGONISTA
[CHIP DORADO pequeño] "+70 hrs libres"                     ← secundario derecha

[FILA SECUNDARIA — bg oscuro sutil]
  "$4,800 ingresos"  |  "$3,218 gastos"                   ← 19px cada uno

[BARRA DE RETENCIÓN]
  verde 67% | rojo 33%
  labels: "67% retenido" / "33% gastado"

[GRÁFICA HISTORIAL 6 MESES — Recharts]
  - BarChart: barra verde (income) + barra roja (expense) por mes
  - Line encima: neto del mes (línea punteada gris/blanca)
  - Eje X: etiquetas de mes cortas ("Oct", "Nov"...)
  - Mes actual destacado en verde
  - Sin ejes Y visibles — solo valores en tooltip
  - Colores: income=#3A9E6A, expense=#E84434, net line=#7A9A8A dashed
  - Fondo transparente, texto #7A9A8A
```

**Estados del hero:**
| Estado | Qué mostrar |
|---|---|
| Sin transactions | Neto $0, barra vacía, gráfica vacía con placeholder |
| Con transactions | Todo calculado según métricas |
| Sin price_per_hour (Módulo 1 incompleto) | Chip de horas no mostrar, badge "completa Módulo 1" |

### `RecurringBanner.tsx`
- Se muestra **solo si hay plantillas pendientes de aprobar**
- Banner compacto encima del slider, fondo `#1A2520`
- Lista horizontal con chips: "[icono] Netflix $18 · 0.8 hrs [✓ Aprobar]"
- Tap en "Aprobar" → llama `approveRecurringTransaction(template_id)` → refresca

### `TransactionSlider.tsx` — Slider con 3 tabs

**Tab 1 — Gastos (lista de transacciones)**
- Agrupadas por fecha, sección con label "HOY", "AYER", "LUN 24 MAR", etc.
- Cada row:
  - Izquierda: dot de color de categoría + nombre + categoría label
  - Derecha: **monto en 14px IBM Plex Mono bold** (rojo si gasto, verde si ingreso) + horas de vida en 9px dorado debajo
  - Tap → sheet de detalle con botones Editar / Eliminar
- Ingresos y gastos mezclados en la misma lista, diferenciados por color

**Tab 2 — Presupuestos**
- Una row por categoría con presupuesto (avg_amount > 0)
- Cada row:
  - Nombre + sparkline semanal (4 barras últimas 4 semanas)
  - Monto gastado este mes bold + "/ prom. $XXX" en gris
  - Barra de progreso: `spent / avg_amount * 100`
    - Verde: < 80%
    - Amarillo/gold: 80-100%
    - Rojo: > 100%
  - Labels debajo: "XX% del promedio" + "faltan $XX" o "+$XX sobre historial"
  - Si tiene `suggested_amount`: mostrar también como línea de referencia en la barra
- Tap en una row → sheet para editar `suggested_amount`

**Tab 3 — Recurrentes**
- Lista de `recurring_templates` activos
- Cada row: nombre + monto + día del mes + badge tipo (fijo/variable)
- Badge de estado: verde "activo" / gris "pendiente confirmación"
- Tap → sheet con detalle, botones Editar / Eliminar / Confirmar activo

### `AddTransactionModal.tsx` — Modal oscuro (`bg-[#1A2520]`)
Siguiendo el patrón de `RegisterPaymentModal.tsx` del Módulo 1.

**Campos:**
- Toggle tipo: Gasto / Ingreso (cambia el color del modal — rojo/verde)
- Select categoría — filtrado por `applies_to` según el tipo seleccionado
- Campo monto (IBM Plex Mono, grande)
- Date picker — default hoy
- Campo notas (opcional)
- Toggle "¿Es recurrente?" — si activa, muestra campo `day_of_month` y opción de crear `recurring_template`
- Al guardar: llama `createTransaction()` con `price_per_hour_snapshot` tomado de los datos cargados

---

## ⚠️ Reglas Críticas

1. **Siempre `createAdminClient()`** — nunca el SSR client para datos
2. **`price_per_hour_snapshot`** — siempre guardar al momento de crear la tx, nunca recalcular después
3. **`recalculateBudgetAvgs()`** — llamar internamente en `createTransaction` y `deleteTransaction`, nunca manualmente desde la UI
4. **Horas de vida** — calcular en runtime como `amount / price_per_hour_snapshot`, NO guardar en DB
5. **Promedios históricos** — usar solo meses completos (excluir el mes actual)
6. **Categorías de sistema** — `user_id = NULL`, nunca modificarlas, solo leerlas
7. **Plantillas pendientes** — solo sugerir si `day_of_month <= día de hoy` dentro del período activo
8. **Validar ownership** antes de UPDATE o DELETE en transactions, budgets, recurring_templates
9. **Neto = protagonista** — el número más grande siempre es el neto, no el gasto ni el ingreso
10. **`getDashboardData()`** — una sola llamada al cargar la página, sin waterfalls

---

## ✅ Checklist de Entrega

- [ ] `src/modules/dashboard/types/index.ts` creado con todos los tipos
- [ ] `src/modules/dashboard/actions/index.ts` — 14 server actions
- [ ] `getDashboardData()` retorna `DashboardData` completo en una sola llamada
- [ ] `recalculateBudgetAvgs()` se ejecuta en create y delete de transactions
- [ ] `src/app/(protected)/dashboard/page.tsx` — server component → `DashboardClient`
- [ ] `HeroCard.tsx` — neto 38px protagonista + chip horas + fila ingresos/gastos + barra retención + gráfica Recharts 6 meses
- [ ] `RecurringBanner.tsx` — se muestra solo si hay pendientes, aprobación con un tap
- [ ] `TransactionSlider.tsx` — 3 tabs funcionales (Gastos / Presupuestos / Recurrentes)
- [ ] `AddTransactionModal.tsx` — modal oscuro con toggle Gasto/Ingreso, categoría filtrada, precio/hora snapshot
- [ ] Tab Gastos: lista agrupada por día, monto bold 14px, horas chip dorado 9px
- [ ] Tab Presupuestos: barra automática vs promedio histórico, sparklines, suggested_amount editable
- [ ] Tab Recurrentes: lista con estado, Editar / Eliminar / Confirmar activo
- [ ] Gráfica hero: BarChart Recharts con Line encima, colores del sistema de diseño
- [ ] `npm run dev` sin errores TypeScript
