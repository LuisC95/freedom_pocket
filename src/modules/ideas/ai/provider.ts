import Anthropic from '@anthropic-ai/sdk';
import type { ActionResult } from '@/types/actions';
import { assertServerRuntime } from '@/lib/assert-server-runtime';

assertServerRuntime('ideas/ai/provider');

export type SupportedAIProvider = 'anthropic' | 'openai' | 'google' | 'deepseek';

export interface AIProviderChatInput {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
}

export interface AIProviderChatOutput {
  content: string;
  provider: SupportedAIProvider;
  model: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  response_time_ms: number;
}

export interface AIProvider {
  provider: SupportedAIProvider;
  model: string;
  chat(input: AIProviderChatInput): Promise<ActionResult<AIProviderChatOutput>>;
}

export function normalizeProviderForStorage(
  provider: SupportedAIProvider
): Exclude<SupportedAIProvider, 'deepseek'> | 'openai' {
  // Compatibilidad temporal con schemas legacy que validan provider contra
  // anthropic/openai/google. DeepSeek usa API OpenAI-compatible y el modelo
  // real sigue persistido en `model` (ej. deepseek-chat).
  if (provider === 'deepseek') return 'openai';
  return provider;
}

// Precios Claude Sonnet 4.6 (USD por millón de tokens)
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
      console.error('[AnthropicProvider]', err);
      return { ok: false, error: 'AI_PROVIDER_ERROR' };
    }
  }
}

interface DeepSeekChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
  error?: {
    message?: string;
  };
}

// Precios DeepSeek Chat (USD por millón de tokens, consultados 23-abr-2026).
// Si DeepSeek cambia precios, conviene actualizar estos valores.
const DEEPSEEK_PRICE_INPUT_CACHE_HIT_PER_MTOK = 0.07;
const DEEPSEEK_PRICE_INPUT_CACHE_MISS_PER_MTOK = 0.27;
const DEEPSEEK_PRICE_OUTPUT_PER_MTOK = 1.10;
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-chat';
const DEEPSEEK_DEFAULT_BASE_URL = 'https://api.deepseek.com';

export class DeepSeekProvider implements AIProvider {
  public readonly provider = 'deepseek' as const;
  public readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    apiKey: string,
    model: string = DEEPSEEK_DEFAULT_MODEL,
    baseUrl: string = DEEPSEEK_DEFAULT_BASE_URL
  ) {
    if (!apiKey) throw new Error('DeepSeekProvider: apiKey requerida');
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async chat(input: AIProviderChatInput): Promise<ActionResult<AIProviderChatOutput>> {
    const t0 = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          messages: [
            ...(input.system
              ? [{ role: 'system' as const, content: input.system }]
              : []),
            ...input.messages,
          ],
        }),
      });

      const payload = (await response.json()) as DeepSeekChatCompletionResponse;

      if (!response.ok) {
        console.error('[DeepSeekProvider]', payload.error ?? response.status);
        return { ok: false, error: 'AI_PROVIDER_ERROR' };
      }

      const rawContent = payload.choices?.[0]?.message?.content;
      const content = Array.isArray(rawContent)
        ? rawContent
            .filter(block => block.type === 'text' && typeof block.text === 'string')
            .map(block => block.text)
            .join('\n')
        : (rawContent ?? '');

      const promptCacheHitTokens = payload.usage?.prompt_cache_hit_tokens ?? 0;
      const promptCacheMissTokens =
        payload.usage?.prompt_cache_miss_tokens ??
        Math.max((payload.usage?.prompt_tokens ?? 0) - promptCacheHitTokens, 0);
      const tokens_input = payload.usage?.prompt_tokens ?? 0;
      const tokens_output = payload.usage?.completion_tokens ?? 0;
      const cost_usd =
        (promptCacheHitTokens / 1_000_000) * DEEPSEEK_PRICE_INPUT_CACHE_HIT_PER_MTOK +
        (promptCacheMissTokens / 1_000_000) * DEEPSEEK_PRICE_INPUT_CACHE_MISS_PER_MTOK +
        (tokens_output / 1_000_000) * DEEPSEEK_PRICE_OUTPUT_PER_MTOK;

      return {
        ok: true,
        data: {
          content,
          provider: 'deepseek',
          model: this.model,
          tokens_input,
          tokens_output,
          cost_usd: Number(cost_usd.toFixed(6)),
          response_time_ms: Date.now() - t0,
        },
      };
    } catch (err: unknown) {
      console.error('[DeepSeekProvider]', err);
      return { ok: false, error: 'AI_PROVIDER_ERROR' };
    }
  }
}
