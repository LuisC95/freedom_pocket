# 🚀 HANDOFF — Fastlane Compass · Módulo 1: Mi Realidad Actual
> Documento de traspaso para Claude Code. Leer completo antes de escribir código.

---

## 🧭 Contexto del Proyecto

**Fastlane Compass** — App web personal de finanzas basada en "La Vía Rápida del Millonario" (MJ DeMarco).
Filosofía: desvincular el dinero del tiempo. Riqueza = Familia + Salud + Libertad.

### Stack
| Elemento | Valor |
|---|---|
| Framework | Next.js 14 (corriendo 16.2.1) |
| DB | Supabase PostgreSQL (`rkhrwfdhivsvlronfaaf`) |
| Estilos | Tailwind CSS v3 + shadcn/ui (preset Nova) |
| Auth (dev) | PIN hardcodeado — sin Supabase auth todavía |
| Fuentes | IBM Plex Mono (números) + IBM Plex Sans (UI) |
| Deploy | Vercel |

### Acceso a DB
- **Admin client:** `createAdminClient()` en `src/lib/supabase/server.ts` — usa service_role key, bypassa RLS
- **User ID dev:** hardcodeado en `src/lib/dev-user.ts` → `1e04cc3d-2c30-4cf9-a977-bb7209aece3a`
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
--color-gold: #C69B30;          /* Motor AI, gamification ONLY */
--color-alert: #E84434;         /* Errores, negativo */
--color-text-primary: #141F19;  /* Títulos, valores */
--color-text-secondary: #7A9A8A;/* Labels, metadata */
```

### Tipografía
- **IBM Plex Mono** → todos los números, valores monetarios, métricas
- **IBM Plex Sans** → UI, labels, texto corrido, navegación

### Layout
- **Desktop:** Sidebar fijo izquierdo 68px (`#1A2520`) + contenido con `ml-[68px]`
- **Mobile:** Bottom nav fijo 60px (`#1A2520`) + contenido con `mb-[60px]`

### Patrones de componentes
```
Hero card dark:   bg-[#1A2520], label uppercase pequeño, valor IBM Plex Mono grande, badge delta
Mini stat card:   bg-[#EAF0EC], label 9px uppercase, valor IBM Plex Mono
AI chip dorado:   bg-[#C69B3015] border-[#C69B3040] dot-[#C69B30] — SOLO para Motor AI
```

---

## 📁 Estructura de Carpetas Relevante

```
src/
├── app/
│   └── (protected)/
│       └── mi-realidad/
│           └── page.tsx          ← STUB vacío — REEMPLAZAR
├── modules/
│   └── mi-realidad/
│       ├── types/
│       │   └── index.ts          ← CREAR (ver sección Types)
│       └── actions/
│           └── index.ts          ← CREAR
├── lib/
│   ├── supabase/
│   │   └── server.ts             ← createAdminClient() ya existe
│   └── dev-user.ts               ← DEV_USER_ID ya existe
```

---

## 🗄 Schema de DB — Tablas del Módulo 1

> ⚠️ MIGRACIÓN YA APLICADA EN SUPABASE — no volver a ejecutar.

### `periods`
```sql
id          uuid PK
user_id     uuid FK → profiles.id
start_date  date
end_date    date NULL     -- NULL = período activo
is_active   boolean default true
label       text NULL
created_at  timestamptz
```

### `incomes` (migrado — tipos actualizados)
```sql
id                    uuid PK
user_id               uuid FK → profiles.id
period_id             uuid FK → periods.id
household_id          uuid NULL FK → households.id
contributed_by        uuid FK → profiles.id
type                  text CHECK IN ('hourly','commission','fixed','passive','project')
frequency             text NULL CHECK IN ('weekly','biweekly','monthly','irregular')
amount                numeric CHECK > 0   -- estimado base (si no hay entries)
currency              text default 'USD'
label                 text
effective_from        date
effective_to          date NULL
updates_retroactively boolean default false
created_at            timestamptz
updated_at            timestamptz
```

### `income_entries` (tabla nueva — ya creada en Supabase ✅)
```sql
id           uuid PK
income_id    uuid FK → incomes.id ON DELETE CASCADE
user_id      uuid FK → profiles.id ON DELETE CASCADE
amount       numeric NOT NULL CHECK > 0
currency     text default 'USD'
entry_date   date NOT NULL
hours_worked numeric NULL CHECK >= 0   -- solo tipo 'hourly'
notes        text NULL
created_at   timestamptz
```

### `real_hours`
```sql
id                          uuid PK
user_id                     uuid FK → profiles.id
period_id                   uuid FK → periods.id
contracted_hours_per_week   numeric CHECK >= 0
extra_hours_per_week        numeric default 0
commute_minutes_per_day     integer default 0
preparation_minutes_per_day integer default 0
recovery_start_time         time    -- contexto AI, NO entra al cálculo
arrival_home_time           time    -- contexto AI, NO entra al cálculo
mental_load_hours_per_week  numeric default 0
working_days_per_week       integer CHECK 1–7
created_at                  timestamptz
updated_at                  timestamptz
```

### `user_settings` (columnas nuevas — ya creadas ✅)
```sql
precio_hora_referencia  numeric NULL   -- precio/hora del año anterior
anio_referencia         integer NULL   -- ej: 2024
```

---

## 📐 Algoritmo 1 — Precio Real por Hora

```typescript
// ----------------------------------------------------------------
// 1. INGRESO MENSUAL — lógica adaptativa por tipo de ingreso
// ----------------------------------------------------------------
function calcularIngresoMensual(income: Income, entries: IncomeEntry[]): number {
  const hoy = new Date()
  const entriesEsteMes = entries.filter(e =>
    e.income_id === income.id &&
    new Date(e.entry_date).getMonth() === hoy.getMonth() &&
    new Date(e.entry_date).getFullYear() === hoy.getFullYear()
  )

  // Si hay pagos reales registrados este mes → usar suma real
  if (entriesEsteMes.length > 0) {
    return entriesEsteMes.reduce((sum, e) => sum + e.amount, 0)
  }

  // Si no hay entries → normalizar amount base según frecuencia
  switch (income.frequency) {
    case 'weekly':   return income.amount * 4.33
    case 'biweekly': return income.amount * 2
    case 'monthly':  return income.amount
    default:         return income.amount  // irregular o null
  }
}

const total_ingresos_mes = ingresos.reduce(
  (sum, income) => sum + calcularIngresoMensual(income, allEntries), 0
)

// ----------------------------------------------------------------
// 2. HORAS REALES POR SEMANA
// ----------------------------------------------------------------
const horas_desplazamiento =
  (commute_minutes_per_day * working_days_per_week * 2) / 60  // ida y vuelta

const horas_preparacion =
  (preparation_minutes_per_day * working_days_per_week) / 60

const horas_reales_semana =
  contracted_hours_per_week +
  extra_hours_per_week +
  horas_desplazamiento +
  horas_preparacion +
  mental_load_hours_per_week

// ----------------------------------------------------------------
// 3. PRECIO REAL POR HORA
// ----------------------------------------------------------------
const precio_por_hora = total_ingresos_mes / (horas_reales_semana * 4.33)

// ----------------------------------------------------------------
// 4. DELTA VS AÑO ANTERIOR
// ----------------------------------------------------------------
const delta = userSettings.precio_hora_referencia
  ? precio_por_hora - userSettings.precio_hora_referencia
  : null
```

---

## 📦 Types — src/modules/mi-realidad/types/index.ts

```typescript
export interface Period {
  id: string
  user_id: string
  start_date: string
  end_date: string | null
  is_active: boolean
  label: string | null
  created_at: string
}

export type IncomeType = 'hourly' | 'commission' | 'fixed' | 'passive' | 'project'
export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'irregular'

export interface Income {
  id: string
  user_id: string
  period_id: string
  household_id: string | null
  contributed_by: string
  type: IncomeType
  frequency: IncomeFrequency | null
  amount: number
  currency: string
  label: string
  effective_from: string
  effective_to: string | null
  updates_retroactively: boolean
  created_at: string
  updated_at: string
}

export type IncomeInsert = Omit<Income, 'id' | 'created_at' | 'updated_at'>
export type IncomeUpdate = Partial<Omit<Income, 'id' | 'user_id' | 'period_id' | 'created_at'>> & { id: string }

export interface IncomeEntry {
  id: string
  income_id: string
  user_id: string
  amount: number
  currency: string
  entry_date: string
  hours_worked: number | null
  notes: string | null
  created_at: string
}

export type IncomeEntryInsert = Omit<IncomeEntry, 'id' | 'created_at'>

export interface IncomeConEntries extends Income {
  entries: IncomeEntry[]
  total_mes_calculado: number
}

export interface RealHours {
  id: string
  user_id: string
  period_id: string
  contracted_hours_per_week: number
  extra_hours_per_week: number
  commute_minutes_per_day: number
  preparation_minutes_per_day: number
  recovery_start_time: string
  arrival_home_time: string
  mental_load_hours_per_week: number
  working_days_per_week: number
  created_at: string
  updated_at: string
}

export type RealHoursUpsert = Omit<RealHours, 'id' | 'created_at' | 'updated_at'>

export interface PrecioRealPorHora {
  total_ingresos_mes: number
  horas_reales_semana: number
  desglose_horas: {
    contratadas: number
    extra: number
    desplazamiento: number
    preparacion: number
    carga_mental: number
  }
  precio_por_hora: number
  currency: string
  calculado_con_periodo_id: string
  precio_referencia: number | null
  anio_referencia: number | null
  delta_vs_referencia: number | null
}

export type MiRealidadEstado =
  | 'sin_datos'
  | 'solo_ingresos'
  | 'solo_horas'
  | 'completo'

export interface MiRealidadData {
  periodo_activo: Period | null
  ingresos: IncomeConEntries[]
  real_hours: RealHours | null
  precio_real_por_hora: PrecioRealPorHora | null
  estado: MiRealidadEstado
}
```

---

## ⚙️ Server Actions — src/modules/mi-realidad/actions/index.ts

```typescript
'use server'
// Todas las actions siguen este patrón:
// import { DEV_USER_ID } from '@/lib/dev-user'
// import { createAdminClient } from '@/lib/supabase/server'
```

### 8 actions a implementar:

| Action | Descripción |
|---|---|
| `getMiRealidadData()` | Carga todo: período, ingresos+entries, horas, calcula precio, determina estado |
| `createIncome(data)` | Crea fuente de ingreso. `contributed_by` = DEV_USER_ID |
| `updateIncome(data)` | Actualiza fuente. Validar ownership antes |
| `deleteIncome(id)` | Elimina fuente. Validar ownership antes |
| `upsertRealHours(data)` | INSERT o UPDATE según si ya existe para ese period+user |
| `createIncomeEntry(data)` | Registra pago real. Validar que income_id pertenece al usuario |
| `deleteIncomeEntry(id)` | Elimina pago. Validar ownership |
| `updateReferencia(precio, anio)` | Upsert en user_settings de precio_hora_referencia + anio_referencia |

---

## 🖥 UI — src/app/(protected)/mi-realidad/page.tsx

### Estructura
```
[Hero Card Dark — Precio Real por Hora]
  - Estado completo: precio en verde + delta "▲ +$X.XX vs 2024"
  - Estado parcial: mensaje orientativo según qué falta
  - Estado sin datos: CTA onboarding

[Sección Ingresos — izquierda/arriba]
  - Lista de fuentes con entries expandibles
  - Botón "+ Registrar pago" (crea income_entry)
  - Botón "+ Nueva fuente" (crea income)

[Sección Horas Reales — derecha/abajo]
  - Formulario agrupado en 6 secciones
  - "Límites del día" colapsado con label "Contexto AI"
  - Botón "Guardar"

[Desglose de horas — solo cuando completo]
  - Mini stat cards con cada componente
```

### Estados del hero card
| Estado | Mensaje |
|---|---|
| `sin_datos` | "Completa tus ingresos y horas para calcular tu precio real" |
| `solo_ingresos` | "Agrega tus horas reales para completar el cálculo" |
| `solo_horas` | "Agrega al menos un ingreso para completar el cálculo" |
| `completo` | Precio en verde + delta vs año anterior si hay referencia |

### Registro de pagos — UI del sheet
- Select de fuente de ingreso (dropdown con las `incomes` del usuario)
- Campo monto + campo fecha
- Campo `hours_worked` — visible SOLO si la fuente seleccionada es tipo `hourly`
- Campo notas (opcional)
- Soporte lote: botón "Agregar otra fuente" para registrar varios ingresos en la misma fecha

---

## ⚠️ Reglas Críticas

1. **Siempre `createAdminClient()`** — nunca el SSR client para datos
2. **No crear períodos** — solo leer el activo (`is_active = true`)
3. **`contributed_by`** en incomes = `DEV_USER_ID` siempre (dev)
4. **`real_hours` es upsert** — máximo 1 registro por usuario/período
5. **Cálculo del precio siempre en servidor** — nunca en cliente
6. **`recovery_start_time` / `arrival_home_time`** — se guardan, NO entran al cálculo
7. **Lógica adaptativa**: entries reales del mes > amount estimado + normalización por frecuencia
8. **Validar ownership** antes de UPDATE o DELETE en cualquier tabla

---

## 🔓 Unlock al completar Módulo 1

```typescript
// Ejecutar cuando: ingresos.length > 0 && real_hours !== null
const { data: existing } = await supabase
  .from('module_unlocks')
  .select('id')
  .eq('user_id', DEV_USER_ID)
  .eq('module_key', 'module_2')
  .maybeSingle()

if (!existing) {
  await supabase.from('module_unlocks').insert({
    user_id: DEV_USER_ID,
    module_key: 'module_2',
    unlock_trigger: 'module_1_complete'
  })
}
```

---

## ✅ Checklist de Entrega

- [ ] `src/modules/mi-realidad/types/index.ts` creado
- [ ] `src/modules/mi-realidad/actions/index.ts` — 8 actions
- [ ] `src/app/(protected)/mi-realidad/page.tsx` — UI con 4 estados
- [ ] Hero card muestra precio + delta cuando hay referencia
- [ ] Registro de pagos funcional (income_entries) con soporte lote
- [ ] `hours_worked` visible solo cuando la fuente es tipo `hourly`
- [ ] CRUD de fuentes de ingreso funcional
- [ ] Formulario horas hace upsert correctamente
- [ ] Al completar → inserta en `module_unlocks`
- [ ] `npm run dev` sin errores TypeScript
