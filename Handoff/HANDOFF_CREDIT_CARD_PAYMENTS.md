# 💳 HANDOFF · Gastos con Tarjeta de Crédito desde el Dashboard

> Feature: permitir registrar gastos realizados con tarjeta de crédito desde el modal "Nueva transacción" del Dashboard (M2).
> Las tarjetas de crédito se registran en Mi Brújula (M3) como `liabilities` — esta feature solo conecta los gastos del dashboard con esas tarjetas.

---

## 📌 Estado de la base de datos

**Todo el schema ya está aplicado.** No hay migraciones pendientes. Solo hay que implementar frontend + modificar actions existentes.

### Migraciones ya aplicadas (24-abr-2026)

| Migración | Qué hizo |
|---|---|
| `add_payment_source_to_transactions` | Agregó `payment_source` + `liability_id` a `transactions` con constraint de integridad |
| `trigger_update_credit_card_balance` | Trigger automático que suma/resta `liabilities.current_balance` al INSERT/UPDATE/DELETE gastos con tarjeta |
| `add_default_payment_to_user_settings` | Agregó `default_payment_source` + `default_liability_id` a `user_settings` |
| `trigger_reset_default_payment_on_liability_delete` | Si se borra una tarjeta que era default, revierte a `cash_debit` automáticamente |

### Columnas nuevas en `transactions`

| Columna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `payment_source` | text | NO | `'cash_debit'` | CHECK: `'cash_debit'` o `'credit_card'` |
| `liability_id` | uuid FK → liabilities | YES | null | Solo se llena cuando `payment_source = 'credit_card'` |

**Constraint `credit_card_requires_liability`:**
- Si `payment_source = 'credit_card'` → `liability_id` NOT NULL (obligatorio)
- Si `payment_source = 'cash_debit'` → `liability_id` IS NULL (prohibido)

### Columnas nuevas en `user_settings`

| Columna | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `default_payment_source` | text | NO | `'cash_debit'` | CHECK: `'cash_debit'` o `'credit_card'` |
| `default_liability_id` | uuid FK → liabilities | YES | null | Misma regla de integridad que en transactions |

### Trigger `update_credit_card_balance` (ya activo)

El balance de la tarjeta se actualiza automáticamente. **El código NO necesita hacer UPDATE a `liabilities.current_balance` manualmente.** El trigger cubre:

- **INSERT** gasto con tarjeta → suma al balance
- **DELETE** gasto con tarjeta → resta del balance
- **UPDATE** cambio de método, tarjeta o monto → resta del viejo, suma al nuevo

### Trigger `reset_default_payment_on_liability_delete` (ya activo)

Si el usuario borra una tarjeta que era su default, `user_settings` se revierte a `cash_debit` automáticamente.

---

## 🎯 Decisiones de diseño (no re-discutir)

| # | Decisión |
|---|---|
| 1 | **"Efectivo/Débito" es un catch-all** — no se registran tarjetas de débito individualmente |
| 2 | **El balance de la tarjeta se actualiza automáticamente** vía trigger en DB — el código nunca hace UPDATE a `liabilities.current_balance` |
| 3 | **Tarjetas visibles en el modal:** las del usuario + las compartidas (`is_shared = true`) del household |
| 4 | **Default de pago:** se guarda en `user_settings` y se configura desde el modal con checkbox "Recordar como default" |
| 5 | **UX tipo selector/dropdown** — no switch ni radio buttons |
| 6 | **Tarjetas compartidas muestran quién la registró** (ej: "de Andreina") |

---

## 🖥️ Cambios en tipos TypeScript

### Actualizar `src/modules/dashboard/types/index.ts`

Agregar a los tipos existentes de Transaction:

```typescript
// Agregar a TransactionRow o el tipo equivalente que ya exista:
type PaymentSource = 'cash_debit' | 'credit_card';

// En el row type de Transaction:
payment_source: PaymentSource;  // default 'cash_debit'
liability_id: string | null;    // UUID de la tarjeta, null si cash_debit

// Input type para crear transacción — agregar estos campos:
// En CreateTransactionInput o AddTransactionPayload (verificar nombre real):
payment_source?: PaymentSource;  // opcional, default 'cash_debit'
liability_id?: string;           // requerido solo si payment_source = 'credit_card'
```

### Tipo para las tarjetas disponibles en el selector

```typescript
// Tipo para el dropdown de método de pago
interface CreditCardOption {
  id: string;              // liability.id
  name: string;            // liability.name (ej: "Capital One")
  current_balance: number; // balance actual
  is_shared: boolean;      // si es compartida con household
  owner_name?: string;     // nombre del dueño (solo si is_shared y no es el usuario actual)
}
```

### Actualizar `user_settings` types

```typescript
// Agregar al tipo de UserSettings:
default_payment_source: PaymentSource;  // default 'cash_debit'
default_liability_id: string | null;    // UUID de la tarjeta default
```

---

## 🔧 Cambios en server actions

### 1. Nueva action: `getCreditCardOptions()`

```typescript
// src/modules/dashboard/actions/payment.ts (archivo nuevo)

/**
 * Devuelve las tarjetas de crédito disponibles para el selector de método de pago.
 * Incluye: tarjetas propias + tarjetas compartidas del household.
 */
export async function getCreditCardOptions(): Promise<ActionResult<CreditCardOption[]>> {
  const supabase = createAdminClient();

  // 1. Obtener household_id del usuario (si tiene)
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', DEV_USER_ID)
    .maybeSingle();

  // 2. Query: mis tarjetas + compartidas del household
  let query = supabase
    .from('liabilities')
    .select('id, name, current_balance, is_shared, user_id')
    .eq('liability_type', 'credit_card')
    .eq('is_active', true);

  if (membership?.household_id) {
    // Mis tarjetas OR compartidas del mismo household
    query = query.or(
      `user_id.eq.${DEV_USER_ID},and(household_id.eq.${membership.household_id},is_shared.eq.true)`
    );
  } else {
    // Solo mis tarjetas
    query = query.eq('user_id', DEV_USER_ID);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  // 3. Si hay tarjetas compartidas de otro usuario, obtener su nombre
  const otherUserIds = (data ?? [])
    .filter(l => l.user_id !== DEV_USER_ID && l.is_shared)
    .map(l => l.user_id);

  let ownerNames: Record<string, string> = {};
  if (otherUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', otherUserIds);
    
    ownerNames = (profiles ?? []).reduce((acc, p) => {
      acc[p.id] = p.display_name || 'Miembro';
      return acc;
    }, {} as Record<string, string>);
  }

  // 4. Mapear a CreditCardOption
  const options: CreditCardOption[] = (data ?? []).map(l => ({
    id: l.id,
    name: l.name,
    current_balance: Number(l.current_balance),
    is_shared: l.is_shared,
    owner_name: l.user_id !== DEV_USER_ID ? ownerNames[l.user_id] : undefined,
  }));

  return { ok: true, data: options };
}
```

### 2. Nueva action: `updateDefaultPayment()`

```typescript
/**
 * Guarda o quita el método de pago default del usuario.
 */
export async function updateDefaultPayment(
  payment_source: PaymentSource,
  liability_id?: string
): Promise<ActionResult<void>> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_settings')
    .update({
      default_payment_source: payment_source,
      default_liability_id: payment_source === 'credit_card' ? liability_id : null,
    })
    .eq('user_id', DEV_USER_ID);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}
```

### 3. Modificar action existente: `addTransaction()` (o como se llame)

Buscar la action que crea transacciones y agregar:

```typescript
// ANTES del insert, agregar estos campos al payload:
payment_source: input.payment_source ?? 'cash_debit',
liability_id: input.payment_source === 'credit_card' ? input.liability_id : null,

// ⚠️ NO hacer UPDATE a liabilities.current_balance — el trigger lo hace solo.
```

### 4. Modificar action existente: `deleteTransaction()` (o como se llame)

**No requiere cambios.** El trigger `update_credit_card_balance` maneja la resta del balance automáticamente cuando se borra una transacción.

### 5. Modificar action existente: `editTransaction()` (si existe)

**No requiere cambios** en la lógica de balance. Solo asegurar que `payment_source` y `liability_id` se incluyan en el UPDATE si el usuario cambia el método de pago. El trigger maneja todo.

### 6. Modificar `getDashboardData()` (o equivalente)

Agregar al fetch inicial del dashboard:

```typescript
// Agregar estos datos al return del dashboard:
credit_card_options: await getCreditCardOptions(),  // para el selector
user_settings: { default_payment_source, default_liability_id },  // para el default
```

---

## 🎨 Cambios en componentes

### Modificar `AddTransactionModal.tsx`

#### Datos que necesita recibir (via props o fetch):

```typescript
interface AddTransactionModalProps {
  // ... props existentes ...
  creditCardOptions: CreditCardOption[];  // NUEVO
  defaultPaymentSource: PaymentSource;     // NUEVO
  defaultLiabilityId: string | null;       // NUEVO
}
```

#### Estado local nuevo:

```typescript
const [paymentSource, setPaymentSource] = useState<PaymentSource>(defaultPaymentSource);
const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(defaultLiabilityId);
const [selectorExpanded, setSelectorExpanded] = useState(false);
const [rememberAsDefault, setRememberAsDefault] = useState(false);
```

#### Lógica del selector:

```
ESTADO COLAPSADO (default):
- Si paymentSource = 'cash_debit':
    Mostrar: ícono billete + "Efectivo / Débito" + chevron ▼
- Si paymentSource = 'credit_card' (tiene default):
    Mostrar: ícono tarjeta + nombre tarjeta + badge "default" + balance + chevron ▼
    Mostrar debajo: "Después de este gasto: $XXX" (balance + monto del input)

TAP en el selector → setSelectorExpanded(true)

ESTADO EXPANDIDO:
- Header: "Selecciona un método" + chevron ▲
- Opción: "Efectivo / Débito" (sin balance)
- Opción por cada CreditCardOption:
    - Nombre + balance en rojo
    - Si is_shared: badge "de {owner_name}"
    - Seleccionada: borde izquierdo rojo + fondo sutil rojo
- Checkbox: "Recordar como default"

TAP en una opción → seleccionar + colapsar

AL GUARDAR TRANSACCIÓN:
- Si rememberAsDefault = true → llamar updateDefaultPayment()
```

#### Posición en el modal:

La sección "Método de pago" va **entre Categoría y Fecha** en el orden del formulario.

#### Solo visible para gastos:

El selector de método de pago **solo aparece cuando type = 'expense'**. Los ingresos extra no se pagan con tarjeta de crédito.

---

## 🎨 Diseño visual (referencia exacta)

### Paleta del modal (ya existente)
```
Fondo modal:     #1A2520
Fondo campos:    #141F19
Borde sutil:     #2a3a33
Texto principal: #F2F7F4
Texto secundario:#7A9A8A
Acento verde:    #2E7D52
Alerta rojo:     #E84434
```

### Selector colapsado — Efectivo/Débito
```
┌─────────────────────────────────────────────┐
│  [ícono tarjeta gris]  Efectivo / Débito  ▼ │
└─────────────────────────────────────────────┘
bg: #141F19, border-radius: 8px, padding: 12px
ícono: SVG lineal 20x20 gris (#7A9A8A)
texto: 13px #F2F7F4 font-weight 500
chevron: SVG 16x16 gris
```

### Selector colapsado — Con tarjeta default
```
┌─────────────────────────────────────────────┐
│  [ícono tarjeta rojo]  Capital One ·default·│
│                                    $523.31 ▼│
├─────────────────────────────────────────────┤
│  Después de este gasto          $617.31     │
└─────────────────────────────────────────────┘
ícono: SVG lineal 20x20 rojo (#E84434)
nombre: 13px #F2F7F4 font-weight 500
badge "default": 9px #2E7D52, bg: #2E7D5220, border-radius: 3px, padding: 1px 5px
balance: 12px #E84434 IBM Plex Mono
"Después de este gasto": 11px #7A9A8A
balance proyectado: 13px #E84434 IBM Plex Mono font-weight 500
```

### Selector expandido
```
┌─────────────────────────────────────────────┐
│  Selecciona un método                     ▲ │
├─────────────────────────────────────────────┤
│  [ícono gris]  Efectivo / Débito            │
├─────────────────────────────────────────────┤
│▌ [ícono rojo]  Capital One         $523.31  │  ← seleccionada (borde izq rojo + bg sutil)
├─────────────────────────────────────────────┤
│  [ícono gris]  Visa Platinum ·de Andreina·  │
│                                   $1,240.00 │
├─────────────────────────────────────────────┤
│  ☐ Recordar como default                    │
└─────────────────────────────────────────────┘
Header: 12px #7A9A8A
Opción seleccionada: border-left 3px solid #E84434, bg: #E8443410
Opción no seleccionada: sin borde izquierdo
Badge "de Andreina": 9px #5a7a6a, bg: #2a3a33, border-radius: 3px
Checkbox: 16x16, borde #3a4a43, check verde #2E7D52
Texto checkbox: 11px #7A9A8A
```

---

## ⚠️ Reglas críticas

1. **NUNCA hacer UPDATE manual a `liabilities.current_balance`** — el trigger `update_credit_card_balance` lo hace automáticamente en INSERT/UPDATE/DELETE de transactions.

2. **El constraint `credit_card_requires_liability`** rechazará el INSERT si envías `payment_source = 'credit_card'` sin `liability_id`, o `payment_source = 'cash_debit'` con un `liability_id`. El código debe setear ambos campos correctamente.

3. **Regenerar types:** después de cualquier cambio, ejecutar `generate_typescript_types` vía Supabase MCP para actualizar `src/types/database.types.ts`.

4. **`ON DELETE SET NULL`** en `transactions.liability_id`: si se borra una tarjeta, los gastos que se hicieron con ella quedan con `liability_id = null` pero `payment_source = 'credit_card'`. El trigger `reset_default_payment_on_liability_delete` se encarga de revertir el default en `user_settings`, pero hay un edge case en `transactions` — el constraint `credit_card_requires_liability` va a rechazar la operación. **Verificar si `ON DELETE SET NULL` ejecuta antes o después del CHECK.** Si falla, cambiar a un trigger BEFORE DELETE en `liabilities` que haga UPDATE `payment_source = 'cash_debit'` en las transactions afectadas.

5. **El selector de método de pago solo aparece para gastos** (`type = 'expense'`), nunca para ingresos extra.

---

## 🧪 Casos de prueba

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | Registrar gasto sin tocar método de pago | `payment_source = 'cash_debit'`, `liability_id = null`, balance de tarjetas no cambia |
| 2 | Registrar gasto de $50 con Capital One | `payment_source = 'credit_card'`, `liability_id = UUID Capital One`, balance sube $50 |
| 3 | Borrar un gasto que fue con tarjeta | Balance de la tarjeta baja por el monto borrado |
| 4 | Editar gasto: cambiar de efectivo a tarjeta | Balance de la tarjeta sube |
| 5 | Editar gasto: cambiar de tarjeta a efectivo | Balance de la tarjeta baja |
| 6 | Editar gasto: cambiar de tarjeta A a tarjeta B | Balance A baja, balance B sube |
| 7 | Marcar "Recordar como default" con Capital One | `user_settings` actualiza `default_payment_source = 'credit_card'` + `default_liability_id` |
| 8 | Abrir modal con default de tarjeta guardado | Modal abre con Capital One pre-seleccionada |
| 9 | Borrar tarjeta que era default | `user_settings` revierte a `cash_debit` (trigger automático) |
| 10 | Usuario sin tarjetas registradas | Selector muestra solo "Efectivo / Débito" sin chevron (no hay nada que expandir) |
| 11 | Tarjeta compartida de Andreina | Aparece en el selector con badge "de Andreina" |

---

## 🔮 Pendiente para sesión futura (NO implementar ahora)

**Pago A la tarjeta (reducir balance):** flujo para registrar cuando el usuario paga su deuda de tarjeta al banco. Esto NO es un gasto — es una transferencia de efectivo a deuda. Requiere diseño de UX y probablemente un nuevo `transaction_type` o un flujo separado. No afecta nada de lo diseñado aquí.

---

**Final del handoff.**