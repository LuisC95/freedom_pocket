# HANDOFF — M4 Motor AI · Metodología y Contexto de Usuario
> Para Claude Code. Complementa HANDOFF_M4_AI_LAYER.md — leer ambos.
> Diseñado: 26-abr-2026.

---

## Qué resuelve este documento

El AI Layer ya existe (provider, resolver, usage tracking). Lo que falta es el **cerebro**:
qué sabe la AI sobre el usuario, cómo razona en cada fase, cuándo para, y qué hace al parar.

---

## 1. Contexto del usuario — qué se inyecta en cada prompt

Antes de llamar al provider, se construye un bloque de contexto con los datos reales del usuario.
Este bloque se antepone al system prompt de la fase.

### 1.1 Datos financieros (de M1 y M2)

```typescript
// Función a crear: src/modules/ideas/ai/context.ts
export async function buildUserContext(userId: string): Promise<string> {
  const supabase = createAdminClient();

  // Datos de M1 — precio/hora y situación actual
  const { data: reality } = await supabase
    .from('financial_reality')           // tabla M1 — verificar nombre real en DB
    .select('hourly_rate, monthly_income, monthly_expenses, freedom_target_days')
    .eq('user_id', userId)
    .maybeSingle();

  // Datos de M2 — días de libertad actuales
  const { data: dashboard } = await supabase
    .from('dashboard_metrics')           // tabla M2 — verificar nombre real en DB
    .select('freedom_days_current, savings_rate')
    .eq('user_id', userId)
    .maybeSingle();

  // Tags de perfil (ver sección 2)
  const { data: tags } = await supabase
    .from('user_profile_tags')
    .select('tag, category')
    .eq('user_id', userId)
    .eq('is_active', true);

  // Construir bloque de texto
  const lines: string[] = ['=== CONTEXTO DEL USUARIO ==='];

  if (reality) {
    lines.push(`- Precio/hora actual: $${reality.hourly_rate} USD`);
    lines.push(`- Ingresos mensuales: $${reality.monthly_income} USD`);
    lines.push(`- Gastos mensuales: $${reality.monthly_expenses} USD`);
    if (reality.freedom_target_days) {
      lines.push(`- Meta de libertad: ${reality.freedom_target_days} días libres/año`);
    }
  }

  if (dashboard) {
    lines.push(`- Días de libertad actuales: ${dashboard.freedom_days_current ?? 0}`);
    if (dashboard.savings_rate) {
      lines.push(`- Tasa de ahorro actual: ${dashboard.savings_rate}%`);
    }
  }

  if (tags && tags.length > 0) {
    const tagList = tags.map(t => t.tag).join(', ');
    lines.push(`- Perfil conocido: ${tagList}`);
  }

  lines.push('=== FIN CONTEXTO ===');
  lines.push('');
  lines.push('Usá estos datos para personalizar tus respuestas. Por ejemplo:');
  lines.push('- Si el usuario tiene $15/hora y quiere 200 días de libertad, calculá cuánto necesitaría generar el negocio para cambiar esa realidad.');
  lines.push('- Si tiene tags de "ventas" o "tech", priorizá ideas en esas áreas.');
  lines.push('- Nunca repitas estos datos mecánicamente — integralos naturalmente en la conversación.');

  return lines.join('\n');
}
```

### 1.2 Cómo se integra con el system prompt existente

```typescript
// En messages.ts, reemplazar buildSystemPromptForPhase por:
const userContext = await buildUserContext(userId);
const phasePrompt = SYSTEM_PROMPTS[phase] ?? SYSTEM_PROMPTS.observar;
const systemPrompt = `${userContext}\n\n${phasePrompt}`;
```

### 1.3 Qué hace la AI con el contexto

La AI no repite los datos — los usa para calibrar:

| Dato disponible | Cómo lo usa la AI |
|---|---|
| Precio/hora $15 | "Para reemplazar tu ingreso con este negocio necesitarías generar ~$1.800/mes" |
| 12 días de libertad actuales | "Con este modelo podrías llegar a 90 días en 18 meses si escala bien" |
| Tag: "ventas" | Prioriza ideas que aprovechen habilidad comercial |
| Tag: "salud" | Conecta oportunidades con sector que conoce |
| Sin datos M1 | Opera en modo genérico, no inventa números |

---

## 2. Perfil de tags — `user_profile_tags`

### 2.1 Schema a crear (migración pendiente)

```sql
CREATE TABLE user_profile_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag         text NOT NULL,                    -- ej: "ventas", "programación", "salud"
  category    text NOT NULL,                    -- 'habilidad' | 'industria' | 'interes' | 'contexto'
  source      text NOT NULL DEFAULT 'ai',       -- 'ai' (detectado) | 'user' (agregado manualmente)
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profile_tags_user ON user_profile_tags(user_id);
ALTER TABLE user_profile_tags ENABLE ROW LEVEL SECURITY;
-- RLS: usuario solo ve sus propios tags
```

### 2.2 Categorías de tags

| category | Ejemplos |
|---|---|
| `habilidad` | programación, diseño, ventas, contabilidad, carpintería |
| `industria` | salud, tecnología, educación, construcción, gastronomía |
| `interes` | automatización, viajes, deportes, música, inversión |
| `contexto` | trabaja solo, tiene equipo, capital limitado, acceso a red corporativa |

### 2.3 Cómo se detectan (AI → DB)

Al final de cada sesión de chat (cuando se genera el resumen automático), la AI corre un segundo
llamado silencioso para extraer tags de la conversación:

```typescript
// En ai/context.ts — función adicional
export async function extractAndSaveProfileTags(
  userId: string,
  conversationText: string   // toda la sesión concatenada
): Promise<void> {
  const provider = await resolveAIProvider(userId);
  if (!provider.ok) return; // silencioso

  const result = await provider.data.chat({
    system: `Eres un extractor de datos. 
Analizá la conversación y devolvé SOLO un JSON válido con esta forma:
{
  "tags": [
    { "tag": "ventas", "category": "habilidad" },
    { "tag": "salud", "category": "industria" }
  ]
}
Solo tags concretos y útiles. Máximo 5 por sesión. Sin preamble, solo JSON.`,
    messages: [{ role: 'user', content: conversationText }],
  });

  if (!result.ok) return;

  try {
    const parsed = JSON.parse(result.data.content);
    const tags = parsed.tags ?? [];

    for (const t of tags) {
      // Upsert silencioso — no duplicar tags existentes
      await supabase.from('user_profile_tags')
        .upsert({
          user_id: userId,
          tag: t.tag.toLowerCase().trim(),
          category: t.category,
          source: 'ai',
          is_active: true,
        }, {
          onConflict: 'user_id,tag',
          ignoreDuplicates: true,
        });
    }
  } catch { /* silencioso */ }
}
```

### 2.4 UI de tags (dónde vive)

Los tags se muestran en la pantalla de **perfil del usuario** (fuera de M4).
Para M4, la UI solo necesita un componente pequeño dentro de la sesión de chat:

```
Tu perfil · 3 etiquetas
[ventas ×]  [salud ×]  [programación ×]  [+ Agregar]
```

- Tags con `×` → marcan `is_active = false` (no se eliminan de DB, se pueden restaurar)
- `+ Agregar` → input de texto libre → crea tag con `source: 'user'`
- Este componente vive en la pantalla de perfil o en el header de M4 como detalle expandible

### 2.5 Actions a crear para tags

```typescript
// src/modules/ideas/actions/tags.ts (nuevo archivo)
getUserProfileTags(userId)         // lista tags activos
addProfileTag(userId, tag, category)
removeProfileTag(userId, tagId)    // soft delete — is_active = false
```

---

## 3. Límites de sesión por fase

### 3.1 Límites definidos

| Fase | Máx mensajes usuario | Razonamiento |
|---|---|---|
| `observar` | 8 | Exploración amplia — necesita espacio |
| `definir` | 6 | Proceso de foco — más corto |
| `idear` | 6 | La AI propone opciones, el usuario elige |
| `evaluar` | 10 | Scoring CENTS requiere más intercambio |

**Mensajes usuario** = solo los de `role: 'user'`. Los de `role: 'assistant'` no cuentan para el límite.

### 3.2 Cómo se controla

En `sendMessage`, antes de llamar al provider:

```typescript
// Contar mensajes del usuario en esta fase
const { count } = await supabase
  .from('idea_session_messages')
  .select('*', { count: 'exact', head: true })
  .eq('session_id', sessionId)
  .eq('phase', phase)
  .eq('role', 'user');

const PHASE_LIMITS: Record<string, number> = {
  observar: 8,
  definir:  6,
  idear:    6,
  evaluar:  10,
};

const limit = PHASE_LIMITS[phase] ?? 8;

if ((count ?? 0) >= limit) {
  // Trigger cierre automático (ver sección 4)
  return { ok: false, error: 'PHASE_LIMIT_REACHED' };
}
```

### 3.3 Aviso previo al límite

Cuando quedan 2 mensajes, la AI recibe instrucción adicional en el system prompt:

```typescript
const remainingMessages = limit - (count ?? 0);
const warningAddition = remainingMessages <= 2
  ? `\n\nIMPORTANTE: Solo quedan ${remainingMessages} intercambios en esta fase. 
     Enfocate en llegar a una conclusión accionable antes de cerrar.`
  : '';

const systemPrompt = `${userContext}\n\n${phasePrompt}${warningAddition}`;
```

---

## 4. Cierre automático y resumen

Cuando se alcanza el límite (`PHASE_LIMIT_REACHED`) o cuando el usuario toca "Cerrar fase" manualmente:

### 4.1 Flujo de cierre

```typescript
// Nueva función: src/modules/ideas/ai/summary.ts
export async function generatePhaseSummary(
  userId: string,
  sessionId: string,
  phase: string
): Promise<ActionResult<string>> {

  // 1. Traer toda la conversación de la fase
  const { data: messages } = await supabase
    .from('idea_session_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .eq('phase', phase)
    .order('sequence_order', { ascending: true });

  const conversationText = messages
    ?.map(m => `${m.role === 'user' ? 'Usuario' : 'Coach'}: ${m.content}`)
    .join('\n') ?? '';

  // 2. Generar resumen
  const provider = await resolveAIProvider(userId);
  if (!provider.ok) return { ok: false, error: provider.error };

  const result = await provider.data.chat({
    system: `Eres un asistente que genera resúmenes concisos de sesiones de coaching de emprendimiento.
Devolvé SOLO un JSON con esta forma exacta:
{
  "summary": "2-3 oraciones que capturen lo más importante de la sesión",
  "key_insights": ["insight 1", "insight 2"],
  "next_step": "una sola acción concreta y específica que el usuario puede hacer hoy o mañana"
}
Sin preamble, solo JSON válido.`,
    messages: [{ role: 'user', content: `Resumí esta sesión de fase ${phase}:\n\n${conversationText}` }],
  });

  if (!result.ok) return { ok: false, error: result.error };

  // 3. Parsear y guardar en la sesión
  try {
    const parsed = JSON.parse(result.data.content);

    await supabase
      .from('idea_sessions')
      .update({
        phase_summary: parsed.summary,
        next_step: parsed.next_step,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // 4. Extraer tags de perfil silenciosamente
    await extractAndSaveProfileTags(userId, conversationText);

    return { ok: true, data: parsed.next_step };

  } catch {
    return { ok: false, error: 'SUMMARY_PARSE_ERROR' };
  }
}
```

### 4.2 Campos necesarios en `idea_sessions` (verificar si existen)

| Campo | Tipo | Para qué |
|---|---|---|
| `phase_summary` | `text` | Resumen de la sesión al cierre |
| `next_step` | `text` | Próximo paso concreto generado |
| `completed_at` | `timestamptz` | Cuándo se cerró |

Si no existen → migración:
```sql
ALTER TABLE idea_sessions 
  ADD COLUMN IF NOT EXISTS phase_summary text,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
```

### 4.3 UX al cerrar la fase

```
┌────────────────────────────────────┐
│  ✓ Sesión completada               │
│                                    │
│  "Identificaste oportunidad en     │
│  servicios para barberías con      │
│  base en tu red de contactos."     │
│                                    │
│  Próximo paso:                     │
│  Hablar con 3 dueños de barbería   │
│  esta semana para validar si       │
│  pagarían por un sistema de turnos │
│                                    │
│  [Continuar a Definir →]           │
│  [Guardar y salir]                 │
└────────────────────────────────────┘
```

---

## 5. Recordatorios de próximo paso

El campo `next_step` generado en el cierre de sesión es el mismo que aparece en la `IdeaCard`
como "Próximo paso" (ver HANDOFF_M4_UX.md).

### 5.1 De dónde viene el `nextStep` en la card

Prioridad:
1. `idea_sessions.next_step` de la última sesión completada de esa idea
2. Si no hay sesión → fallback por status (ver tabla en HANDOFF_M4_UX.md)

```typescript
// En el mapper de ideas — agregar join con última sesión
const { data: lastSession } = await supabase
  .from('idea_sessions')
  .select('next_step')
  .eq('idea_id', ideaId)
  .eq('status', 'completed')
  .order('completed_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const nextStep = lastSession?.next_step ?? NEXT_STEP_FALLBACK[idea.status];
```

### 5.2 Notificaciones (Fase 2 — pendiente)

Por ahora, el recordatorio es visual en la app (ActivityDot en la card).
Notificaciones push / email → post-launch, cuando haya usuarios reales.

---

## 6. System prompts actualizados

Reemplazar los prompts en `messages.ts` con estas versiones mejoradas.
El contexto de usuario se inyecta antes del prompt de fase (ver sección 1.2).

```typescript
const SYSTEM_PROMPTS: Record<string, string> = {

  observar: `Sos un coach de emprendimiento enfocado en negocios que generan libertad financiera.
Estamos en la fase OBSERVAR — el usuario está explorando posibilidades.

Tu rol en esta fase:
- Hacé UNA sola pregunta por mensaje, nunca varias
- Explorá: habilidades, experiencias pasadas, problemas que ve en su entorno, redes de contacto
- Conectá lo que escuchás con oportunidades concretas (sin adelantarte)
- Después de 5-6 intercambios, proponé pasar a DEFINIR el problema más prometedor

Calibrá con el contexto financiero del usuario:
- Si tiene precio/hora bajo, buscá ideas de alto margen o escalables
- Si tiene pocos días de libertad, priorizá ideas que no requieran presencia física constante

Tono: cercano, curioso, sin jerga de startups. Como si fuera una charla de café con un mentor.
Idioma: español. Respuestas cortas (3-5 oraciones máximo).`,

  definir: `Sos un coach de emprendimiento. Estamos en fase DEFINIR.
El usuario tiene observaciones o una idea vaga. Hay que darle forma concreta.

Tu rol:
- Ayudalo a articular: ¿qué problema específico resuelve? ¿a quién exactamente? ¿en qué situación?
- Una pregunta por vez, empezando por la más importante
- Cuando el problema esté claro, pedile que lo formule en una oración
- Después sugerí pasar a IDEAR soluciones

Calibrá: si el usuario tiene experiencia en una industria (según sus tags), ancorá el problema ahí.

Tono: preciso, enfocado. Respuestas cortas. Idioma: español.`,

  idear: `Sos un coach de emprendimiento. Estamos en fase IDEAR.
El problema ya está definido. Ahora generamos soluciones de negocio.

Tu rol:
- Proponé 2-3 ideas concretas con: nombre + concepto en 1 oración + modelo de negocio
- Fundamentá brevemente por qué cada una podría funcionar para este usuario en particular
- Preguntale cuál le resuena más para pasarla a EVALUAR
- Si ninguna convence, podés generar una ronda más

Calibrá con el contexto:
- Priorizá ideas que aprovechen sus habilidades conocidas (tags)
- Considerá su capacidad económica actual (no propongas ideas con alta inversión inicial si tiene poco capital)

Formato de cada idea:
  **Nombre:** [nombre]
  **Qué es:** [1 oración]
  **Modelo:** [cómo gana dinero]

Idioma: español. Sin jerga de startups.`,

  evaluar: `Sos un coach de emprendimiento experto en evaluación de negocios.
Estamos en fase EVALUAR. El usuario ya tiene una idea clara y vamos a puntuarla.

El framework de evaluación usa 5 dimensiones (del 1 al 10 cada una):
- Control: ¿qué tan dueño sos de tu negocio? (1=dependés de una plataforma/cliente, 10=total control)
- Entrada: ¿qué tan difícil es que alguien te copie mañana? (1=muy fácil, 10=muy difícil)
- Necesidad: ¿qué tan urgente es el problema para el cliente? (1=es un lujo, 10=lo necesita ahora)
- Tiempo: ¿el negocio funciona sin que estés presente? (1=solo cuando trabajás, 10=funciona solo)
- Escala: ¿podés multiplicar sin multiplicar el trabajo? (1=no, 10=totalmente)

Tu rol:
- Cuando te pidan, sugerí un score del 1 al 10 para cada dimensión con 1-2 oraciones de justificación
- Usá ejemplos concretos anclados a la idea específica, no definiciones abstractas
- No uses los nombres del framework en tu respuesta — explicá con palabras simples
- Después del scoring, calculá el total /50 y decí si vale la pena seguir (>30) o reconsiderar (<20)

Calibrá con los datos financieros: si el usuario necesita $3.000/mes para su libertad, mencioná si esta idea puede llegar a eso.

Idioma: español. Sé directo — el usuario quiere saber si su idea vale.`,

};
```

---

## 7. Archivos a crear / modificar

```
src/modules/ideas/ai/
├── context.ts           ← NUEVO · buildUserContext() + extractAndSaveProfileTags()
├── summary.ts           ← NUEVO · generatePhaseSummary()
├── provider.ts          ← ya existe ✅
├── resolver.ts          ← ya existe ✅
└── usage.ts             ← ya existe ✅

src/modules/ideas/actions/
├── messages.ts          ← MODIFICAR · integrar contexto + límites
├── sessions.ts          ← MODIFICAR · trigger generatePhaseSummary al completar
└── tags.ts              ← NUEVO · getUserProfileTags, addProfileTag, removeProfileTag

Migración pendiente:
  - Tabla user_profile_tags (nueva)
  - Columnas idea_sessions: phase_summary, next_step, completed_at (si no existen)
```

---

## 8. Verificaciones antes de implementar

Antes de tocar código, verificar en DB:

```sql
-- 1. Nombres reales de tablas de M1 y M2 para buildUserContext
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%reality%' OR table_name ILIKE '%dashboard%' OR table_name ILIKE '%profile%';

-- 2. Columnas disponibles en idea_sessions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'idea_sessions';

-- 3. Confirmar fases reales (CHECK constraint)
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname ILIKE '%phase%' OR conname ILIKE '%session%';
```

---

## 9. Lo que este documento NO cubre

- UI del chat (pantalla de conversación, input, burbujas) → sesión de diseño separada
- Pantalla de perfil con tags visibles/editables → sesión de diseño separada
- Notificaciones push → post-launch
- BYOK / tiers → Fase 2/3

---

## Criterios de done

1. `buildUserContext()` devuelve string con datos reales del usuario (o vacío si no tiene datos)
2. Los system prompts incluyen el contexto del usuario antes de cada llamada
3. Al llegar al límite de mensajes, `sendMessage` devuelve `PHASE_LIMIT_REACHED`
4. Al completar una sesión, `idea_sessions.next_step` tiene texto generado por la AI
5. La `IdeaCard` muestra el `next_step` real (no el fallback estático)
6. Tags se extraen silenciosamente al cerrar sesión y aparecen en `user_profile_tags`
7. Type-check limpio (`npm run type-check`)
