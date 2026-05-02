# 🔧 HANDOFF · Módulo Settings — Configuración de Usuario

> Fuente de verdad para la implementación de la sección de **Configuración** de Fastlane Compass.
> Diseño cerrado · implementación pendiente.
> Referencia visual: `settings-mockup-v2.html` (entregado en la misma sesión).

---

## 📌 Estado actual

- ✅ Schema existente — `profiles`, `user_settings`, `households`, `household_members` (no se requieren migraciones)
- ✅ UX locked — patrón "lista → tap → detalle" estilo iOS Settings
- ✅ Mockup interactivo entregado con Glass Dark theme real
- ⏳ **Ruta `/configuracion`** — no existe aún
- ⏳ **Server actions** — no existen aún
- ⏳ **Componentes** — no existen aún
- ⏳ **Integración en BottomNav / Sidebar** — pendiente (agregar 5to item "Config")

---

## 🎯 Decisiones tomadas (no re-discutir)

| # | Decisión | Impacto |
|---|---|---|
| 1 | **Patrón de navegación:** lista principal → slide-in detalle (estilo iOS Settings) | UX de toda la sección |
| 2 | **Auth sigue con PIN** — no implementar auth real en esta fase | Sección "Cuenta" muestra items como "Próximamente" |
| 3 | **No se requieren migraciones SQL** — todas las tablas y columnas ya existen | Zero schema changes |
| 4 | **5 grupos de configuración:** Perfil, Preferencias, Hogar, Suscripción, Cuenta | Estructura de la página |
| 5 | **Items "Próximamente"** se muestran atenuados (opacity 0.4) pero no son interactivos | Cambiar PIN, Exportar datos, BYOK |
| 6 | **Glass Dark theme** — toda la UI sigue el sistema visual actual (glass surfaces, bg-base #070E0A, orbs animados) | Todos los componentes |
| 7 | **`createAdminClient()`** para todas las operaciones de datos — consistente con el resto de la app | Todas las actions |

---

## 🗂️ Archivos a producir

```
src/app/(protected)/configuracion/
└── page.tsx                        ← Server component (data fetching + render client)

src/modules/settings/
├── components/
│   ├── SettingsClient.tsx          ← Client component principal (lista + detail overlays)
│   ├── ProfileDetail.tsx           ← Detalle de perfil (nombre, avatar, ocupación)
│   ├── PreferencesDetail.tsx       ← Detalle de preferencias (moneda, timezone, etc.)
│   ├── HouseholdDetail.tsx         ← Detalle de hogar (miembros + 3 toggles)
│   ├── SubscriptionDetail.tsx      ← Detalle de plan (info only, read-only)
│   └── AboutDetail.tsx             ← Acerca de (versión, créditos)
├── actions/
│   └── index.ts                    ← Server actions (updateProfile, updateSettings, updateHousehold)
└── types/
    └── index.ts                    ← Types para el módulo
```

Archivos existentes a modificar:
```
src/components/shared/navigation/BottomNav.tsx   ← Agregar 5to item "Config"
src/components/shared/layout/Sidebar.tsx         ← Agregar 5to item "Config"
```

---

## 📐 Arquitectura de datos

### Lectura (page.tsx → Server Component)

El `page.tsx` hace 3 queries y pasa todo al client component como props:

```typescript
// 1. Profile
const { data: profile } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url, occupation, is_admin')
  .eq('id', userId)
  .single()

// 2. User Settings
const { data: settings } = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', userId)
  .single()

// 3. Household + Members (puede no existir)
const { data: memberRow } = await supabase
  .from('household_members')
  .select(`
    household_id,
    role,
    display_name,
    household:households (
      id, name, shared_incomes, shared_expenses, proportional_split
    )
  `)
  .eq('user_id', userId)
  .maybeSingle()

// Si memberRow existe, traer todos los miembros del household
let members = []
if (memberRow?.household_id) {
  const { data } = await supabase
    .from('household_members')
    .select('user_id, role, display_name')
    .eq('household_id', memberRow.household_id)
  members = data ?? []
}
```

### Escritura (Server Actions)

**3 server actions — un action por tabla que se modifica:**

#### `updateProfile(formData)`
```
UPDATE profiles
SET display_name = $1, occupation = $2, updated_at = now()
WHERE id = $userId
```
> `avatar_url` se deja preparado en el type pero no se implementa la subida de imagen en esta fase. El botón "Cambiar foto" no hace nada funcional aún.

#### `updateSettings(formData)`
```
UPDATE user_settings
SET base_currency = $1,
    timezone = $2,
    working_days_per_week = $3,
    default_payment_source = $4,
    updated_at = now()
WHERE user_id = $userId
```

#### `updateHousehold(formData)`
```
UPDATE households
SET name = $1,
    shared_incomes = $2,
    shared_expenses = $3,
    proportional_split = $4,
    updated_at = now()
WHERE id = $householdId
```
> Validar que el usuario es `owner` del household antes de permitir cambios.
> Los miembros tipo `member` pueden ver la configuración pero no editarla.

---

## 📄 Types

```typescript
// src/modules/settings/types/index.ts

export interface SettingsProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  occupation: string | null
  is_admin: boolean
}

export interface SettingsPreferences {
  id: string
  user_id: string
  base_currency: string          // 'USD' | 'COP' | 'EUR' | 'MXN'
  timezone: string               // 'America/Bogota' | etc.
  working_days_per_week: number  // 4-7
  default_payment_source: string // 'cash_debit' | 'credit_card'
  default_liability_id: string | null
}

export interface SettingsHousehold {
  id: string
  name: string
  shared_incomes: boolean
  shared_expenses: boolean
  proportional_split: boolean
}

export interface HouseholdMember {
  user_id: string
  role: 'owner' | 'member'
  display_name: string
}

export interface SettingsPageData {
  profile: SettingsProfile
  preferences: SettingsPreferences
  household: SettingsHousehold | null
  members: HouseholdMember[]
  currentUserRole: 'owner' | 'member' | null  // null si no hay household
}

// Sección activa del detail view
export type SettingsSection =
  | 'profile'
  | 'preferences'
  | 'household'
  | 'subscription'
  | 'about'
  | null  // ninguna abierta = vista lista
```

---

## 🎨 Diseño visual — Referencia para cada componente

### Principios del Glass Dark Theme

El mockup `settings-mockup-v2.html` es la referencia visual exacta. Estos son los tokens del sistema actual que se deben usar (todos definidos en `globals.css`):

| Token | Uso |
|---|---|
| `var(--bg-base)` / `#070E0A` | Fondo de página |
| `var(--glass-bg)` / `rgba(255,255,255,0.055)` | Superficie de cards y section-cards |
| `var(--glass-bg-strong)` / `rgba(255,255,255,0.09)` | Hover en cards |
| `var(--glass-border)` / `rgba(255,255,255,0.10)` | Bordes de cards |
| `var(--glass-border-accent)` / `rgba(58,158,106,0.35)` | Borde del hero card |
| `var(--glass-blur)` / `blur(24px)` | Backdrop-filter estándar |
| `var(--glass-blur-heavy)` / `blur(40px)` | Backdrop-filter en hero y modales |
| `var(--text-primary)` / `#EEF5F0` | Texto principal |
| `var(--text-secondary)` / `rgba(238,245,240,0.55)` | Texto secundario |
| `var(--text-muted)` / `rgba(238,245,240,0.32)` | Micro-labels, hints |
| `var(--text-green)` / `#4DC98A` | Links, active states |
| `var(--text-gold)` / `#D4A93A` | Badges gold/premium |
| `var(--green-dim)` / `rgba(58,158,106,0.18)` | Fondos de iconos verdes |
| `var(--gold-dim)` / `rgba(198,155,48,0.15)` | Fondos de iconos gold |
| `var(--r-card)` / `16px` | Border-radius de cards |
| `var(--r-hero)` / `22px` | Border-radius del hero card |
| `var(--r-pill)` / `9999px` | Botones primarios, bottom nav |
| `var(--font-sans)` | Todo el texto UI |
| `var(--font-mono)` | Valores numéricos, micro-labels uppercase |

### Clases CSS reutilizables del sistema

Ya existen estas clases en `globals.css` — úsalas en vez de recrear estilos:

| Clase | Descripción |
|---|---|
| `.glass` | Card glass estándar (bg + blur + border + radius) |
| `.glass-strong` | Glass con mayor opacidad |
| `.glass-hero` | Hero card con gradiente verde y glow |
| `.fc-label-micro` | Label IBM Plex Mono 9px uppercase muted |
| `.fc-h1` | Heading 22px bold |
| `.fc-body` | Body 11px secondary |
| `.fc-input` | Input glass con focus verde |
| `.fc-btn-primary` | Botón principal gradiente verde con pill radius |
| `.fc-btn-ghost` | Botón texto verde sin fondo |
| `.fc-card` | Card con hover border-accent |
| `.badge-neutral` | Badge gris subtle |
| `.badge-gold` | Badge dorado |

### Componente por componente

#### 1. SettingsClient.tsx — Página principal

**Layout:**
```
<div className="settings-page"> ← usar patrón de mi-realidad-page / dashboard-page
  <PageHeader />
  <ProfileHero />    ← glass-hero card
  <Section "Preferencias">
    <Row: Preferencias de la app />
    <Row: Hogar />
  </Section>
  <Section "Suscripción">
    <Row: Plan actual />
    <Row: API Keys (disabled) />
  </Section>
  <Section "Cuenta">
    <Row: Cambiar PIN (disabled) />
    <Row: Exportar datos (disabled) />
    <Row: Acerca de />
  </Section>
</div>
```

**Clase de página:** Crear `.settings-page` en `globals.css` siguiendo el patrón exacto de `.mi-realidad-page`:
```css
.settings-page {
  width: 100%;
  max-width: 672px;
  margin-inline: auto;
  padding: 16px 16px calc(var(--fc-bottomnav-height) + 104px);
  position: relative;
}
```

Con los mismos breakpoints responsivos (430px, 480px, 768px, 1180px).

**Micro-label de sección:** Usar `fc-label-micro` para los títulos de grupo (PREFERENCIAS, SUSCRIPCIÓN, CUENTA).

**Section card:** Usar clase `glass` para agrupar rows.

**Row items:**
- Icono 34×34px con fondo `green-dim` o `gold-dim` según la sección, border-radius 10px
- Label: 14px font-weight 500 `text-primary`
- Detail: 11px `text-secondary`
- Value (opcional): IBM Plex Mono 12px `text-secondary`
- Chevron: `text-muted` 14px
- Separador entre rows: `border-top: 1px solid rgba(255,255,255,0.06)`
- Hover: `background: rgba(255,255,255,0.04)`
- Active: `background: rgba(255,255,255,0.07)`

**Items disabled (future):** opacity 0.4, cursor default, no hover effect.

**Profile hero card:**
- Usa `glass-hero` (gradiente verde + border accent + blur heavy)
- Avatar: 52×52px circle, gradiente `var(--accent) → #1F6B3E`, box-shadow verde
- Nombre: 16px semibold `text-primary`
- Ocupación: 11px `text-secondary`
- "Editar perfil →": 10px `text-green` font-weight 500

#### 2. Detail overlays (slide-in panels)

**Transición:** `transform: translateX(100%)` → `translateX(0)` con `transition: transform 0.28s cubic-bezier(0.25,0.1,0.25,1)`.

**Header del detail:**
- Sticky top con `background: rgba(7,14,10,0.85); backdrop-filter: blur(20px)`
- Botón "‹ Atrás" en `text-green`, 13px font-weight 500
- Título: 16px bold `text-primary`

**Formularios:**
- Labels: `fc-label-micro` (Mono 9px uppercase muted)
- Inputs: `fc-input` (glass bg + border sutil + focus verde)
- Selects: Mismo estilo que `fc-input` con flecha custom SVG
- Toggles: 44×26px, off=`rgba(255,255,255,0.12)`, on=`var(--accent)`, knob blanco con sombra
- Botón guardar: `fc-btn-primary` full width, margin-top 24px

#### 3. ProfileDetail.tsx
- Avatar grande: 80×80px con gradiente verde y shadow glow
- Botón "Cambiar foto": `fc-btn-ghost` centrado debajo del avatar (no funcional aún)
- Campos: Nombre, Ocupación
- Botón: "Guardar cambios"

#### 4. PreferencesDetail.tsx
- Campos select: Moneda, Zona horaria, Días laborales, Método de pago
- Opciones de moneda: USD, COP, EUR, MXN
- Opciones timezone: America/New_York, America/Bogota, America/Mexico_City, Europe/Madrid (expandir según necesidad)
- Días: 4, 5, 6, 7
- Método de pago: cash_debit → "Efectivo / Débito", credit_card → "Tarjeta de crédito"
- Botón: "Guardar cambios"

#### 5. HouseholdDetail.tsx
- Campo input: Nombre del hogar
- Miembros: Cards glass con avatar circle (owner=verde, member=gold), nombre, rol
- 3 toggles: shared_incomes, shared_expenses, proportional_split
- Si el usuario actual es `member` (no owner): todos los campos son **read-only** / toggles deshabilitados + mensaje "Solo el propietario puede modificar estas opciones"
- Botón: "Guardar cambios" (solo visible para owner)

#### 6. SubscriptionDetail.tsx (read-only)
- Tier card glass: "Tu plan actual" (micro-label) → "Free" (Mono 28px) → "Acceso completo a tus finanzas" (12px secondary)
- Lista de features incluidas (glass card con rows):
  - ✓ Mi Realidad
  - ✓ Dashboard Financiero
  - ✓ La Brújula
  - ✦ Ideas de Negocio + AI → badge "Pro" (opacity 0.4)
- Footer: "Los planes de pago estarán disponibles próximamente" (11px muted, centered)

#### 7. AboutDetail.tsx (read-only)
- Centered layout, padding-top 48px
- Emoji 🧭 (44px)
- "Fastlane Compass" (20px bold)
- "v0.1.0 · Beta privada" (Mono 12px muted)
- Descripción: "Desvincula tu dinero de tu tiempo." (12px secondary)
- Footer: "Hecho con 🤍 por Luis Carmona" (11px muted)

---

## 🧭 Integración en navegación

### BottomNav.tsx — Agregar 5to item

Agregar al array `navItems` **después de Ideas**:

```typescript
{
  label: 'Config',
  href: '/configuracion',
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
},
```

> **Nota:** Este item siempre es visible (no depende de `isAdmin`). A diferencia de Ideas, Configuración está disponible para todos los usuarios.

### Sidebar.tsx — Misma lógica

Agregar el mismo item al array `navItems` del Sidebar. Misma posición (último), siempre visible.

### LogoutButton

Actualmente el `LogoutButton` está en el BottomNav y Sidebar. Cuando Config esté implementado, evaluar si el logout se mueve a la sección "Cuenta" dentro de Settings (más natural). **Para esta fase: dejarlo donde está.**

---

## ⚠️ Notas para implementación

1. **userId:** Obtener del cookie `dev_access` usando el mismo patrón que `layout.tsx` — `cookies().get('dev_access')?.value`. Verificar contra `VALID_USER_IDS`.

2. **Supabase client:** Usar `createAdminClient()` para todas las queries (consistente con el resto de la app, bypasses RLS).

3. **Revalidación:** Después de cada update exitoso, llamar `revalidatePath('/configuracion')` para refrescar los datos del server component.

4. **Toast/feedback:** Usar el mismo patrón de feedback que el resto de la app. Si no existe un sistema de toasts, un cambio de estado temporal en el botón ("Guardado ✓" → vuelve a "Guardar cambios" después de 2s) es suficiente.

5. **Responsive:** El detalle overlay funciona en mobile como slide-in fullscreen. En desktop (md+), evaluar si se muestra como panel lateral o como modal centered — seguir el patrón que se use en el resto de la app para modales/sheets (`fc-modal-overlay` + `fc-modal-sheet`).

6. **Avatar upload:** El botón "Cambiar foto" se renderiza pero no tiene funcionalidad. La subida de archivos a Supabase Storage se implementará en una fase posterior. Por ahora, el avatar muestra las iniciales del `display_name`.

7. **Campos hidden del user_settings:** Estos campos existen en la tabla pero **no se exponen en la UI de Settings** porque se gestionan automáticamente por otros módulos:
   - `precio_hora_referencia` — calculado por M1
   - `anio_referencia` — calculado por M1
   - `hidden_category_ids` — gestionado desde M2 (Dashboard)
   - `default_liability_id` — gestionado desde M2 (Dashboard)
   - `ai_recommendation_expiry_hours` — gestionado por M4

---

## 📋 Checklist de implementación

```
[ ] 1. Crear types (src/modules/settings/types/index.ts)
[ ] 2. Crear server actions (src/modules/settings/actions/index.ts)
[ ] 3. Crear page.tsx (src/app/(protected)/configuracion/page.tsx)
[ ] 4. Crear SettingsClient.tsx (lista principal)
[ ] 5. Crear ProfileDetail.tsx
[ ] 6. Crear PreferencesDetail.tsx
[ ] 7. Crear HouseholdDetail.tsx
[ ] 8. Crear SubscriptionDetail.tsx
[ ] 9. Crear AboutDetail.tsx
[ ] 10. Agregar .settings-page a globals.css
[ ] 11. Agregar "Config" a BottomNav.tsx
[ ] 12. Agregar "Config" a Sidebar.tsx
[ ] 13. Verificar responsive (mobile 390px + desktop)
[ ] 14. Test: editar profile → guardar → reload → valores persisten
[ ] 15. Test: editar preferences → guardar → reload → valores persisten
[ ] 16. Test: editar household toggles → guardar → reload → valores persisten
[ ] 17. Test: usuario member ve household read-only
```
