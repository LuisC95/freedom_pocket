import { createAdminClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/types/actions';
import {
  AnthropicProvider,
  DeepSeekProvider,
  type AIProvider,
  type SupportedAIProvider,
} from './provider';

function resolveAdminProviderFromEnv(): ActionResult<AIProvider> {
  const configuredProvider =
    (process.env.IDEAS_AI_PROVIDER ??
      process.env.MOTOR_AI_PROVIDER ??
      'anthropic') as SupportedAIProvider;

  switch (configuredProvider) {
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return {
          ok: false,
          error: 'ANTHROPIC_API_KEY no configurada en el entorno',
        };
      }

      return {
        ok: true,
        data: new AnthropicProvider(
          apiKey,
          process.env.ANTHROPIC_MODEL || undefined
        ),
      };
    }

    case 'deepseek': {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return {
          ok: false,
          error: 'DEEPSEEK_API_KEY no configurada en el entorno',
        };
      }

      return {
        ok: true,
        data: new DeepSeekProvider(
          apiKey,
          process.env.DEEPSEEK_MODEL || undefined,
          process.env.DEEPSEEK_BASE_URL || undefined
        ),
      };
    }

    case 'openai':
    case 'google':
      return {
        ok: false,
        error: `Provider ${configuredProvider} todavía no implementado en ideas`,
      };

    default:
      return {
        ok: false,
        error: `IDEAS_AI_PROVIDER inválido: ${configuredProvider}`,
      };
  }
}

export async function resolveAIProvider(
  userId: string
): Promise<ActionResult<AIProvider>> {
  const supabase = createAdminClient();

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    return { ok: false, error: `USER_NOT_FOUND: ${profileErr?.message ?? userId}` };
  }

  if (profile.is_admin) {
    return resolveAdminProviderFromEnv();
  }

  // [TODO Fase 2/3] — tier check, BYOK con Vault, Premium con env + límites
  //   Cuando se active, consultar user_subscriptions.tier:
  //     - 'free' → AI_NOT_AVAILABLE
  //     - 'pro_byok' → leer vault_secret_id de user_api_keys, llamar vault.decrypted_secrets
  //     - 'premium' → env key con chequeo de límites contra ai_usage_logs

  return { ok: false, error: 'AI_NOT_AVAILABLE' };
}
