# 🤖 HANDOFF · M4 AI Layer — Fastlane Compass

> **Objetivo:** cerrar la capa AI para que el chat M4 funcione end-to-end para admins (Luis + pareja).
> **Alcance:** solo admins hoy. BYOK / Premium / beta codes → después del jueves.
> **Status previo:** Fases A y B de M4 cerradas. Función SQL `promote_idea_to_operando` aplicada.

---

## ⚠️ DISCREPANCIA CRÍTICA con CONTEXT.md

CONTEXT.md documenta las fases del chat como `discovery / ideation / evaluation / deep_dive` (inglés). **El schema REAL en DB las tiene en español:** `observar / definir / idear / evaluar` (Design Thinking). Verificado con `pg_get_constraintdef` el 20-abr-2026.

**Este handoff usa los nombres CORRECTOS del schema.** Si CONTEXT.md y este handoff difieren en cualquier nombre relacionado a fases del chat, **gana el handoff** (porque está validado contra DB real). Actualizar CONTEXT.md como tarea pendiente.

---

## ⚠️ Reglas no negociables

- Arquitectura `AIProvider` como **interfaz**: hoy solo implementa Anthropic, pero la forma debe permitir sumar OpenAI/Google sin tocar callers.
- **Nunca** llamar directo al SDK desde una action. Siempre a través del resolver.
- Errores del provider → `ActionResult<T>` (patrón ya establecido en el proyecto).
- Admin bypass TODO: no consultar `user_subscriptions`, no consultar `user_api_keys`, no verificar límites. Si `profiles.is_admin=true`, AI activa con env key.
- Tracking en `ai_usage_logs` es **obligatorio** incluso para admin (para visibilidad de costos de Luis).

---

## 📁 Archivos a crear / modificar

```
src/modules/ideas/ai/
├── provider.ts          ← NUEVO · interfaz + AnthropicProvider
├── resolver.ts          ← NUEVO · resolveAIProvider(userId)
└── usage.ts             ← NUEVO · trackUsage() helper

src/modules/ideas/actions/
└── messages.ts          ← MODIFICAR · reemplazar TODO/stub con llamada real
```

---

## 1️⃣ `src/modules/ideas/ai/provider.ts`

**Qué es:** la interfaz común + implementación Anthropic.

**Dependencia:** `npm install @anthropic-ai/sdk` si no está ya instalado (verificar `package.json` antes de instalar).

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { ActionResult } from '@/types/actions';

// ============================================================
// Contrato público — lo que consume el resto del código
// ============================================================

export interface AIProviderChatInput {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
}

export interface AIProviderChatOutput {
  content: string;
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  response_time_ms: number;
}

export interface AIProvider {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  chat(input: AIProviderChatInput): Promise<ActionResult<AIProviderChatOutput>>;
}

// ============================================================
// Implementación Anthropic
// ============================================================

// Precios Claude Sonnet 4.6 (USD por millón de tokens). Verificá en https://docs.claude.com/en/about-claude/pricing si cambiaron.
const PRICE_INPUT_PER_MTOK  = 3.00;
const PRICE_OUTPUT_PER_MTOK = 15.00;
const DEFAULT_MODEL = 'claude-sonnet-4-6';

export class AnthropicProvider implements AIProvider {
  public readonly provider = 'anthropic' as const;
  public readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    if (!apiKey) throw new Error('AnthropicProvider: apiKey requerida');
    this.model = model;
    this.client = new Anthropic({ apiKey });
  }

  async chat(input: AIProviderChatInput): Promise<ActionResult<AIProviderChatOutput>> {
    const t0 = Date.now();

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: input.system,
        messages: input.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      // Extraer texto del primer bloque (Anthropic puede devolver array de content blocks)
      const textBlock = response.content.find(b => b.type === 'text');
      const content = textBlock && 'text' in textBlock ? textBlock.text : '';

      const tokens_input  = response.usage.input_tokens;
      const tokens_output = response.usage.output_tokens;
      const cost_usd =
        (tokens_input  / 1_000_000) * PRICE_INPUT_PER_MTOK +
        (tokens_output / 1_000_000) * PRICE_OUTPUT_PER_MTOK;

      return {
        ok: true,
        data: {
          content,
          provider: 'anthropic',
          model: this.model,
          tokens_input,
          tokens_output,
          cost_usd: Number(cost_usd.toFixed(6)),
          response_time_ms: Date.now() - t0,
        },
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error desconocido llamando a Anthropic';
      return { ok: false, error: `ANTHROPIC_ERROR: ${message}` };
    }
  }
}
```

---

## 2️⃣ `src/modules/ideas/ai/resolver.ts`

**Qué hace:** mira al user y devuelve el provider correcto (o un error).

**Hoy (admin-only):**
- Si `is_admin=true` → AnthropicProvider con env key
- Si no → error `AI_NOT_AVAILABLE`

**Preparado para mañana:** los slots para BYOK y Premium están comentados como TODOs con la lógica exacta.

```typescript
import { createAdminClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/actions';
import { AnthropicProvider, type AIProvider } from './provider';

export async function resolveAIProvider(
  userId: string
): Promise<ActionResult<AIProvider>> {
  const supabase = createAdminClient();

  // 1. Consultar is_admin
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    return { ok: false, error: `USER_NOT_FOUND: ${profileErr?.message ?? userId}` };
  }

  // 2. Admin bypass → env key
  if (profile.is_admin) {
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (!envKey) {
      return {
        ok: false,
        error: 'ANTHROPIC_API_KEY no configurada en el entorno',
      };
    }
    return { ok: true, data: new AnthropicProvider(envKey) };
  }

  // 3. [TODO Fase 2/3] — tier check, BYOK con Vault, Premium con env + límites
  //    Cuando se active, consultar user_subscriptions.tier:
  //      - 'free' → AI_NOT_AVAILABLE
  //      - 'pro_byok' → leer vault_secret_id de user_api_keys, llamar vault.decrypted_secrets
  //      - 'premium' → env key con chequeo de límites contra ai_usage_logs
  //    Todos los providers (Anthropic/OpenAI/Google) se inyectan por tier.

  return { ok: false, error: 'AI_NOT_AVAILABLE' };
}
```

---

## 3️⃣ `src/modules/ideas/ai/usage.ts`

**Qué hace:** UPSERT incremental en `ai_usage_logs` para trackear costo mensual por user/provider/feature.

**Importante:** el UPSERT real necesita **sumar** valores existentes, no reemplazarlos. Hacemos SELECT + INSERT/UPDATE en 2 pasos (Postgres no tiene `ON CONFLICT DO UPDATE SET total = total + EXCLUDED.total` limpio sin CTE).

```typescript
import { createAdminClient } from '@/lib/supabase/server';

export interface TrackUsageInput {
  user_id: string;
  provider: 'anthropic' | 'openai' | 'google';
  feature: string; // 'ideas_chat', 'motor_ai', 'paystub_scan', etc.
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
}

export async function trackUsage(input: TrackUsageInput): Promise<void> {
  const supabase = createAdminClient();
  const year_month = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const now = new Date().toISOString();

  // Fetch fila existente
  const { data: existing } = await supabase
    .from('ai_usage_logs')
    .select('id, total_tokens_input, total_tokens_output, total_cost_usd, request_count')
    .eq('user_id', input.user_id)
    .eq('provider', input.provider)
    .eq('year_month', year_month)
    .eq('feature', input.feature)
    .maybeSingle();

  if (existing) {
    // Incrementar
    await supabase
      .from('ai_usage_logs')
      .update({
        total_tokens_input:  existing.total_tokens_input  + input.tokens_input,
        total_tokens_output: existing.total_tokens_output + input.tokens_output,
        total_cost_usd:      Number(existing.total_cost_usd) + input.cost_usd,
        request_count:       existing.request_count + 1,
        last_request_at:     now,
      })
      .eq('id', existing.id);
  } else {
    // Insertar nueva
    await supabase.from('ai_usage_logs').insert({
      user_id: input.user_id,
      provider: input.provider,
      year_month,
      feature: input.feature,
      total_tokens_input: input.tokens_input,
      total_tokens_output: input.tokens_output,
      total_cost_usd: input.cost_usd,
      request_count: 1,
      last_request_at: now,
    });
  }
}
```

**Nota:** `trackUsage` no devuelve error ni bloquea. Si el tracking falla, no queremos reventar el chat del user. Logear a consola es suficiente por ahora (Claude Code puede envolver en try/catch si lo ve necesario).

---

## 4️⃣ Modificar `src/modules/ideas/actions/messages.ts`

**Estado actual:** ya existe `sendMessage` compilable pero con stub donde debería llamar al AIProvider.

**Flujo correcto:**

```typescript
// Pseudocódigo del flujo dentro de sendMessage (mantener la firma existente):

// 1. Validar input + obtener session + insertar user message (esto ya existe)
// 2. NUEVO: resolver provider
const providerResult = await resolveAIProvider(userId);
if (!providerResult.ok) {
  // Rollback o marcar el user message pero NO intentar AI
  return { ok: false, error: providerResult.error };
}
const provider = providerResult.data;

// 3. Fetch histórico SOLO de la fase activa (control de tokens — decisión ya tomada en M4)
const { data: phaseMessages } = await supabase
  .from('idea_session_messages')
  .select('role, content')
  .eq('session_id', sessionId)
  .eq('phase', phase)
  .order('sequence_order', { ascending: true });

// 4. Construir system prompt según fase
const systemPrompt = buildSystemPromptForPhase(phase); // helper interno

// 5. Llamar al provider
const chatResult = await provider.chat({
  system: systemPrompt,
  messages: phaseMessages.map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
});
if (!chatResult.ok) return { ok: false, error: chatResult.error };

// 6. Insertar assistant message con los campos BYOK poblados del provider
const { data: assistantMessage } = await supabase
  .from('idea_session_messages')
  .insert({
    session_id: sessionId,
    user_id: userId,
    role: 'assistant',
    content: chatResult.data.content,
    phase,
    sequence_order: nextSequenceOrder,
    provider: chatResult.data.provider,
    model: chatResult.data.model,
    tokens_input: chatResult.data.tokens_input,
    tokens_output: chatResult.data.tokens_output,
    cost_usd: chatResult.data.cost_usd,
    response_time_ms: chatResult.data.response_time_ms,
  })
  .select()
  .single();

// 7. Track usage (fire-and-forget, no await crítico)
await trackUsage({
  user_id: userId,
  provider: chatResult.data.provider,
  feature: 'ideas_chat',
  tokens_input: chatResult.data.tokens_input,
  tokens_output: chatResult.data.tokens_output,
  cost_usd: chatResult.data.cost_usd,
});

// 8. Return ambos mapeados con mapMessage
return { ok: true, data: { userMessage: mapMessage(userMsgRaw), assistantMessage: mapMessage(assistantMessage) } };
```

**System prompts por fase** (usar como base, refinar con uso real). **Importante:** las fases del schema están en español (Design Thinking): `observar`, `definir`, `idear`, `evaluar`. NO usar nombres en inglés — el CHECK constraint los rechaza.

```typescript
const SYSTEM_PROMPTS: Record<string, string> = {
  observar: `Eres un coach de emprendimiento. Estamos en fase de OBSERVAR.
El usuario no sabe qué negocio iniciar. Hacé preguntas cortas (una a la vez)
sobre sus skills, pasiones, problemas que observa en su entorno, qué hace bien.
Después de 4-5 turnos, sugerí pasar a DEFINIR el problema concreto.
Hablá en español, tono cercano, sin jerga de startups.`,

  definir: `Eres un coach de emprendimiento. Estamos en fase de DEFINIR.
El usuario tiene observaciones o una idea vaga. Ayudalo a delimitar:
¿qué problema concreto resuelve? ¿a quién? ¿en qué contexto?
Una pregunta por vez. Cuando esté claro, sugerí pasar a IDEAR soluciones.`,

  idear: `Eres un coach de emprendimiento. Estamos en fase de IDEAR.
El problema está definido. Tu rol: proponer 2-3 ideas concretas de negocio
con título + concepto en 1 frase. Después preguntale cuál le resuena más
para pasarla a EVALUAR con CENTS.`,

  evaluar: `Eres un coach de emprendimiento experto en el framework CENTS.
El usuario ya tiene una idea clara. Cuando te pregunte, sugerí scores
del 1 al 10 para Control/Entry/Need/Time/Scale con justificación breve.
Hablá en español, sin vocabulario del framework literal,
usá anclas concretas (ej: "¿qué tan fácil es para alguien copiarte mañana?
Si es muy fácil = bajo").`,
};

function buildSystemPromptForPhase(phase: string): string {
  return SYSTEM_PROMPTS[phase] ?? SYSTEM_PROMPTS.observar;
}
```

**Nota sobre Deep Dive:** NO es una fase de chat — el deep dive se llena vía formulario en la tabla `idea_deep_dives` (acción `upsertDeepDiveField`). El chat M4 termina en fase `evaluar`. Después la UI muestra los 7 campos del plan como inputs separados.

---

## 5️⃣ Variables de entorno

**Agregar en `.env.local`:**

```
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Agregar también en Vercel:**
Settings → Environment Variables → `ANTHROPIC_API_KEY` (production + preview + development).

**Cómo obtenerla:** [console.anthropic.com](https://console.anthropic.com) → Settings → API Keys → Create Key.
El usuario (Luis) necesita haber cargado créditos. Sonnet 4 es el default; Haiku es 10x más barato si se quiere reducir costos.

---

## 6️⃣ Promover idea a operando · usar la función SQL

La acción `promoteToOperando` (ya existe en `actions/transitions.ts`) debe llamar a la función vía RPC:

```typescript
const { data, error } = await supabase.rpc('promote_idea_to_operando', {
  p_idea_id: ideaId,
  p_user_id: userId,
  p_business_name: businessName,
});

if (error) {
  // Los errores vienen como SQLSTATE P0001 con MESSAGE estructurado.
  // Parsear error.message para extraer el código:
  //   'IDEA_NOT_FOUND'
  //   'NOT_OWNER'
  //   'INVALID_STATUS:<status>'
  //   'INVALID_BUSINESS_NAME'
  //   'MISSING_BUSINESS_MODEL'
  //   'MISSING_CENTS_SCORES:control,need' (lista de los faltantes)
  //   'MISSING_DEEP_DIVE'
  //   'MISSING_DEEP_DIVE_FIELDS:market_analysis,first_steps' (lista)
  return { ok: false, error: error.message };
}

// data es el row completo de 'ideas' ya actualizado a status='operando'
return { ok: true, data: mapIdea(data) };
```

El frontend puede después mostrar UX contextual por cada código (ver sección "UX errores" en `HANDOFF_M4_UI.md`).

---

## ✅ Criterios de done

1. `npm run type-check` pasa (solo los 2 errores M2 pre-existentes permitidos)
2. `npm run build` pasa
3. Con `ANTHROPIC_API_KEY` puesta en `.env.local`, la pantalla de chat M4 responde con texto real de Claude
4. Una fila nueva aparece en `ai_usage_logs` después del primer mensaje
5. Promover una idea con todos los campos completos crea un row en `businesses` Y cambia `ideas.status` a `operando`
6. Promover una idea incompleta devuelve error estructurado parseable

---

## 📝 Notas finales

- **No implementar hoy:** BYOK UI, código de invitación, lista de espera, Stripe, Premium. Todo eso es post-jueves.
- **Modelo de Claude:** El default es **Sonnet 4.6** ($3 input / $15 output por millón de tokens). Si querés abaratar 3x, cambiar `DEFAULT_MODEL` a `'claude-haiku-4-5-20251001'` (Haiku 4.5: $1/$5 por MTok). Para tu caso (2 users, chat de evaluación de ideas), Sonnet es la mejor relación calidad/precio. Haiku puede sentirse más superficial pero baja el costo. Opus 4.7 está disponible si querés calidad máxima ($5/$25), pero es overkill para esto.
- **Pricing:** los precios cambian. Si Claude Code detecta diferencia entre lo facturado y lo logueado en `ai_usage_logs`, verificar [docs.claude.com/en/about-claude/pricing](https://docs.claude.com/en/about-claude/pricing) y actualizar las constantes `PRICE_INPUT_PER_MTOK` y `PRICE_OUTPUT_PER_MTOK`.
- **Si algo falla en runtime:** empezá chequeando la env var y luego `ai_usage_logs` (debería poblarse después del primer call exitoso).
