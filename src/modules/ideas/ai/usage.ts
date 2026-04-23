import { createAdminClient } from '@/lib/supabase/server';
import { normalizeProviderForStorage, type SupportedAIProvider } from './provider';

export interface TrackUsageInput {
  user_id: string;
  provider: SupportedAIProvider;
  feature: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
}

export async function trackUsage(input: TrackUsageInput): Promise<void> {
  try {
    const supabase = createAdminClient();
    const provider = normalizeProviderForStorage(input.provider);
    const year_month = new Date().toISOString().slice(0, 7);
    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from('ai_usage_logs')
      .select('id, total_tokens_input, total_tokens_output, total_cost_usd, request_count')
      .eq('user_id', input.user_id)
      .eq('provider', provider)
      .eq('year_month', year_month)
      .eq('feature', input.feature)
      .maybeSingle();

    if (existing) {
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
      await supabase.from('ai_usage_logs').insert({
        user_id: input.user_id,
        provider,
        year_month,
        feature: input.feature,
        total_tokens_input: input.tokens_input,
        total_tokens_output: input.tokens_output,
        total_cost_usd: input.cost_usd,
        request_count: 1,
        last_request_at: now,
      });
    }
  } catch (err) {
    console.error('[trackUsage] error logging AI usage:', err);
  }
}
