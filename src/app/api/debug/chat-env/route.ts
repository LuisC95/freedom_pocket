// GET /api/debug/chat-env
// Diagnóstico: muestra qué env vars están disponibles y si Supabase responde.
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Env vars (nunca expongo valores completos, solo si existen)
  results.env_vars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    GOOGLE_AI_KEY: !!process.env.GOOGLE_AI_KEY,
    DEV_ACCESS_PIN_LUIS: !!process.env.DEV_ACCESS_PIN_LUIS,
    DEV_USER_ID_LUIS: !!process.env.DEV_USER_ID_LUIS,
    // Legacy
    DEV_ACCESS_PIN: !!process.env.DEV_ACCESS_PIN,
    DEV_USER_ID: !!process.env.DEV_USER_ID,
    IDEAS_AI_PROVIDER: process.env.IDEAS_AI_PROVIDER ?? '(not set)',
  }

  // 2. Test Supabase admin client
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    results.supabase_test = {
      ok: !error,
      error: error ? { code: error.code, message: error.message, details: error.details } : null,
      has_data: (data ?? []).length > 0,
    }
  } catch (e) {
    results.supabase_test = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }

  // 3. Test ideas table
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ideas')
      .select('id, title, status')
      .limit(3)

    results.ideas_test = {
      ok: !error,
      count: (data ?? []).length,
      error: error ? { code: error.code, message: error.message } : null,
      sample: data ?? [],
    }
  } catch (e) {
    results.ideas_test = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }

  // 4. Test idea_sessions table
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('idea_sessions')
      .select('id, status, current_phase')
      .limit(3)

    results.sessions_test = {
      ok: !error,
      count: (data ?? []).length,
      error: error ? { code: error.code, message: error.message } : null,
      sample: data ?? [],
    }
  } catch (e) {
    results.sessions_test = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }

  return NextResponse.json(results)
}
