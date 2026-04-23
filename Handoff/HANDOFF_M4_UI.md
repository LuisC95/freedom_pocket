# 🎨 HANDOFF · M4 UI — Fastlane Compass

> **Objetivo:** implementar las pantallas del embudo M4 (Ideas) consumiendo las 16 actions ya existentes + la capa AI del handoff hermano.
> **Alcance:** UI admin-only. Visible solo para users con `is_admin=true`.
> **Pre-requisito:** `HANDOFF_M4_AI_LAYER.md` implementado primero.

---

## ⚠️ Reglas no negociables

- **Sistema de diseño** ya definido en `CONTEXT.md` — respetarlo al 100%. Paleta, tipografía, patrones de página, hero cards, modales.
- **Mobile-first**: max-width `2xl`, padding `p-4 pb-8`, h1 de 22px.
- **Buscar y usar** los `.reference.html` o `.reference.tsx` de M4 en el repo antes de inventar layouts. CONTEXT.md dice UX ✅ — esos mockups existen.
- Toda data viene de las actions en `@/modules/ideas/actions/` — NO hacer queries directas a Supabase desde componentes.
- Errores de actions se renderizan con toasts o bloques inline según severidad.
- Solo mostrar el link del sidebar/bottom-nav a "Ideas" si `profile.is_admin === true`.

---

## 📁 Estructura propuesta

```
src/app/(protected)/ideas/
├── page.tsx                  ← landing: entry points + lista de ideas
├── new/page.tsx              ← chat activo (sesión en progreso)
└── [ideaId]/page.tsx         ← vista detalle de una idea

src/modules/ideas/components/
├── EntryPointSelector.tsx    ← los 3 cards (sin_idea / idea_vaga / idea_clara)
├── IdeaChat.tsx              ← chat con fases (observar/definir/idear/evaluar)
├── IdeasList.tsx             ← grid de ideas con su status + CENTS
├── IdeaCard.tsx              ← card individual
├── CENTSScorer.tsx           ← 5 sliders/inputs + total — anti-bias (AI collapsed)
├── DeepDivePlan.tsx          ← los 7 campos + ai_notes
├── PromoteToOperandoModal.tsx ← modal de confirmación + business_name
├── DiscardIdeaModal.tsx      ← motivo de descarte
└── PhaseIndicator.tsx        ← muestra la fase activa del chat
```

---

## 🧭 Flujo de usuario completo

```
1. Usuario entra a /ideas
   ↓
2a. Sin ideas → EntryPointSelector (3 cards)
2b. Con ideas → IdeasList + botón "+ nueva idea" arriba
   ↓ (user elige entry point)
3. POST → createSession(entry_point, raw_input?) → redirect /ideas/new
   ↓
4. Chat con AI por fases (sendMessage action). **Las fases del schema están en español (Design Thinking):**
   - `observar` (entender skills/problemas — solo si entry_point=`sin_idea`)
   - `definir` (delimitar el problema concreto — viene de observar o si entry_point=`idea_vaga`)
   - `idear` (proponer ideas concretas)
   - `evaluar` (puntuar CENTS, sugerencias AI colapsadas)
   ↓
5. Al final de `evaluar` → createIdeaFromSession → redirect /ideas/[id]
   ↓
6. En /ideas/[id] (fuera del chat): completar Deep Dive (7 campos vía formulario, no chat)
   ↓
6. En /ideas/[id]:
   - Ver CENTS scoreados, editar con updateCENTS
   - Botón "Comprometerme con esta idea" → commitIdea
   - Una vez committed: botón "Iniciar validación" → startValidando
   - Una vez validando: botón "Empezar a construir" → startConstruyendo
   - Una vez construyendo: botón "Ya está operando" → PromoteToOperandoModal
   - En cualquier momento: botón secundario "Descartar" → DiscardIdeaModal
```

---

## 📱 Pantallas · detalle

### `/ideas` — Landing

**Layout:**
- Hero card verde oscuro: título + subtítulo explicando el propósito del módulo
- Si hay ideas previas: mostrar listado (IdeasList) con filtros por status
- Siempre visible: botón CTA "Nueva idea" que despliega EntryPointSelector

**Data:** `listIdeas({ userId })` al cargar.

**EntryPointSelector — 3 cards:**

| Entry | Título | Descripción |
|---|---|---|
| `sin_idea` | "Todavía no tengo idea" | "Te hago preguntas para descubrir qué negocio encaja con vos." |
| `idea_vaga` | "Tengo algo en mente, pero vago" | "Te ayudo a refinarla antes de evaluarla." |
| `idea_clara` | "Ya sé qué quiero hacer" | "Vamos directo a evaluarla con CENTS." |

Click → form para `raw_input` (textarea, obligatorio si no es `sin_idea`) → `createSession()` → redirect a `/ideas/new?session=<id>`.

---

### `/ideas/new` — Chat activo

**Layout:**
- Header sticky arriba: PhaseIndicator con la fase actual (`observar` / `definir` / `idear` / `evaluar`)
- Scroll area: historial de mensajes de la fase activa (solo esa fase — ver decisión de costos)
- Input fijo abajo: textarea + botón enviar

**Data:**
- `getSession(sessionId, { includeMessages: true })` al cargar
- `sendMessage({ sessionId, content, phase })` al enviar

**Comportamiento:**
- Si `status === 'in_progress'` → chat activo
- Si `status === 'completed'` → redirect a `/ideas/[idea.id]`
- Si error `AI_NOT_AVAILABLE` → toast: *"AI no disponible para este usuario. Contactá al admin."* (no debería pasar en admin, solo defensa)
- Transición de fase: botones como "Estoy listo para definir el problema" (observar → definir), "Veamos las ideas" (definir → idear), "Evaluemos esta idea" (idear → evaluar) → updatea fase en state local, siguientes sendMessage van con phase nueva

**Nota sobre fases:** la lógica de "cuándo pasar de observar a definir" puede ser:
- Automática (el assistant sugiere y la UI dispara un botón "Siguiente fase")
- Manual (el user hace click en "ya está, pasemos a evaluar")

**Recomendación:** manual. Más claro para el user, menos complejidad de prompt.

---

### `/ideas/[ideaId]` — Vista detalle

**Layout:**
- Hero card: title + concept + status badge
- Sección CENTS: CENTSScorer (editable si status es `generated`/`committed`/`validando`/`construyendo`, read-only si `operando`/`discarded`)
- Sección Deep Dive: DeepDivePlan (7 inputs de texto + ai_notes opcional)
- Footer con botones según estado:

```
generated    → [Comprometerme]  [Descartar]
committed    → [Iniciar validación]  [Descartar]
validando    → [Empezar a construir]  [Descartar]
construyendo → [Ya está operando]  [Descartar]
operando     → (read-only) "Este negocio ya vive en tu Brújula 🎯"
discarded    → (read-only) "Descartada el X por: Y"
```

**Data:**
- `getIdea(ideaId, { includeDeepDive: true, includeSession: true })` al cargar
- `updateCENTS()`, `upsertDeepDiveField()` en edits inline con debounce
- `commitIdea()`, `startValidando()`, `startConstruyendo()`, `promoteToOperando()`, `discardIdea()` en clicks de botón

---

## 🎛️ Componentes clave · detalle

### CENTSScorer (anti-bias)

**Layout vertical, 5 bloques:**

```
[C] Control del negocio
¿Qué tanto control tenés sobre el negocio?
1 = dependés 100% de otros (plataformas, jefe)
10 = vos decidís todo (producto, precio, canal)

[slider 1-10 o botones numéricos]
Tu score: 7

▸ Ver qué opina la AI (colapsado por default)
```

- **El usuario puntúa primero.** Sugerencia AI va colapsada.
- Al expandir: muestra score sugerido + 1-2 frases de justificación generadas por AI.
- Las 5 columnas: control / entry / need / time / scale.
- Total calculado en vivo: "Tu score CENTS: 34/50".
- Save: `updateCENTS({ ideaId, scores })` con debounce 800ms.

**Copy de cada dimensión** — usar lenguaje plano (está en `constants.ts` del módulo, buscar `CENTS_COPY` o similar). Si no existe, crear en constants.ts con este formato:

```typescript
export const CENTS_COPY = {
  control: {
    letter: 'C', label: 'Control', question: '¿Qué tanto control tenés sobre el negocio?',
    anchor_low:  'Dependés 100% de otros (plataformas, jefe, proveedores únicos)',
    anchor_high: 'Vos decidís todo (producto, precio, canal, crecimiento)',
  },
  entry: {
    letter: 'E', label: 'Barrera de entrada', question: '¿Qué tan difícil es para alguien copiarte?',
    anchor_low:  'Cualquiera con internet lo replica en un fin de semana',
    anchor_high: 'Requiere años de experiencia, capital, o red de contactos',
  },
  need: {
    letter: 'N', label: 'Necesidad real', question: '¿Qué tan fuerte es el problema que resolvés?',
    anchor_low:  'Es un "estaría bueno", no una urgencia',
    anchor_high: 'La gente YA está pagando por resolver esto con parches',
  },
  time: {
    letter: 'T', label: 'Tiempo', question: '¿El negocio gana plata sin vos sentado?',
    anchor_low:  'Si dejás de trabajar un día, no entra nada (consultoría pura)',
    anchor_high: 'Genera ingresos mientras dormís (software, contenido, renta)',
  },
  scale: {
    letter: 'S', label: 'Escalabilidad', question: '¿Crece sin que suban los costos igual?',
    anchor_low:  'Por cada cliente nuevo sumás un costo similar (servicios 1-a-1)',
    anchor_high: 'Vender a 10k clientes cuesta casi lo mismo que a 100 (SaaS, infoproducto)',
  },
};
```

---

### DeepDivePlan (7 preguntas)

Una por una, con lenguaje plano (ver schema `idea_deep_dives` en CONTEXT.md para las preguntas exactas):

| Campo | Pregunta UX |
|---|---|
| `market_analysis` | ¿Cuánta gente tiene este problema? |
| `competition_analysis` | ¿Quién más intenta resolver esto hoy? |
| `revenue_model` | ¿Cómo vas a cobrar? |
| `required_resources` | ¿Qué necesitás para arrancar? |
| `time_to_first_revenue` | ¿En cuánto tiempo te imaginás el primer cliente pagando? |
| `first_steps` | ¿Cuáles son los próximos 3 pasos concretos? |
| `validation_metrics` | ¿Cómo vas a saber si esto funciona o no? |

- Cada campo es una `textarea` con `upsertDeepDiveField({ ideaId, field, value })` on blur.
- Indicador visual: `X/7 completos`.
- `ai_notes` es un campo separado opcional, colapsado, donde el AI va guardando contexto extra.

---

### PromoteToOperandoModal

**Al abrir:**
1. Input `business_name` (obligatorio, texto)
2. Preview: *"Esto creará un negocio en tu Brújula llamado '[name]'. Podés ajustar detalles después."*
3. Botón `[Promover]` → `promoteToOperando({ ideaId, userId, businessName })`

**Manejo de errores** (parsear `error` del ActionResult):

| Código error | UX mensaje |
|---|---|
| `INVALID_STATUS:<X>` | "Algo raro pasó con el estado. Recargá la página." |
| `INVALID_BUSINESS_NAME` | "Escribí un nombre para el negocio." |
| `MISSING_BUSINESS_MODEL` | "Antes de operar necesitás definir cómo vas a cobrar (SaaS, servicio, producto, contenido, renta). Volvé al chat para definirlo." |
| `MISSING_CENTS_SCORES:<lista>` | "Te falta puntuar: [traducir lista con CENTS_COPY.X.label, unidos por coma]. Volvé a la sección CENTS." |
| `MISSING_DEEP_DIVE` | "Todavía no arrancaste el plan de acción. Completá al menos los 7 puntos del Deep Dive." |
| `MISSING_DEEP_DIVE_FIELDS:<lista>` | "Te falta responder: [traducir cada field del deep dive con el texto amigable de la tabla de arriba]." |
| cualquier otro | Mostrar `error` tal cual en toast de error. |

**Helper de traducción de códigos** (crear en `src/modules/ideas/utils/error-copy.ts`):

```typescript
const CENTS_LABEL: Record<string, string> = {
  control: 'Control', entry: 'Barrera de entrada', need: 'Necesidad',
  time: 'Tiempo', scale: 'Escalabilidad',
};
const DD_LABEL: Record<string, string> = {
  market_analysis: 'Mercado',
  competition_analysis: 'Competencia',
  revenue_model: 'Cómo cobrar',
  required_resources: 'Recursos',
  time_to_first_revenue: 'Tiempo a primer ingreso',
  first_steps: 'Primeros pasos',
  validation_metrics: 'Métricas de validación',
};

export function translatePromoteError(errorCode: string): string {
  if (errorCode.startsWith('MISSING_CENTS_SCORES:')) {
    const list = errorCode.split(':')[1].split(',').map(k => CENTS_LABEL[k] ?? k).join(', ');
    return `Te falta puntuar: ${list}. Volvé a la sección CENTS.`;
  }
  if (errorCode.startsWith('MISSING_DEEP_DIVE_FIELDS:')) {
    const list = errorCode.split(':')[1].split(',').map(k => DD_LABEL[k] ?? k).join(', ');
    return `Te falta responder: ${list}.`;
  }
  // ... etc para el resto
  return 'Algo salió mal. Intentá de nuevo.';
}
```

---

### DiscardIdeaModal

Input textarea para `discard_reason` (opcional pero recomendado). Botón confirma → `discardIdea({ ideaId, reason? })`. Después redirect a `/ideas`.

---

### PhaseIndicator

Breadcrumb horizontal en el chat:

```
● Observar → ○ Definir → ○ Idear → ○ Evaluar
```

- El círculo lleno indica la fase activa.
- Las previas quedan en gris claro (completadas).
- Las futuras en gris oscuro (no accesibles).

---

## 🔒 Protección admin-only

En el layout del grupo `(protected)/` (o en `ideas/page.tsx` directo):

```typescript
// Al cargar, consultar is_admin
const { data: profile } = await createAdminClient()
  .from('profiles').select('is_admin').eq('id', userId).single();

if (!profile?.is_admin) {
  redirect('/dashboard');
}
```

**Y en sidebar/bottom nav:** esconder el link "Ideas" si no es admin.

---

## ✅ Criterios de done

1. Tu user (admin) puede crear sesión, chatear con AI, generar idea, puntuar CENTS, completar deep dive, promover a operando, ver el negocio en `/brujula`.
2. Pareja (también admin) puede hacer el mismo flujo en paralelo sin interferencias.
3. User no-admin que navega a `/ideas` es redirigido a `/dashboard`.
4. User no-admin no ve el link "Ideas" en navegación.
5. Promover sin CENTS completos → mensaje traducido amigable (no código técnico).
6. `npm run build` pasa.
7. Chat responde en <5 segundos con texto coherente.
8. `ai_usage_logs` crece con cada mensaje.

---

## 📝 Notas finales

- **Referencias visuales:** CONTEXT.md dice UX ✅ — buscar archivos `.reference.html` o `.reference.tsx` en `src/modules/ideas/` o `references/`. Si no existen, seguir el sistema de diseño de CONTEXT.md.
- **Copy en español, tono cercano.** Evitar vocabulario del framework CENTS — los nombres de dimensiones son "Control", "Barrera", "Necesidad", "Tiempo", "Escalabilidad" (no "C/E/N/T/S" sueltos, aunque se pueden mostrar como letras grandes decorativas).
- **Si el chat no responde:** primero chequear `ANTHROPIC_API_KEY` en env, después logs de `ai_usage_logs`, después consola del navegador.
- **No implementar hoy:** motor AI, recomendaciones automáticas, gráficos de progreso en el módulo. Todo eso es post-jueves.
