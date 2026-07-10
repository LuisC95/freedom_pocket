'use server'

// Actualización de saldos desde capturas de pantalla (bancos / tarjetas).
// 1. scanAccountBalances: Gemini detecta cuentas+saldos y sugiere el match
//    contra las cuentas de liquidez y pasivos existentes.
// 2. applyBalanceSnapshot: aplica los cambios confirmados por el usuario.
//    - Cuenta bancaria → adjustLiquidityBalance (movimiento 'manual_adjustment')
//    - Pasivo/tarjeta → transacción de ajuste (excluida de métricas) + update del balance

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { getDevUserId } from '@/lib/dev-user'
import { getHouseholdScope } from '@/lib/household'
import { adjustLiquidityBalance, getLiquidityAccounts } from '@/lib/liquidity'
import { geminiVisionJson, type VisionImage } from '@/lib/ai/gemini'

export interface BalanceCandidate {
  kind: 'asset' | 'liability'
  id: string
  name: string
  institution: string | null
  detail: string // ej. "Banco · USD" o "Tarjeta de crédito"
  current_balance: number
  currency: string
}

export interface DetectedBalance {
  label: string
  last4: string | null
  account_kind: 'bank' | 'credit_card' | 'other'
  balance: number
  currency: string | null
  match_kind: 'asset' | 'liability' | null
  match_id: string | null
  match_confidence: 'high' | 'medium' | 'low'
  warning: string | null
}

export interface BalanceScanResult {
  detected: DetectedBalance[]
  candidates: BalanceCandidate[]
  warnings: string[]
}

const LIABILITY_TYPE_HINTS: Record<string, string> = {
  credit_card: 'Tarjeta de crédito',
  mortgage: 'Hipoteca',
  car: 'Préstamo auto',
  student_loan: 'Préstamo estudiantil',
  personal_loan: 'Préstamo personal',
  other: 'Deuda',
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function asBalance(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[$,\s]/g, '')) : typeof v === 'number' ? v : NaN
  if (!Number.isFinite(n) || n < 0 || n >= 1_000_000_000) return null
  return round2(n)
}

async function getBalanceCandidates(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<BalanceCandidate[]> {
  const scope = await getHouseholdScope(supabase, userId)
  const visibleUserIds = scope.householdId ? scope.memberUserIds : [userId]

  const [liquidityAccounts, { data: liabilities }] = await Promise.all([
    getLiquidityAccounts(supabase, userId, true),
    supabase
      .from('liabilities')
      .select('id, name, liability_type, current_balance, currency, is_active')
      .in('user_id', visibleUserIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ])

  const assetCandidates: BalanceCandidate[] = liquidityAccounts.map(account => ({
    kind: 'asset',
    id: account.id,
    name: account.name,
    institution: account.institution,
    detail: `${account.liquidity_kind === 'cash' ? 'Efectivo' : 'Cuenta bancaria'} · ${account.currency}`,
    current_balance: account.current_value,
    currency: account.currency,
  }))

  const liabilityCandidates: BalanceCandidate[] = (liabilities ?? []).map(l => ({
    kind: 'liability',
    id: l.id,
    name: l.name,
    institution: null,
    detail: `${LIABILITY_TYPE_HINTS[l.liability_type] ?? 'Deuda'} · ${l.currency ?? 'USD'}`,
    current_balance: Number(l.current_balance),
    currency: l.currency ?? 'USD',
  }))

  return [...assetCandidates, ...liabilityCandidates]
}

interface RawDetectedAccount {
  label?: unknown
  last4?: unknown
  account_kind?: unknown
  balance?: unknown
  currency?: unknown
  match?: unknown
  match_confidence?: unknown
  warning?: unknown
}

interface RawBalanceScan {
  error?: string
  accounts?: unknown
  warnings?: unknown
}

export async function scanAccountBalances(
  images: VisionImage[]
): Promise<{ data: BalanceScanResult | null; error: string | null }> {
  const userId = await getDevUserId()
  const supabase = createAdminClient()

  const candidates = await getBalanceCandidates(supabase, userId)
  if (candidates.length === 0) {
    return { data: null, error: 'No tienes cuentas de liquidez ni pasivos activos para actualizar' }
  }

  const candidateList = candidates
    .map(c => `- ${c.kind}:${c.id} — "${c.name}"${c.institution && c.institution !== c.name ? ` (${c.institution})` : ''} [${c.detail}]`)
    .join('\n')

  const prompt = `Eres un extractor de saldos desde capturas de pantalla de apps bancarias y dashboards de tarjetas de crédito.
Analiza la(s) imagen(es) y responde SOLO con un objeto JSON con esta forma exacta:
{
  "accounts": [{
    "label": string,
    "last4": string | null,
    "account_kind": "bank" | "credit_card" | "other",
    "balance": number,
    "currency": string | null,
    "match": string | null,
    "match_confidence": "high" | "medium" | "low",
    "warning": string | null
  }],
  "warnings": [string]
}

Reglas:
- Extrae CADA cuenta o tarjeta visible con su saldo. "label" es el nombre tal como aparece en pantalla; "last4" son los últimos 4 dígitos si se ven.
- Para cuentas bancarias: "balance" es el saldo actual/disponible de la cuenta.
- Para tarjetas de crédito: "balance" es el SALDO ACTUAL ADEUDADO (current balance / saldo al corte). NUNCA uses el crédito disponible, el límite, ni el pago mínimo. Si solo se ve el crédito disponible y no el saldo adeudado, omite esa tarjeta y agrégalo a "warnings".
- "currency": código ISO 4217 inferido por símbolo/idioma (USD, MXN, EUR...). null si no es claro.
- "match": el identificador EXACTO (ej. "asset:uuid" o "liability:uuid") de la cuenta registrada que corresponde, elegido SOLO de esta lista, o null si ninguna corresponde:
${candidateList}
- "match_confidence": qué tan seguro es el match (por nombre, institución o últimos 4 dígitos).
- "warning": nota breve en español si el saldo es ambiguo o parcialmente ilegible.
- Si las imágenes no muestran cuentas bancarias ni tarjetas, responde {"error": "no_accounts"}.`

  const result = await geminiVisionJson<RawBalanceScan>({ prompt, images, maxOutputTokens: 8192 })
  if (result.error || !result.data) {
    return { data: null, error: result.error ?? 'No se pudo analizar la captura' }
  }

  const raw = result.data
  if (raw.error === 'no_accounts') {
    return { data: null, error: 'No se detectaron cuentas bancarias ni tarjetas en la captura' }
  }

  const candidateByRef = new Map(candidates.map(c => [`${c.kind}:${c.id}`, c]))

  const detected: DetectedBalance[] = (Array.isArray(raw.accounts) ? raw.accounts : [])
    .slice(0, 20)
    .map((item: unknown) => {
      const obj = (item ?? {}) as RawDetectedAccount
      const balance = asBalance(obj.balance)
      if (balance === null) return null

      const matchRef = typeof obj.match === 'string' ? obj.match.trim() : null
      const matched = matchRef ? candidateByRef.get(matchRef) ?? null : null

      const currencyRaw = typeof obj.currency === 'string' ? obj.currency.trim().toUpperCase() : null
      const last4Raw = typeof obj.last4 === 'string' ? obj.last4.replace(/\D/g, '').slice(-4) : ''

      const accountKind = obj.account_kind === 'bank' || obj.account_kind === 'credit_card'
        ? obj.account_kind
        : 'other'

      return {
        label: (typeof obj.label === 'string' && obj.label.trim() ? obj.label.trim() : 'Cuenta detectada').slice(0, 80),
        last4: last4Raw.length === 4 ? last4Raw : null,
        account_kind: accountKind,
        balance,
        currency: currencyRaw && /^[A-Z]{3}$/.test(currencyRaw) ? currencyRaw : null,
        match_kind: matched?.kind ?? null,
        match_id: matched?.id ?? null,
        match_confidence: obj.match_confidence === 'high' || obj.match_confidence === 'low'
          ? obj.match_confidence
          : 'medium',
        warning: typeof obj.warning === 'string' && obj.warning.trim() ? obj.warning.trim().slice(0, 160) : null,
      } satisfies DetectedBalance
    })
    .filter((d): d is DetectedBalance => d !== null)

  if (detected.length === 0) {
    return { data: null, error: 'No se pudo leer ningún saldo en la captura. Intenta con una imagen más clara.' }
  }

  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : [])
    .filter((w): w is string => typeof w === 'string' && w.trim().length > 0)
    .map(w => w.trim().slice(0, 160))
    .slice(0, 5)

  return { data: { detected, candidates, warnings }, error: null }
}

// ─── Aplicar snapshot confirmado ──────────────────────────────────────────────

export interface BalanceUpdateInput {
  kind: 'asset' | 'liability'
  id: string
  new_balance: number
  detected_label?: string | null
}

export interface BalanceApplyResult {
  applied: number
  skipped: number
  errors: string[]
}

export async function applyBalanceSnapshot(
  updates: BalanceUpdateInput[]
): Promise<{ data: BalanceApplyResult | null; error: string | null }> {
  if (!updates.length) return { data: null, error: 'No hay cambios para aplicar' }
  if (updates.length > 20) return { data: null, error: 'Demasiados cambios en una sola operación' }

  const userId = await getDevUserId()
  const supabase = createAdminClient()
  const scope = await getHouseholdScope(supabase, userId)
  const visibleUserIds = scope.householdId ? scope.memberUserIds : [userId]

  const result: BalanceApplyResult = { applied: 0, skipped: 0, errors: [] }
  const today = new Date().toISOString().slice(0, 10)

  // Las transacciones de ajuste de pasivos requieren period_id y category_id (NOT NULL).
  // Usamos el período activo del usuario y una categoría de sistema como marcadores.
  const [{ data: activePeriod }, { data: fallbackCategory }] = await Promise.all([
    supabase
      .from('periods')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('transaction_categories')
      .select('id')
      .in('applies_to', ['expense', 'both'])
      .is('user_id', null)
      .limit(1)
      .maybeSingle(),
  ])

  for (const update of updates) {
    const newBalance = asBalance(update.new_balance)
    if (newBalance === null) {
      result.errors.push(`Saldo inválido para ${update.detected_label ?? update.id}`)
      continue
    }
    const labelSuffix = update.detected_label ? ` — ${update.detected_label}` : ''

    if (update.kind === 'asset') {
      const { data: asset } = await supabase
        .from('assets')
        .select('id, name, current_value, currency, is_active, is_liquid, liquidity_kind')
        .eq('id', update.id)
        .in('user_id', visibleUserIds)
        .maybeSingle()

      if (!asset || !asset.is_active) {
        result.errors.push(`Cuenta no encontrada${labelSuffix}`)
        continue
      }
      if (!asset.is_liquid || !asset.liquidity_kind) {
        result.errors.push(`${asset.name} no es una cuenta de liquidez`)
        continue
      }

      const delta = round2(newBalance - Number(asset.current_value))
      if (Math.abs(delta) < 0.005) {
        result.skipped++
        continue
      }

      const adjust = await adjustLiquidityBalance(supabase, {
        assetId: asset.id,
        currentUserId: userId,
        delta,
        movementType: 'manual_adjustment',
        currency: asset.currency ?? 'USD',
        allowCash: true,
        notes: `Ajuste por captura: ${Number(asset.current_value).toFixed(2)} → ${newBalance.toFixed(2)}${labelSuffix}`,
      })
      if (adjust.error) {
        result.errors.push(`${asset.name}: ${adjust.error}`)
        continue
      }
      result.applied++
      continue
    }

    // ── Pasivo (tarjeta de crédito / deuda) ─────────────────────────────────
    const { data: liability } = await supabase
      .from('liabilities')
      .select('id, name, current_balance, currency, is_active')
      .eq('id', update.id)
      .in('user_id', visibleUserIds)
      .maybeSingle()

    if (!liability || !liability.is_active) {
      result.errors.push(`Pasivo no encontrado${labelSuffix}`)
      continue
    }

    const oldBalance = Number(liability.current_balance)
    const delta = round2(newBalance - oldBalance)
    if (Math.abs(delta) < 0.005) {
      result.skipped++
      continue
    }

    // Transacción de ajuste: deja rastro en el historial de la tarjeta sin
    // afectar métricas de gasto (exclude_from_metrics). El balance se setea aparte.
    if (!activePeriod) {
      result.errors.push(`${liability.name}: no hay período activo para registrar el ajuste`)
      continue
    }
    if (!fallbackCategory) {
      result.errors.push(`${liability.name}: no se encontró una categoría disponible`)
      continue
    }

    const sign = delta > 0 ? '+' : '−'
    const { data: txRow, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        period_id: activePeriod.id,
        category_id: fallbackCategory.id,
        type: 'expense',
        amount: Math.abs(delta),
        currency: liability.currency ?? 'USD',
        transaction_date: today,
        payment_source: 'credit_card',
        liability_id: liability.id,
        liquidity_asset_id: null,
        exclude_from_metrics: true,
        status: 'confirmed',
        notes: `Ajuste de saldo por captura: ${sign}${Math.abs(delta).toFixed(2)} (${oldBalance.toFixed(2)} → ${newBalance.toFixed(2)})${labelSuffix}`,
      })
      .select('id')
      .single()

    if (txError) {
      result.errors.push(`${liability.name}: ${txError.message}`)
      continue
    }

    const { error: updateError } = await supabase
      .from('liabilities')
      .update({
        current_balance: newBalance,
        balance_in_usd: (liability.currency ?? 'USD') === 'USD' ? newBalance : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', liability.id)

    if (updateError) {
      await supabase.from('transactions').delete().eq('id', txRow.id)
      result.errors.push(`${liability.name}: ${updateError.message}`)
      continue
    }
    result.applied++
  }

  if (result.applied > 0) {
    revalidatePath('/brujula')
    revalidatePath('/dashboard')
  }

  return { data: result, error: null }
}
