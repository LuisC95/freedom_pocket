# 🧱 HANDOFF · Módulo 4 — Server Actions

> Fuente de verdad del diseño de las **16 server actions** del Módulo 4 de Fastlane Compass.
> Diseño cerrado · implementación pendiente.
> Los types y constants de la sesión anterior (HANDOFF_M4_TYPES.md) siguen vigentes.

---

## 📌 Estado actual

- ✅ Schema M4 locked (migraciones aplicadas 16-abr-2026)
- ✅ UX M4 locked
- ✅ `constants.ts` + `types/index.ts` cerrados (sesión anterior)
- ✅ **16 server actions diseñadas con lógica completa**
- ⏳ **Mappers** (`mappers.ts`) — pendiente
- ⏳ **Migración SQL** para `promote_idea_to_operando()` — pendiente
- ⏳ **Migración SQL** para agregar `discarded_at` + `discard_reason` a `ideas` — pendiente
- ⏳ **`resolveAIProvider()` helper** — pendiente (depende de capa AIProvider)
- ⏳ **Capa `AIProvider`** — pendiente
- ⏳ **Bugs en código de esta sesión — corregidos en sección "Correcciones aplicadas"**

---

## 🗂️ Archivos producidos en esta sesión

```
src/modules/ideas/
├── actions/
│   ├── sessions.ts        ← 4 actions (createSession, getSession, completeSession, abandonSession)
│   ├── messages.ts        ← 1 action (sendMessage)
│   ├── ideas.ts           ← 4 actions (createIdeaFromSession, getIdea, listIdeas, updateCENTS)
│   ├── transitions.ts     ← 5 actions (commitIdea, startValidando, startConstruyendo, promoteToOperando, discardIdea)
│   └── deepDive.ts        ← 2 actions (upsertDeepDiveField, getDeepDive)
└── types/
    └── actions.ts         ← ActionResult<T> global
```

---

## 🎯 Decisiones tomadas en esta sesión (no re-discutir)

| # | Decisión | Dónde impacta |
|---|---|---|
| 1 | **Respuesta uniforme** `ActionResult<T>` — discriminated union `{ ok: true, data } \| { ok: false, error }` | Todas las 16 actions |
| 2 | **`fields_completed` e `is_complete`** los calcula el action (no la UI) | `getDeepDive`, `promoteToOperando` |
| 3 | **`sendMessage`** resuelve suscripción y key antes de llamar al AIProvider | `sendMessage` |
| 4 | **`promoteToOperando`** usa transacción SQL vía `rpc()` — función `promote_idea_to_operando` | `promoteToOperando` |
| 5 | **`sequence_order`** = `MAX + 1` calculado en el action | `sendMessage` |
| 6 | **Mappers centralizados** por tabla (`mapSession`, `mapIdea`, `mapMessage`, `mapDeepDive`) | Todos los reads |
| 7 | **`listIdeas`** filtra solo por `status` al arranque (sin paginación ni otros filtros) | `listIdeas` |
| 8 | **`is_admin`** es responsabilidad del AIProvider, no de las actions | `sendMessage` (indirecto) |
| 9 | **`getSession` y `getIdea`** con flags opcionales (`includeMessages`, `includeIdeas`, `includeDeepDive`, `includeSession`) | 2 reads |
| 10 | **`sendMessage`** devuelve `{ userMessage, assistantMessage }` — no el historial completo | `sendMessage` |
| 11 | **Helper `assertValidTransition()`** centralizado contra `IDEA_STATUS_TRANSITIONS` de constants.ts | 5 transiciones |
| 12 | **`upsertDeepDiveField`** acepta los 8 campos editables incluido `ai_notes` (whitelist de seguridad) | `upsertDeepDiveField` |
| 13 | **Schema update pendiente:** agregar `discarded_at timestamptz NULL` + `discard_reason text NULL` a `ideas` | Migración pre-implementación |

---

## 📄 Archivo 1/7 — `src/types/actions.ts`

Tipo utilitario global. Se importa desde todas las actions.

```typescript
// src/types/actions.ts
// Shape uniforme de respuesta para todas las server actions.
// Discriminated union: TypeScript obliga a verificar `ok` antes de acceder a `data`.

export type ActionResult<T> =
  | { ok: true;  data: T }
  | { ok: false; error: string }
```

---

## 📄 Archivo 2/7 — `src/modules/ideas/actions/sessions.ts`

```typescript
// src/modules/ideas/actions/sessions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { ActionResult }       from '@/types/actions'
import {
  IdeaSession,
  CreateSessionInput,
} from '@/modules/ideas/types'
import { ENTRY_POINTS } from '@/modules/ideas/constants'
import { mapSession, mapMessage, mapIdea } from '@/modules/ideas/mappers'

const DEV_USER_ID = process.env.DEV_USER_ID!

// ─────────────────────────────────────────────
// 1. createSession
// ─────────────────────────────────────────────

export async function createSession(
  input: CreateSessionInput
): Promise<ActionResult<IdeaSession>> {
  try {
    const entryPoint = ENTRY_POINTS.find(e => e.key === input.entry_point)
    if (!entryPoint) {
      return { ok: false, error: 'entry_point inválido' }
    }

    if (entryPoint.requires_raw_input && !input.raw_input?.trim()) {
      return { ok: false, error: 'Este punto de entrada requiere una idea inicial' }
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('idea_sessions')
      .insert({
        user_id:     DEV_USER_ID,
        entry_point: input.entry_point,
        raw_input:   input.raw_input?.trim() ?? null,
        status:      'in_progress',
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapSession(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al crear la sesión' }
  }
}

// ─────────────────────────────────────────────
// 2. getSession (con flags opcionales)
// ─────────────────────────────────────────────

interface GetSessionOptions {
  includeMessages?: boolean
  includeIdeas?:    boolean
}

export async function getSession(
  sessionId: string,
  options: GetSessionOptions = {}
): Promise<ActionResult<IdeaSession>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('idea_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (error || !data) return { ok: false, error: 'Sesión no encontrada' }

    const session = mapSession(data)

    if (options.includeMessages) {
      const { data: messages } = await supabase
        .from('idea_session_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('sequence_order', { ascending: true })

      session.messages = (messages ?? []).map(mapMessage)
      session.messages_count = session.messages.length
    }

    if (options.includeIdeas) {
      const { data: ideas } = await supabase
        .from('ideas')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', DEV_USER_ID)
        .order('created_at', { ascending: true })

      session.ideas = (ideas ?? []).map(mapIdea)
    }

    return { ok: true, data: session }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al obtener la sesión' }
  }
}

// ─────────────────────────────────────────────
// 3. completeSession
// ─────────────────────────────────────────────

export async function completeSession(
  sessionId: string
): Promise<ActionResult<IdeaSession>> {
  return updateSessionStatus(sessionId, 'completed')
}

// ─────────────────────────────────────────────
// 4. abandonSession
// ─────────────────────────────────────────────

export async function abandonSession(
  sessionId: string
): Promise<ActionResult<IdeaSession>> {
  return updateSessionStatus(sessionId, 'abandoned')
}

// Helper interno
async function updateSessionStatus(
  sessionId: string,
  newStatus: 'completed' | 'abandoned'
): Promise<ActionResult<IdeaSession>> {
  try {
    const supabase = createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('idea_sessions')
      .select('status')
      .eq('id', sessionId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (fetchError || !existing) return { ok: false, error: 'Sesión no encontrada' }

    if (existing.status !== 'in_progress') {
      return { ok: false, error: `La sesión ya está ${existing.status}` }
    }

    const { data, error } = await supabase
      .from('idea_sessions')
      .update({ status: newStatus })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapSession(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al actualizar la sesión' }
  }
}
```

---

## 📄 Archivo 3/7 — `src/modules/ideas/actions/messages.ts` (con correcciones)

> ⚠️ **Contiene correcciones respecto al código mostrado en conversación.**
> Ver sección "Correcciones aplicadas" más abajo para detalle.

```typescript
// src/modules/ideas/actions/messages.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { ActionResult }       from '@/types/actions'
import { IdeaMessage, SendMessageInput } from '@/modules/ideas/types'
import { mapMessage }         from '@/modules/ideas/mappers'
import { resolveAIProvider }  from '@/modules/ideas/ai/resolver'

const DEV_USER_ID = process.env.DEV_USER_ID!

// ─────────────────────────────────────────────
// 5. sendMessage
// ─────────────────────────────────────────────
// Flujo completo:
//   1. Verificar sesión activa (status = 'in_progress')
//   2. Resolver acceso AI del usuario (suscripción + key) vía resolveAIProvider
//   3. Calcular sequence_order (MAX + 1)
//   4. Persistir mensaje del usuario (provider/model vacíos pero requeridos)
//   5. Traer historial filtrado por fase (control de costos)
//   6. Llamar AIProvider con los mensajes de la fase
//   7. Persistir respuesta AI con todos los campos de telemetría
//   8. Devolver ambos mensajes (sin re-fetch del historial)

interface SendMessageResult {
  userMessage:      IdeaMessage
  assistantMessage: IdeaMessage
}

export async function sendMessage(
  input: SendMessageInput
): Promise<ActionResult<SendMessageResult>> {
  try {
    const supabase = createAdminClient()

    // ── 1. Verificar sesión activa ───────────────────────────────
    const { data: session, error: sessionError } = await supabase
      .from('idea_sessions')
      .select('id, status')
      .eq('id', input.session_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (sessionError || !session) {
      return { ok: false, error: 'Sesión no encontrada' }
    }
    if (session.status !== 'in_progress') {
      return { ok: false, error: 'La sesión ya no está activa' }
    }

    // ── 2. Resolver acceso AI ────────────────────────────────────
    // resolveAIProvider busca en user_subscriptions y user_api_keys.
    // Si el usuario no tiene acceso AI → devuelve error directo.
    const providerResult = await resolveAIProvider(DEV_USER_ID)
    if (!providerResult.ok) return { ok: false, error: providerResult.error }
    const aiProvider = providerResult.data

    // ── 3. Calcular sequence_order (MAX + 1) ─────────────────────
    const { data: maxRow } = await supabase
      .from('idea_session_messages')
      .select('sequence_order')
      .eq('session_id', input.session_id)
      .order('sequence_order', { ascending: false })
      .limit(1)
      .maybeSingle()  // maybeSingle porque la sesión puede no tener mensajes aún

    const nextOrder = (maxRow?.sequence_order ?? 0) + 1

    // ── 4. Persistir mensaje del usuario ─────────────────────────
    // ⚠️ user_id, provider, model, tokens_input, tokens_output, cost_usd son NOT NULL.
    // Para role='user' los defaults van en 0/''. provider/model ya vienen del AIProvider
    // resuelto — los mandamos al mensaje del usuario para consistencia de telemetría
    // (permite filtrar "mensajes enviados con key BYOK" incluso en el turno del usuario).
    const { data: userRow, error: insertError } = await supabase
      .from('idea_session_messages')
      .insert({
        session_id:     input.session_id,
        user_id:        DEV_USER_ID,
        role:           'user',
        content:        input.content.trim(),
        phase:          input.phase,
        sequence_order: nextOrder,
        provider:       aiProvider.provider,
        model:          aiProvider.model,
        tokens_input:   0,
        tokens_output:  0,
        cost_usd:       0,
      })
      .select()
      .single()

    if (insertError || !userRow) {
      return { ok: false, error: 'Error al guardar el mensaje' }
    }

    // ── 5. Traer historial filtrado por fase ─────────────────────
    // Solo mensajes de la fase actual → la AI no ve fases anteriores.
    // Esto es lo que mantiene el costo de tokens bajo control en BYOK.
    const { data: history } = await supabase
      .from('idea_session_messages')
      .select('role, content')
      .eq('session_id', input.session_id)
      .eq('phase', input.phase)
      .order('sequence_order', { ascending: true })

    const messages = (history ?? []).map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // ── 6. Llamar AIProvider ─────────────────────────────────────
    const aiResult = await aiProvider.chat({ messages })
    if (!aiResult.ok) return { ok: false, error: aiResult.error }

    // ── 7. Persistir respuesta AI con telemetría completa ────────
    const { data: assistantRow, error: assistantError } = await supabase
      .from('idea_session_messages')
      .insert({
        session_id:       input.session_id,
        user_id:          DEV_USER_ID,
        role:             'assistant',
        content:          aiResult.data.content,
        phase:            input.phase,
        sequence_order:   nextOrder + 1,
        provider:         aiResult.data.provider,
        model:            aiResult.data.model,
        tokens_input:     aiResult.data.tokens_input,
        tokens_output:    aiResult.data.tokens_output,
        cost_usd:         aiResult.data.cost_usd,
        response_time_ms: aiResult.data.response_time_ms ?? null,
      })
      .select()
      .single()

    if (assistantError || !assistantRow) {
      return { ok: false, error: 'Error al guardar la respuesta AI' }
    }

    return {
      ok:   true,
      data: {
        userMessage:      mapMessage(userRow),
        assistantMessage: mapMessage(assistantRow),
      },
    }
  } catch (e) {
    return { ok: false, error: 'Error inesperado en sendMessage' }
  }
}
```

---

## 📄 Archivo 4/7 — `src/modules/ideas/actions/ideas.ts`

```typescript
// src/modules/ideas/actions/ideas.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { ActionResult }       from '@/types/actions'
import {
  Idea,
  CreateIdeaFromSessionInput,
  UpdateCENTSInput,
  IdeaStatus,
} from '@/modules/ideas/types'
import { mapIdea, mapDeepDive, mapSession } from '@/modules/ideas/mappers'

const DEV_USER_ID = process.env.DEV_USER_ID!

// ─────────────────────────────────────────────
// 6. createIdeaFromSession
// ─────────────────────────────────────────────

export async function createIdeaFromSession(
  input: CreateIdeaFromSessionInput
): Promise<ActionResult<Idea>> {
  try {
    if (!input.title?.trim())   return { ok: false, error: 'La idea necesita un título' }
    if (!input.concept?.trim()) return { ok: false, error: 'La idea necesita un concepto' }

    const supabase = createAdminClient()

    // Si viene session_id, validamos ownership antes de asociar
    if (input.session_id) {
      const { data: session } = await supabase
        .from('idea_sessions')
        .select('id')
        .eq('id', input.session_id)
        .eq('user_id', DEV_USER_ID)
        .single()

      if (!session) return { ok: false, error: 'Sesión no encontrada' }
    }

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id:            DEV_USER_ID,
        session_id:         input.session_id ?? null,
        title:              input.title.trim(),
        concept:            input.concept.trim(),
        need_identified:    input.need_identified?.trim()    ?? null,
        fastlane_potential: input.fastlane_potential?.trim() ?? null,
        business_model:     input.business_model             ?? null,
        status:             'generated',
      })
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al crear la idea' }
  }
}

// ─────────────────────────────────────────────
// 7. getIdea (con flags opcionales)
// ─────────────────────────────────────────────

interface GetIdeaOptions {
  includeDeepDive?: boolean
  includeSession?:  boolean
}

export async function getIdea(
  ideaId: string,
  options: GetIdeaOptions = {}
): Promise<ActionResult<Idea>> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (error || !data) return { ok: false, error: 'Idea no encontrada' }

    const idea = mapIdea(data)

    if (options.includeDeepDive) {
      const { data: deepDive } = await supabase
        .from('idea_deep_dives')
        .select('*')
        .eq('idea_id', ideaId)
        .maybeSingle()

      idea.deep_dive = deepDive ? mapDeepDive(deepDive) : null
    }

    if (options.includeSession && data.session_id) {
      const { data: session } = await supabase
        .from('idea_sessions')
        .select('*')
        .eq('id', data.session_id)
        .single()

      idea.session = session ? mapSession(session) : undefined
    }

    return { ok: true, data: idea }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al obtener la idea' }
  }
}

// ─────────────────────────────────────────────
// 8. listIdeas (filtro opcional por status)
// ─────────────────────────────────────────────

interface ListIdeasInput {
  status?: IdeaStatus
}

export async function listIdeas(
  filter: ListIdeasInput = {}
): Promise<ActionResult<Idea[]>> {
  try {
    const supabase = createAdminClient()

    let query = supabase
      .from('ideas')
      .select('*')
      .eq('user_id', DEV_USER_ID)
      .order('created_at', { ascending: false })

    if (filter.status) {
      query = query.eq('status', filter.status)
    }

    const { data, error } = await query

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: (data ?? []).map(mapIdea) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al listar ideas' }
  }
}

// ─────────────────────────────────────────────
// 9. updateCENTS (1 a 5 scores)
// ─────────────────────────────────────────────

export async function updateCENTS(
  input: UpdateCENTSInput
): Promise<ActionResult<Idea>> {
  try {
    // Validación de rango 1-10 por score recibido
    for (const [key, value] of Object.entries(input.scores)) {
      if (typeof value !== 'number' || value < 1 || value > 10) {
        return { ok: false, error: `Score de '${key}' debe estar entre 1 y 10` }
      }
    }

    const supabase = createAdminClient()

    // Verificar ownership
    const { data: existing } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', input.idea_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (!existing) return { ok: false, error: 'Idea no encontrada' }

    // Mapear keys → nombres de columna (control → cents_score_control)
    const updates: Record<string, number> = {}
    for (const [key, value] of Object.entries(input.scores)) {
      updates[`cents_score_${key}`] = value
    }

    const { data, error } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', input.idea_id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al actualizar CENTS' }
  }
}

// NOTA: ListIdeasInput no está en types/index.ts — agregar en implementación
// o exportarlo desde types si se usa en múltiples lugares.
```

---

## 📄 Archivo 5/7 — `src/modules/ideas/actions/transitions.ts`

```typescript
// src/modules/ideas/actions/transitions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { ActionResult }       from '@/types/actions'
import {
  Idea,
  IdeaStatus,
  PromoteToOperandoInput,
  DiscardIdeaInput,
} from '@/modules/ideas/types'
import { IDEA_STATUS_TRANSITIONS } from '@/modules/ideas/constants'
import { mapIdea } from '@/modules/ideas/mappers'

const DEV_USER_ID = process.env.DEV_USER_ID!

// ─────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────

function assertValidTransition(
  currentStatus: IdeaStatus,
  newStatus:     IdeaStatus
): string | null {
  const allowed = IDEA_STATUS_TRANSITIONS[currentStatus]
  if (!allowed.includes(newStatus)) {
    return `Transición inválida: '${currentStatus}' → '${newStatus}'`
  }
  return null
}

async function fetchIdeaForTransition(ideaId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('ideas')
    .select('id, status, title')
    .eq('id', ideaId)
    .eq('user_id', DEV_USER_ID)
    .single()
  return data ?? null
}

// ─────────────────────────────────────────────
// 10. commitIdea (generated → committed)
// ─────────────────────────────────────────────

export async function commitIdea(ideaId: string): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(ideaId)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'committed')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({
        status:       'committed',
        committed_at: new Date().toISOString(),
      })
      .eq('id', ideaId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al comprometer la idea' }
  }
}

// ─────────────────────────────────────────────
// 11. startValidando (committed → validando)
// ─────────────────────────────────────────────

export async function startValidando(ideaId: string): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(ideaId)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'validando')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({ status: 'validando' })
      .eq('id', ideaId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al iniciar validación' }
  }
}

// ─────────────────────────────────────────────
// 12. startConstruyendo (validando → construyendo)
// ─────────────────────────────────────────────

export async function startConstruyendo(ideaId: string): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(ideaId)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'construyendo')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({ status: 'construyendo' })
      .eq('id', ideaId)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al iniciar construcción' }
  }
}

// ─────────────────────────────────────────────
// 13. promoteToOperando (construyendo → operando)
// ─────────────────────────────────────────────
// Usa transacción SQL vía rpc() para atomicidad:
// crea business en M3 + actualiza idea en una sola operación.
// Si algo falla, ambas se revierten. La función SQL
// 'promote_idea_to_operando' debe existir en DB (ver migración pendiente).

export async function promoteToOperando(
  input: PromoteToOperandoInput
): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(input.idea_id)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'operando')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('promote_idea_to_operando', {
      p_idea_id:       input.idea_id,
      p_user_id:       DEV_USER_ID,
      p_business_name: input.business_name?.trim() ?? idea.title,
    })

    if (error) return { ok: false, error: error.message }
    if (!data)  return { ok: false, error: 'La promoción no devolvió la idea actualizada' }

    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al promover la idea' }
  }
}

// ─────────────────────────────────────────────
// 14. discardIdea (cualquier no-terminal → discarded)
// ─────────────────────────────────────────────
// ⚠️ Requiere migración: agregar discarded_at y discard_reason a ideas
// (ver sección "Migraciones pendientes" más abajo).

export async function discardIdea(
  input: DiscardIdeaInput
): Promise<ActionResult<Idea>> {
  try {
    const idea = await fetchIdeaForTransition(input.idea_id)
    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const transitionError = assertValidTransition(idea.status, 'discarded')
    if (transitionError) return { ok: false, error: transitionError }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .update({
        status:         'discarded',
        discarded_at:   new Date().toISOString(),
        discard_reason: input.reason?.trim() ?? null,
      })
      .eq('id', input.idea_id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }
    return { ok: true, data: mapIdea(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al descartar la idea' }
  }
}
```

---

## 📄 Archivo 6/7 — `src/modules/ideas/actions/deepDive.ts`

```typescript
// src/modules/ideas/actions/deepDive.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { ActionResult }       from '@/types/actions'
import {
  IdeaDeepDive,
  UpsertDeepDiveFieldInput,
  DeepDiveField,
} from '@/modules/ideas/types'
import { DEEP_DIVE_FIELDS } from '@/modules/ideas/constants'
import { mapDeepDive } from '@/modules/ideas/mappers'

const DEV_USER_ID = process.env.DEV_USER_ID!

// Whitelist de seguridad: solo estos campos pueden escribirse vía upsert.
// Previene SQL injection por nombre de columna arbitrario.
const VALID_FIELDS: DeepDiveField[] = [
  ...DEEP_DIVE_FIELDS.map(f => f.key),
  'ai_notes',
] as DeepDiveField[]

// ─────────────────────────────────────────────
// 15. upsertDeepDiveField
// ─────────────────────────────────────────────
// Crea el deep dive si no existe, actualiza el campo si ya existe.
// El usuario llena los 8 campos (7 plan + ai_notes) de a uno.

export async function upsertDeepDiveField(
  input: UpsertDeepDiveFieldInput
): Promise<ActionResult<IdeaDeepDive>> {
  try {
    if (!VALID_FIELDS.includes(input.field)) {
      return { ok: false, error: `Campo '${input.field}' no es válido` }
    }

    if (typeof input.value !== 'string') {
      return { ok: false, error: 'El valor debe ser texto' }
    }

    const supabase = createAdminClient()

    // Ownership vía idea (deep_dive no tiene user_id propio)
    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', input.idea_id)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const { data: existing } = await supabase
      .from('idea_deep_dives')
      .select('id')
      .eq('idea_id', input.idea_id)
      .maybeSingle()

    // String vacío → null (para que fields_completed cuente bien)
    const trimmed = input.value.trim()
    const valueToStore = trimmed.length > 0 ? trimmed : null

    if (existing) {
      const { data, error } = await supabase
        .from('idea_deep_dives')
        .update({ [input.field]: valueToStore })
        .eq('idea_id', input.idea_id)
        .select()
        .single()

      if (error) return { ok: false, error: error.message }
      return { ok: true, data: mapDeepDive(data) }
    } else {
      const { data, error } = await supabase
        .from('idea_deep_dives')
        .insert({
          idea_id:       input.idea_id,
          [input.field]: valueToStore,
        })
        .select()
        .single()

      if (error) return { ok: false, error: error.message }
      return { ok: true, data: mapDeepDive(data) }
    }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al guardar el campo' }
  }
}

// ─────────────────────────────────────────────
// 16. getDeepDive
// ─────────────────────────────────────────────
// Devuelve null si no existe (caso válido, no error).
// mapDeepDive calcula fields_completed e is_complete.

export async function getDeepDive(
  ideaId: string
): Promise<ActionResult<IdeaDeepDive | null>> {
  try {
    const supabase = createAdminClient()

    const { data: idea } = await supabase
      .from('ideas')
      .select('id')
      .eq('id', ideaId)
      .eq('user_id', DEV_USER_ID)
      .single()

    if (!idea) return { ok: false, error: 'Idea no encontrada' }

    const { data, error } = await supabase
      .from('idea_deep_dives')
      .select('*')
      .eq('idea_id', ideaId)
      .maybeSingle()

    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: true, data: null }

    return { ok: true, data: mapDeepDive(data) }
  } catch (e) {
    return { ok: false, error: 'Error inesperado al obtener el deep dive' }
  }
}
```

---

## 🐛 Correcciones aplicadas (bugs detectados al final de sesión)

Después de escribir las actions, verifiqué el schema real con `information_schema.columns`. Encontré 3 discrepancias que ya están corregidas en el código del handoff:

### Bug 1 — Nombres de columnas de telemetría en `idea_session_messages`

**En conversación escribí:** `ai_provider`, `ai_model`, `is_byok`
**Columnas reales en DB:** `provider`, `model` (y `is_byok` **no existe**)
**Corrección:** aplicada en el código de `sendMessage` del handoff.

### Bug 2 — `user_id` faltante en inserts

`idea_session_messages.user_id` es **NOT NULL** (denormalizado para queries sin JOIN, según CONTEXT.md). Mi código original no lo incluía.
**Corrección:** aplicada — se pasa `DEV_USER_ID` en ambos inserts.

### Bug 3 — Defaults para campos NOT NULL en mensaje de usuario

`provider`, `model`, `tokens_input`, `tokens_output`, `cost_usd` son **NOT NULL**. El mensaje `role='user'` no tiene valores reales para estos, pero tiene que cumplir el NOT NULL.
**Corrección:** aplicada — se pasan:
- `provider` y `model` del provider resuelto (para telemetría consistente)
- `tokens_input=0`, `tokens_output=0`, `cost_usd=0` como defaults explícitos

Esto es coherente con la regla de CONTEXT.md: *"mensajes role='user' llevan tokens/cost en 0, pero provider y model siempre completos"*.

---

## 📋 Migraciones SQL pendientes

### Migración 1 — Campos de descarte en `ideas`

```sql
ALTER TABLE public.ideas
  ADD COLUMN discarded_at   timestamptz NULL,
  ADD COLUMN discard_reason text         NULL;

COMMENT ON COLUMN public.ideas.discarded_at   IS 'Timestamp cuando la idea pasó a status=discarded';
COMMENT ON COLUMN public.ideas.discard_reason IS 'Razón opcional del descarte — útil para retrospectiva';
```

### Migración 2 — Función atómica `promote_idea_to_operando`

Debe hacer en una sola transacción:
1. Verificar que la idea existe, pertenece al usuario, y está en status `construyendo`
2. Verificar que el deep dive tiene los 7 campos completos (excluyendo `ai_notes`)
3. Crear un row en `businesses` (o tabla M3 correspondiente) con el `business_name`
4. Actualizar la idea: `status='operando'`, `promoted_at=now()`
5. Devolver el row actualizado de `ideas` (para que el action haga `mapIdea`)

Diseño detallado y SQL concreto: **pendiente para la próxima sesión** (requiere confirmar esquema exacto de `businesses` en M3).

---

## 📋 Archivos pendientes de diseñar

### `src/modules/ideas/mappers.ts`

Convertidores de DB row → Domain type. Decisiones pendientes sobre cada mapper:

```typescript
export function mapSession(row: IdeaSessionRow): IdeaSession
export function mapIdea(row: IdeaRow): Idea
  // Calcula cents_complete (los 5 scores != null)
export function mapMessage(row: IdeaMessageRow): IdeaMessage
  // Convierte cost_usd string → number
export function mapDeepDive(row: IdeaDeepDiveRow): IdeaDeepDive
  // Calcula fields_completed (0-7) e is_complete (boolean)
```

### `src/modules/ideas/ai/resolver.ts`

`resolveAIProvider(userId)` — puente entre `sendMessage` y la capa `AIProvider`. Flujo:
1. Busca `user_subscriptions` del usuario
2. Si tier sin AI → devuelve error `sin_acceso_ai`
3. Si BYOK → lee key de `user_api_keys` + Vault
4. Si Premium → usa key del sistema (env)
5. Devuelve un `AIProvider` instanciado listo para `.chat()`

### Capa `AIProvider`

Contrato acordado:
```typescript
interface AIProvider {
  provider: 'anthropic' | 'openai' | 'google'
  model:    string
  chat(input: {
    messages: { role: 'user' | 'assistant'; content: string }[]
    system?:  string
  }): Promise<ActionResult<{
    content:          string
    provider:         string
    model:            string
    tokens_input:     number
    tokens_output:    number
    cost_usd:         number
    response_time_ms?: number
  }>>
}
```

---

## 🧭 Punto de partida para la próxima conversación

Abrí una nueva chat en el mismo project y pegá:

> "Seguimos desde HANDOFF_M4_ACTIONS.md. Las 16 server actions están diseñadas. Ahora diseñamos los mappers + las 2 migraciones SQL pendientes (discarded_at + promote_idea_to_operando)."

**Orden sugerido para la próxima sesión:**

1. `mappers.ts` — 4 mappers con lógica de campos derivados
2. Migración 1 — `ALTER TABLE ideas ADD discarded_at, discard_reason`
3. Migración 2 — diseño + SQL de `promote_idea_to_operando()` (requiere ver schema de M3 `businesses`)
4. `resolveAIProvider()` + capa `AIProvider`
5. Handoff final consolidado para Claude Code

---

## 🧪 Reglas de trabajo recordadas

- Paso a paso · preguntar antes de ejecutar
- Contraseña ejecución acelerada: **"al infinito y más allá"**
- Lenguaje aterrizado · en español
- Recomendar nueva conversación cuando el contexto se sature
- Visual-first cuando aplica
- **DEV_USER_ID:** configurado por variables de entorno
- **Supabase project:** configurado por variables de entorno

---

**Final del handoff. Esta conversación cierra aquí.**
