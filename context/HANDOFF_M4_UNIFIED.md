# HANDOFF UNIFICADO — M4 Ideas
> Documento único con todo lo necesario para implementar M4 Ideas funcionalmente.
> Para Claude Code. Leer completo antes de tocar código.
> Diseñado: 26-abr-2026.

---

## TABLA DE CONTENIDOS

1. [Visión general](#1-visión-general)
2. [Arquitectura de pantallas](#2-arquitectura-de-pantallas)
3. [Pantalla 1 — Lista de Ideas (tablero)](#3-pantalla-1--lista-de-ideas-tablero)
4. [Pantalla 2 — Resumen de Idea (entrada)](#4-pantalla-2--resumen-de-idea-entrada)
5. [Pantalla 3 — Chat con el Coach](#5-pantalla-3--chat-con-el-coach)
6. [Transición entre fases](#6-transición-entre-fases)
7. [Motor AI — el cerebro del coach](#7-motor-ai--el-cerebro-del-coach)
8. [Sistema de Diseño](#8-sistema-de-diseño)
9. [Archivos a crear o modificar](#9-archivos-a-crear-o-modificar)
10. [Verificaciones previas en DB](#10-verificaciones-previas-en-db)
11. [Criterios de done](#11-criterios-de-done)

---

## 1. VISIÓN GENERAL

M4 es un embudo de ideas de negocio guiado por un coach AI. La experiencia tiene 3 capas:

| Capa | Pantalla | Filosofía |
|---|---|---|
| **Tablero** | Lista de ideas con momentum visible | "¿En qué estoy trabajando?" |
| **Resumen** | Estado de una idea + última pregunta del coach | "¿Dónde quedé?" |
| **Chat** | Conversación guiada por fases con preguntas accionables | "¿Qué hago ahora?" |

Las 4 fases del embudo (alineadas con metodología GROW + socrática):

```
OBSERVAR → DEFINIR → IDEAR → EVALUAR
explorar    delimitar  generar   puntuar
```

Cada fase tiene un límite de mensajes para forzar conclusiones accionables.

---

## 2. ARQUITECTURA DE PANTALLAS

```
/ideas
├── page.tsx                    → Lista (tablero)
└── [ideaId]
    ├── page.tsx                → Resumen de la idea
    └── chat/
        └── page.tsx            → Chat activo
```

### Flujo del usuario

```
Lista
  ↓ (toca card)
Decisión por status:
  ├─ status = "generated" → entra directo al chat (fase observar)
  ├─ status = "committed", "validando", "construyendo" → ve resumen primero
  └─ status = "operando" o "discarded" → ve resumen sin botón de continuar
```

---

## 3. PANTALLA 1 — LISTA DE IDEAS (TABLERO)

### 3.1 Layout

3 zonas verticales:

| Zona | Contenido | Cuándo se muestra |
|---|---|---|
| **EN MARCHA** | Ideas con status: `committed`, `validando`, `construyendo`, `operando` | Siempre que existan |
| **POR EVALUAR** | Ideas con status: `generated` | Siempre que existan |
| **DESCARTADAS** | Ideas con status: `discarded` | Solo en filtro "Todas" o "Descartadas" |

### 3.2 Header (siempre visible)

```
┌────────────────────────────────────────┐
│ Ideas                       [+ Nueva]  │
│ 2 en marcha · 2 por evaluar           │
│                                        │
│ [En marcha] [Por evaluar] [Todas] [...]│
└────────────────────────────────────────┘
```

- `h1` "Ideas" — 22px IBM Plex Sans 700, color `#141F19`
- Subtítulo dinámico: `{n activas} en marcha · {n nuevas} por evaluar`
- Botón "+ Nueva" → abre `NewIdeaSheet`
- Tabs filtro: `En marcha` | `Por evaluar` | `Todas` | `Descartadas`

### 3.3 IdeaCard

Versión **completa** (zona EN MARCHA):

```
[barra color top de 3px - color del estado]
Título de la idea         [BADGE ESTADO]
Concepto en 12px gris (max 2 líneas)

[score CENTS] [modelo] [⚠ momentum si > 7d]

┌─────────────────────────────────────┐
│ Próximo paso: Hablar con 3 dueños   │ ← bg #F2F7F4
└─────────────────────────────────────┘
```

Versión **compacta** (zona POR EVALUAR):
- Sin concepto
- Sin bloque de próximo paso
- Padding más chico (12px 14px vs 16px 18px)

### 3.4 Comportamiento de cards

| Elemento | Lógica |
|---|---|
| Barra color top | Color del estado actual |
| Badge estado | Ver tabla de colores en sección 8 |
| ScoreBadge | `null → —/50`, `0-24 → rojo`, `25-34 → dorado`, `35-50 → verde` |
| ActivityDot | Oculto si ≤3 días, dorado 4-14d, rojo >14d |
| Hover | border verde + sombra + translateY(-1px) |
| Click | Abre pantalla de Resumen o Chat según status |

### 3.5 NewIdeaSheet (bottom sheet)

3 entry points seleccionables:

```
🧭 No sé por dónde empezar
   La AI te ayuda a encontrar ideas basadas en tus habilidades

💡 Tengo algo en mente pero vago
   Refinamos juntos hasta que tenga forma

🎯 Tengo una idea clara
   Evaluamos directamente con el método CENTS
```

Cada opción al ser elegida + botón "Empezar →" crea una sesión nueva con la fase apropiada:

| Entry | Fase inicial | Crea idea? |
|---|---|---|
| `sin_idea` | `observar` | No, solo sesión |
| `idea_vaga` | `observar` | No, solo sesión |
| `idea_clara` | `evaluar` | Sí, idea + sesión juntas |

---

## 4. PANTALLA 2 — RESUMEN DE IDEA (ENTRADA)

### 4.1 Cuándo se muestra

Para ideas con status `committed`, `validando`, `construyendo`, `operando`.
Las `generated` saltan directo al chat.

### 4.2 Estructura

```
┌─ Header oscuro #1A2520 ─────────────┐
│ TU IDEA                             │
│ App de turnos para barberías        │
│                                     │
│ [O✓] ─── [D●] ─── [I○] ─── [E○]    │ ← mini phase bar
└─────────────────────────────────────┘

┌─ Última pregunta del coach ─────────┐
│ 🧭 Última pregunta del coach        │
│ "¿Cuántas barberías pagarían esta   │
│ semana, no algún día?"              │ ← itálica
└─────────────────────────────────────┘

┌─ Estado de evaluación ──────────────┐
│ ✓ Observar    (tachado)             │
│ ● Definir     [SIGUIENTE]           │
│ ○ Idear                             │
│ ○ Evaluar                           │
└─────────────────────────────────────┘

┌─ 🕐 Última sesión hace 2 días ──────┐
│ Identificaste oportunidad en        │
│ barberías sin sistema digital       │
└─────────────────────────────────────┘

[Continuar → Definir]
```

### 4.3 Datos que necesita

```typescript
// En el page.tsx server component
const idea = await getIdea(ideaId, userId);
const lastSession = await supabase
  .from('idea_sessions')
  .select('phase, phase_summary, completed_at')
  .eq('idea_id', ideaId)
  .eq('status', 'completed')
  .order('completed_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const lastQuestion = await supabase
  .from('idea_session_messages')
  .select('content, created_at')
  .eq('session_id', lastSession?.id)
  .eq('role', 'assistant')
  .order('sequence_order', { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## 5. PANTALLA 3 — CHAT CON EL COACH

### 5.1 Layout vertical

```
┌─ HEADER OSCURO ─────────────────┐
│ ← App de turnos para... [3 msj] │  ← botón atrás + título + contador
│ • Definir — Delimitamos prob.   │  ← fase actual + descripción
│ ─────────────────────────────── │
│ [O✓]──[D●]──[I○]──[E○]          │  ← phase bar siempre visible
└─────────────────────────────────┘
                                  
┌─ CHAT SCROLLABLE ───────────────┐
│      [DEFINIR · descripción]    │  ← chip de fase actual
│                                 │
│ 🧭 Mensaje del coach            │  ← burbuja izq, blanco
│                                 │
│ Mi respuesta 👤                 │  ← burbuja der, gradiente verde
│                                 │
│ 🧭 [3 dots] Construyendo...     │  ← typing con texto contextual
└─────────────────────────────────┘

┌─ ⚡ Quedan 2 mensajes... ────────┐  ← warning si remaining ≤ 2
└─────────────────────────────────┘

┌─ Sugerencias chips ─────────────┐  ← solo si no se está typeando
│ [Contame más] [No sé...] [...]  │
└─────────────────────────────────┘

┌─ INPUT ─────────────────────────┐
│ [textarea............] [↑ send] │  ← borde verde al escribir
└─────────────────────────────────┘
```

### 5.2 Identidad visual del coach

- **Avatar**: círculo 30px con gradiente `linear-gradient(135deg, #2E7D52, #1A2520)` + borde `#3A9E6A33`
- **Emoji**: 🧭 dentro del avatar
- **Burbuja**: blanco, borde `#EAF0EC`, radius `4px 18px 18px 18px` (sin esquina sup-izq)
- **Burbuja del usuario**: gradiente `linear-gradient(135deg, #2E7D52, #1A5C3A)`, blanco, radius `18px 18px 4px 18px`

### 5.3 Indicador "pensando"

Durante el typing, además de los 3 dots animados, un texto contextual al lado:

```typescript
const COACH_THINKING = [
  "Analizando tu contexto...",
  "Procesando lo que dijiste...",
  "Construyendo la siguiente pregunta...",
  "Conectando puntos...",
];
// Elegir uno random al iniciar typing
```

### 5.4 Sugerencias (chips)

Cuando el coach termina de responder, aparecen 3 chips arriba del input para reducir bloqueos:

```typescript
const SUGGESTIONS: Record<string, string[]> = {
  observar: ["Contame más sobre ese sector", "¿Qué habilidades tengo?", "No sé por dónde empezar"],
  definir:  ["El problema principal es...", "Los más afectados son...", "Todavía no lo tengo claro"],
  idear:    ["Me resuena la primera", "¿Podés darme más opciones?", "Quiero combinar ideas"],
  evaluar:  ["¿Cómo arranco esta semana?", "Necesito más tiempo para pensarlo", "Estoy listo para puntuar"],
};
```

**Comportamiento:** chips visibles cuando `!isTyping && showSuggestions`. Tocar chip rellena el input (no envía automáticamente). Al enviar mensaje, `setShowSuggestions(false)`. Al recibir respuesta del coach, `setShowSuggestions(true)`.

### 5.5 Contador de mensajes

Top-right del header, formato compacto:

```
┌──────┐
│  4   │  ← número grande, monospace
│ MSJ  │  ← label pequeño uppercase
└──────┘
```

- Verde/blanco normal
- Rojo (`#E84434`) cuando `remaining ≤ 2`
- Pulse en rojo cuando `remaining = 1`

### 5.6 Warning previo al límite

Aparece entre chat e input cuando `remaining ≤ 2 && remaining > 0`:

```
⚡ Quedan 2 mensajes — el coach va a cerrar esta fase con una conclusión
```

Background dorado, texto `#C69B30`, borde top.

---

## 6. TRANSICIÓN ENTRE FASES

### 6.1 Cuándo se dispara

Cuando se cumple cualquiera de:
1. El usuario alcanza `phaseLimit` (ver sección 7.4)
2. El usuario tocó "Cerrar fase" manualmente (botón en menú)
3. La AI propone cerrar y el usuario confirma

### 6.2 Pantalla overlay

Full screen sobre fondo `#0D1A14` con:

- 6 partículas flotantes del color de la fase saliente (animación `float`)
- Círculo grande con `✓` y glow del color de la fase
- Label "Fase completada" en color de fase
- Título "{Fase} completado" 26px blanco
- Card con `summary.insight` (lo descubierto)
- Mini barra de progreso CENTS animada (crece de 0 a `centsProgress%`)
- Score numérico `X/50` en monospace
- Card con `summary.next` (próximo objetivo) en color de fase saliente
- Botón "Continuar a {siguiente fase} →" gradiente verde

### 6.3 Lógica al continuar

```typescript
const handleContinue = async () => {
  // 1. Cerrar sesión actual
  await completeSession(currentSessionId);

  // 2. Crear nueva sesión en fase siguiente
  const nextPhase = NEXT_PHASE[currentPhase];
  const newSession = await createSession({
    ideaId,
    phase: nextPhase,
  });

  // 3. Actualizar UI
  setCurrentPhase(nextPhase);
  setMessages([initialMessageForPhase(nextPhase)]);
  setMsgCount(0);
  setShowTransition(false);
};

const NEXT_PHASE = {
  observar: 'definir',
  definir:  'idear',
  idear:    'evaluar',
  evaluar:  null, // termina el embudo
};
```

---

## 7. MOTOR AI — EL CEREBRO DEL COACH

### 7.1 Pipeline completo de un mensaje

Cuando el usuario envía un mensaje en el chat:

```
1. UI: setIsTyping(true) + thinking text random
   ↓
2. Action: sendMessage(sessionId, content, userId)
   ↓
3. AI Layer (ya existe):
   ├─ resolveAIProvider(userId) → admin? early adopter? sino: error
   ├─ verificar phase limit
   └─ buildUserContext(userId) → bloque con datos financieros + tags
   ↓
4. Construir prompt:
   systemPrompt = `${userContext}\n\n${PHASE_PROMPTS[phase]}`
   messages    = solo mensajes de la fase activa
   ↓
5. Provider.chat() → Anthropic
   ↓
6. Guardar respuesta en idea_session_messages
   ↓
7. UPSERT en ai_usage_logs
   ↓
8. UI: agregar mensaje + setIsTyping(false) + setShowSuggestions(true)
```

### 7.2 Contexto del usuario (`buildUserContext`)

```typescript
// src/modules/ideas/ai/context.ts (ya documentado en handoff anterior)
export async function buildUserContext(userId: string): Promise<string> {
  const supabase = createAdminClient();

  // Datos M1 — verificar nombres reales de tablas
  const { data: reality } = await supabase
    .from('financial_reality')  // ← VERIFICAR nombre real
    .select('hourly_rate, monthly_income, monthly_expenses, freedom_target_days')
    .eq('user_id', userId)
    .maybeSingle();

  // Datos M2 — verificar nombres reales
  const { data: dashboard } = await supabase
    .from('dashboard_metrics')  // ← VERIFICAR nombre real
    .select('freedom_days_current, savings_rate')
    .eq('user_id', userId)
    .maybeSingle();

  // Tags de perfil
  const { data: tags } = await supabase
    .from('user_profile_tags')
    .select('tag, category')
    .eq('user_id', userId)
    .eq('is_active', true);

  const lines = ['=== CONTEXTO DEL USUARIO ==='];

  if (reality) {
    lines.push(`- Precio/hora actual: $${reality.hourly_rate} USD`);
    lines.push(`- Ingresos mensuales: $${reality.monthly_income} USD`);
    lines.push(`- Gastos mensuales: $${reality.monthly_expenses} USD`);
    if (reality.freedom_target_days) {
      lines.push(`- Meta de libertad: ${reality.freedom_target_days} días/año`);
    }
  }

  if (dashboard) {
    lines.push(`- Días de libertad actuales: ${dashboard.freedom_days_current ?? 0}`);
    if (dashboard.savings_rate) {
      lines.push(`- Tasa de ahorro: ${dashboard.savings_rate}%`);
    }
  }

  if (tags?.length) {
    lines.push(`- Perfil conocido: ${tags.map(t => t.tag).join(', ')}`);
  }

  lines.push('=== FIN CONTEXTO ===\n');
  lines.push('Usá estos datos para personalizar tus respuestas:');
  lines.push('- Si tiene $15/hora y quiere 200 días libres, calculá cuánto debe generar el negocio');
  lines.push('- Si tiene tags de "ventas" o "tech", priorizá ideas en esas áreas');
  lines.push('- Nunca repitas estos datos mecánicamente — integralos naturalmente');

  return lines.join('\n');
}
```

### 7.3 System prompts por fase

Estos reemplazan los prompts genéricos actuales en `prompts.ts`. Están alineados con metodología socrática + GROW.

```typescript
const PHASE_PROMPTS: Record<string, string> = {

  observar: `Sos un coach de emprendimiento experto en negocios que generan libertad financiera.
Estamos en la fase OBSERVAR — el usuario está explorando posibilidades.

Tu rol:
- Hacé UNA sola pregunta por mensaje, nunca varias
- Las preguntas deben ser ACCIONABLES — exploran realidad concreta, no abstracciones
- Buscá: experiencias propias, problemas reales del entorno, redes de contacto, habilidades demostradas
- Después de 5-6 intercambios, proponé pasar a DEFINIR el problema más prometedor

Calibrá con el contexto financiero del usuario:
- Si tiene precio/hora bajo, buscá ideas de alto margen o escalables
- Si tiene pocos días de libertad, priorizá ideas que no requieran presencia física

Tipo de pregunta a hacer (método socrático aplicado):
- "¿Cuándo fue la última vez que alguien te pagó por resolver eso?"
- "Si ese problema desapareciera mañana, ¿quién sería el primero en notarlo?"
- "¿Cuántas veces por semana te topás con esto?"

Tono: cercano, curioso, sin jerga de startups. Como charla de café con un mentor.
Idioma: español rioplatense ("vos", "podés"). Respuestas cortas (3-5 oraciones max).`,

  definir: `Sos un coach de emprendimiento. Estamos en fase DEFINIR.
El usuario tiene observaciones o una idea vaga. Hay que delimitar el problema concreto.

Tu rol:
- Una pregunta por vez, empezando por la más importante
- Buscá especificidad extrema: ¿qué problema? ¿a quién exactamente? ¿en qué situación?
- Cuando el problema esté claro, pedile que lo formule en una oración
- Después sugerí pasar a IDEAR soluciones

Tipo de pregunta (confrontación + claridad):
- "Si tuvieras que describir esto en una sola oración sin mencionar tu solución, ¿cómo lo dirías?"
- "¿Quién sufre más este problema: el dueño, el empleado, o el cliente?"
- "¿El problema es urgente o solo incómodo?"

Calibrá: si el usuario tiene experiencia en una industria (tags), ancorá el problema ahí.

Tono: preciso, enfocado. Idioma: español. Respuestas cortas.`,

  idear: `Sos un coach de emprendimiento. Estamos en fase IDEAR.
El problema ya está definido. Generamos soluciones de negocio concretas.

Tu rol:
- Proponé 2-3 ideas con: nombre + concepto en 1 oración + modelo de negocio
- Fundamentá brevemente por qué cada una podría funcionar para este usuario
- Después de proponer, hacé UNA pregunta de selección
- Si ninguna convence, podés generar otra ronda

Tipo de pregunta (expansión + decisión):
- "De estas, ¿cuál arrancarías si tuvieras 6 meses sin preocuparte por el dinero?"
- "¿Cuál podés probar esta semana con menos de $100?"
- "Si tu reputación dependiera de que funcione, ¿cuál elegirías?"

Calibrá:
- Priorizá ideas que aprovechen sus habilidades conocidas (tags)
- Considerá su capacidad económica actual

Formato cada idea:
  **Nombre:** [nombre]
  **Qué es:** [1 oración]
  **Modelo:** [cómo gana dinero]

Idioma: español. Sin jerga de startups.`,

  evaluar: `Sos un coach de emprendimiento experto en evaluación de negocios.
Estamos en fase EVALUAR. La idea está clara, vamos a puntuarla.

Framework de evaluación (5 dimensiones del 1 al 10):
- Control: ¿qué tan dueño? (1=dependés de plataforma/cliente, 10=control total)
- Entrada: ¿qué tan difícil que te copien? (1=muy fácil, 10=imposible)
- Necesidad: ¿qué tan urgente para el cliente? (1=lujo, 10=lo necesita ahora)
- Tiempo: ¿funciona sin tu presencia? (1=solo cuando trabajás, 10=funciona solo)
- Escala: ¿podés multiplicar sin multiplicar trabajo? (1=no, 10=totalmente)

Tu rol:
- Sugerí scores 1-10 para cada dimensión con justificación de 1-2 oraciones
- Usá ejemplos concretos anclados a la idea, no definiciones abstractas
- NO uses los nombres del framework (Control, Entrada, etc) — usá palabras simples
- Después del scoring, calculá total /50 y sugerí seguir (>30) o reconsiderar (<20)

Tipo de pregunta (cierre + compromiso):
- "¿Qué podés hacer esta semana que te dé evidencia real de si funciona?"
- "¿Cuántos clientes necesitás para reemplazar tu ingreso actual?"
- "¿Qué es lo peor que puede pasar si apostás 3 meses?"

Calibrá: si el usuario necesita $X/mes para libertad, mencioná si la idea puede llegar.

Idioma: español. Sé directo — el usuario quiere saber si su idea vale.`,
};
```

### 7.4 Límites de mensajes por fase

```typescript
const PHASE_LIMITS: Record<string, number> = {
  observar: 8,    // exploración amplia
  definir:  6,    // foco
  idear:    6,    // generación + selección
  evaluar:  10,   // scoring requiere más intercambio
};
```

**Conteo:** solo mensajes con `role: 'user'` cuentan. Las respuestas del coach no.

**Aviso previo:** cuando quedan 2 mensajes, agregar al system prompt:
```
\n\nIMPORTANTE: Solo quedan 2 intercambios en esta fase. 
Enfocate en llegar a una conclusión accionable antes de cerrar.
```

**Al alcanzar el límite:** la action devuelve `{ ok: false, error: 'PHASE_LIMIT_REACHED' }`. La UI dispara `generatePhaseSummary()` y muestra `<PhaseTransition>`.

### 7.5 Resumen automático al cerrar fase

```typescript
// src/modules/ideas/ai/summary.ts
export async function generatePhaseSummary(
  userId: string,
  sessionId: string,
  phase: string
): Promise<ActionResult<{ insight: string; next: string; centsProgress: number }>> {
  const supabase = createAdminClient();

  const { data: messages } = await supabase
    .from('idea_session_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .eq('phase', phase)
    .order('sequence_order', { ascending: true });

  const conversation = messages
    ?.map(m => `${m.role === 'user' ? 'Usuario' : 'Coach'}: ${m.content}`)
    .join('\n') ?? '';

  const provider = await resolveAIProvider(userId);
  if (!provider.ok) return { ok: false, error: provider.error };

  const result = await provider.data.chat({
    system: `Generá un resumen de sesión de coaching en JSON exacto:
{
  "insight": "2-3 oraciones capturando lo más importante de la fase",
  "next_step": "una sola acción concreta para esta semana",
  "cents_progress": <número 0-100 estimando progreso hacia un score CENTS sólido>
}
Solo JSON válido, sin preamble.`,
    messages: [{ role: 'user', content: `Resumí esta fase ${phase}:\n\n${conversation}` }],
  });

  if (!result.ok) return { ok: false, error: result.error };

  try {
    const parsed = JSON.parse(result.data.content);

    // Guardar en idea_sessions
    await supabase
      .from('idea_sessions')
      .update({
        phase_summary: parsed.insight,
        next_step: parsed.next_step,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Extraer tags de perfil silenciosamente (no bloqueante)
    extractAndSaveProfileTags(userId, conversation).catch(() => {});

    return {
      ok: true,
      data: {
        insight: parsed.insight,
        next: parsed.next_step,
        centsProgress: parsed.cents_progress ?? 0,
      },
    };
  } catch {
    return { ok: false, error: 'SUMMARY_PARSE_ERROR' };
  }
}
```

### 7.6 Sistema de tags de perfil

**Tabla a crear:**

```sql
CREATE TABLE user_profile_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag         text NOT NULL,
  category    text NOT NULL CHECK (category IN ('habilidad', 'industria', 'interes', 'contexto')),
  source      text NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'user')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag)
);

CREATE INDEX idx_user_profile_tags_user ON user_profile_tags(user_id);
ALTER TABLE user_profile_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_tags" ON user_profile_tags
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_modify_own_tags" ON user_profile_tags
  FOR ALL USING (user_id = auth.uid());
```

**Extracción silenciosa al cerrar sesión:**

```typescript
async function extractAndSaveProfileTags(userId: string, conversation: string) {
  const provider = await resolveAIProvider(userId);
  if (!provider.ok) return;

  const result = await provider.data.chat({
    system: `Extractor de datos. Devolvé solo JSON:
{
  "tags": [
    { "tag": "ventas", "category": "habilidad" },
    { "tag": "salud", "category": "industria" }
  ]
}
Categorías: habilidad | industria | interes | contexto.
Solo tags concretos. Máximo 5. Sin preamble.`,
    messages: [{ role: 'user', content: conversation }],
  });

  if (!result.ok) return;

  try {
    const { tags } = JSON.parse(result.data.content);
    const supabase = createAdminClient();

    for (const t of tags ?? []) {
      await supabase.from('user_profile_tags').upsert({
        user_id: userId,
        tag: t.tag.toLowerCase().trim(),
        category: t.category,
        source: 'ai',
        is_active: true,
      }, { onConflict: 'user_id,tag', ignoreDuplicates: true });
    }
  } catch { /* silencioso */ }
}
```

### 7.7 Actions a crear para tags

```typescript
// src/modules/ideas/actions/tags.ts
'use server';

export async function getUserProfileTags(userId: string): Promise<ActionResult<ProfileTag[]>>;
export async function addProfileTag(userId: string, tag: string, category: string): Promise<ActionResult<ProfileTag>>;
export async function removeProfileTag(userId: string, tagId: string): Promise<ActionResult<void>>;
```

### 7.8 Próximo paso en la card (real, no fallback)

El campo `nextStep` en `IdeaCard` viene de la última sesión completada:

```typescript
// En el mapper de ideas
async function mapIdeaWithNextStep(idea: IdeaRow): Promise<Idea> {
  const { data: lastSession } = await supabase
    .from('idea_sessions')
    .select('next_step, completed_at')
    .eq('idea_id', idea.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextStep = lastSession?.next_step ?? NEXT_STEP_FALLBACK[idea.status];
  const lastActivity = lastSession?.completed_at
    ? differenceInDays(new Date(), new Date(lastSession.completed_at))
    : differenceInDays(new Date(), new Date(idea.updated_at));

  return { ...idea, nextStep, lastActivity };
}

const NEXT_STEP_FALLBACK: Record<string, string | null> = {
  generated:    "Evaluar con CENTS",
  committed:    "Completar evaluación CENTS",
  validando:    "Registrar resultado de validación",
  construyendo: "Completar Deep Dive",
  operando:     null,
  discarded:    null,
};
```

---

## 8. SISTEMA DE DISEÑO

### 8.1 Tipografía

```
IBM Plex Mono  → números, scores, métricas, contadores
IBM Plex Sans  → todo el texto
```

### 8.2 Colores

```
Base       #F2F7F4   fondo de página
Dark       #1A2520   header del chat, cards destacadas
Dark deep  #0D1A14   overlay de transición
Acento     #2E7D52   CTAs, activo, botón principal
Acento+    #3A9E6A   hover, indicador positivo
Surface    #EAF0EC   fondos secundarios, chips
Gold       #C69B30   committed, warnings, momentum medio
Alerta     #E84434   urgente (>14d), límite mensajes
Texto      #141F19   títulos, valores
TextoSec   #7A9A8A   labels, metadata
Borde      #e0ebe4   separadores, bordes
```

### 8.3 Colores por fase

```
observar    #7A9A8A   gris-verde (exploración)
definir     #C69B30   dorado (foco, atención)
idear       #3A9E6A   verde claro (creatividad)
evaluar     #2E7D52   verde profundo (acción)
```

### 8.4 Colores por estado de idea

```
generated      texto #7A9A8A · bg rgba(122,154,138,0.12)   "Nueva"
committed      texto #C69B30 · bg rgba(198,155,48,0.12)    "Comprometida"
validando      texto #3A9E6A · bg rgba(58,158,106,0.12)    "Validando"
construyendo   texto #2E7D52 · bg rgba(46,125,82,0.18)     "Construyendo"
operando       texto #1a6e3c · bg rgba(26,110,60,0.20)     "Operando"
discarded      texto #7A9A8A · bg rgba(122,154,138,0.08)   "Descartada"
```

### 8.5 Layout

```
max-width: 480px (centrado)
padding horizontal: 20px (lista) | 16px (chat)
padding bottom: 100px (espacio nav móvil)
border-radius: 14px cards | 18px burbujas | 20-22px pills/inputs
```

### 8.6 Animaciones

```css
@keyframes bubbleIn {
  from { opacity:0; transform: translateY(10px) scale(0.95); }
  to   { opacity:1; transform: translateY(0) scale(1); }
}
@keyframes slideUp {
  from { opacity:0; transform: translateY(20px); }
  to   { opacity:1; transform: translateY(0); }
}
@keyframes scaleIn {
  from { opacity:0; transform: scale(0.4); }
  to   { opacity:1; transform: scale(1); }
}
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40%           { transform: translateY(-6px); }
}
@keyframes float {
  from { transform: translateY(0); }
  to   { transform: translateY(-12px); }
}
@keyframes growBar { from { width: 0; } }
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46,125,82,0); }
  50%      { box-shadow: 0 0 0 6px rgba(46,125,82,0.15); }
}
```

**Aplicación:**
- Burbujas: `bubbleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)`
- Bottom sheets: `slideUp 0.25s ease`
- Pantalla transición: `fadeInFull 0.5s ease` + elementos con delays escalonados (0.2s a 0.8s)
- Botón send activo: `pulseGlow 2s infinite`
- Typing dots: `bounce 1.2s ease infinite` con delays 0s, 0.18s, 0.36s

---

## 9. ARCHIVOS A CREAR O MODIFICAR

### 9.1 Páginas

```
src/app/(protected)/ideas/
├── page.tsx                              MODIFICAR (reemplazar stub)
└── [ideaId]/
    ├── page.tsx                          NUEVO (resumen de idea)
    └── chat/
        └── page.tsx                      NUEVO (chat activo)
```

### 9.2 Componentes UI

```
src/modules/ideas/components/
├── IdeasListPage.tsx                     NUEVO (cliente, lista completa)
├── IdeaCard.tsx                          NUEVO (compact + full)
├── ScoreBadge.tsx                        NUEVO
├── ActivityDot.tsx                       NUEVO
├── PhaseBar.tsx                          NUEVO (header del chat)
├── ChatBubble.tsx                        NUEVO
├── TypingIndicator.tsx                   NUEVO (con thinking text)
├── SuggestionChips.tsx                   NUEVO
├── PhaseTransition.tsx                   NUEVO (overlay full screen)
├── IdeaSummaryEntry.tsx                  NUEVO (pantalla de resumen)
├── NewIdeaSheet.tsx                      NUEVO (bottom sheet)
└── IdeaDetailSheet.tsx                   NUEVO (bottom sheet desde lista)
```

### 9.3 AI Layer

```
src/modules/ideas/ai/
├── context.ts                            NUEVO   buildUserContext + extractAndSaveProfileTags
├── summary.ts                            NUEVO   generatePhaseSummary
├── prompts.ts                            MODIFICAR  reemplazar PHASE_PROMPTS
├── provider.ts                           ✅ existe
├── resolver.ts                           ✅ existe
└── usage.ts                              ✅ existe
```

### 9.4 Actions

```
src/modules/ideas/actions/
├── messages.ts                           MODIFICAR  integrar context + límites + warnings
├── sessions.ts                           MODIFICAR  trigger generatePhaseSummary al completar
├── tags.ts                               NUEVO   getUserProfileTags, addProfileTag, removeProfileTag
└── ... (resto sin cambios)
```

### 9.5 Constantes

```
src/modules/ideas/
├── constants.ts                          MODIFICAR  agregar SUGGESTIONS, COACH_THINKING, NEXT_STEP_FALLBACK
└── mappers.ts                            MODIFICAR  agregar mapIdeaWithNextStep
```

### 9.6 Migraciones SQL pendientes

```sql
-- 1. Tabla user_profile_tags (nueva)
CREATE TABLE user_profile_tags (...);  -- ver sección 7.6

-- 2. Columnas adicionales en idea_sessions (verificar si existen)
ALTER TABLE idea_sessions
  ADD COLUMN IF NOT EXISTS phase_summary text,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 3. Función promote_idea_to_operando (pendiente — ver CONTEXT.md)
```

---

## 10. VERIFICACIONES PREVIAS EN DB

Antes de tocar código, verificar con `execute_sql`:

```sql
-- 1. Nombres reales de tablas M1 y M2
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name ILIKE '%reality%' 
    OR table_name ILIKE '%dashboard%' 
    OR table_name ILIKE '%financial%');

-- 2. Columnas en idea_sessions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'idea_sessions';

-- 3. CHECK constraint de fases
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname ILIKE '%phase%';

-- 4. ¿Existe ya user_profile_tags?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'user_profile_tags'
);
```

---

## 11. CRITERIOS DE DONE

### 11.1 Funcionales

1. **Lista de ideas** muestra 3 zonas correctamente filtradas con tabs funcionales
2. **IdeaCard** muestra próximo paso real (de última sesión) o fallback
3. **ActivityDot** aparece a partir de 4 días sin actividad
4. **Pantalla de resumen** muestra última pregunta del coach + estado de fases
5. **Chat** envía mensajes y recibe respuestas con datos reales del usuario inyectados
6. **TypingIndicator** muestra texto contextual rotando entre 4 opciones
7. **Suggestion chips** aparecen post-respuesta del coach, desaparecen al enviar
8. **Contador de mensajes** se actualiza correctamente y cambia a rojo en ≤2
9. **Warning de límite** aparece cuando `remaining ≤ 2 && remaining > 0`
10. **PhaseTransition** se dispara al `PHASE_LIMIT_REACHED` con resumen + score CENTS estimado
11. **Tags de perfil** se extraen silenciosamente al cerrar cada fase
12. **NewIdeaSheet** crea sesión correcta según entry point seleccionado

### 11.2 Técnicos

13. **Type-check limpio** — `npm run type-check` sin errores
14. **AIProvider** se llama correctamente con `userContext` integrado
15. **`ai_usage_logs`** se actualiza por cada llamada (UPSERT mensual)
16. **RLS** funcionando para `user_profile_tags`
17. **`createAdminClient()`** usado en todas las server actions, no SSR client

### 11.3 Visuales

18. Animaciones aplicadas según especificación de sección 8.6
19. Colores y tipografía respetando sistema de diseño
20. Layout responsive en `max-width: 480px`
21. Border del input cambia a verde al escribir
22. Botón send pulsa con glow cuando está activo

---

## NOTAS FINALES PARA CLAUDE CODE

1. **Empezar por las verificaciones DB** (sección 10) antes de escribir código
2. **No mezclar `apply_migration` con `execute_sql`** para DDL — siempre `apply_migration`
3. **Nombres de tablas M1/M2** son a verificar — los placeholders pueden no ser exactos
4. **Preguntas de coaching** del mockup pueden ir directamente como pool en `prompts.ts` para fallback si la AI necesita una sugerencia rápida
5. **El motor AI ya tiene base sólida** (provider, resolver, usage) — la mayoría del trabajo nuevo es UI + funciones de contexto/summary
6. **Mockups de referencia** para diseño visual exacto:
   - `ideas-mockup.jsx` — Lista (tablero)
   - `ideas-chat-v2.jsx` — Chat con todas las mejoras UX

7. **Función SQL `promote_idea_to_operando`** sigue pendiente — diseñar en sesión separada
