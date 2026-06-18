'use server'

// Escaneo de facturas/recibos con Gemini Vision → datos para pre-llenar
// el formulario de nueva transacción (el usuario siempre revisa antes de guardar).

import { getDevUserId } from '@/lib/dev-user'
import { geminiVisionJson, type VisionImage } from '@/lib/ai/gemini'
import { getCategories } from './index'

export interface ReceiptScanItem {
  description: string
  quantity: number | null
  amount: number | null
}

export interface ReceiptScanResult {
  merchant: string | null
  transaction_date: string | null
  total: number | null
  currency: string | null
  category_id: string | null
  category_name: string | null
  items: ReceiptScanItem[]
  confidence: 'high' | 'medium' | 'low'
  warnings: string[]
  payment_source: 'cash_debit' | 'credit_card' | null
  matched_card_id: string | null
}

interface RawReceipt {
  error?: string
  merchant?: unknown
  transaction_date?: unknown
  total?: unknown
  currency?: unknown
  category_id?: unknown
  items?: unknown
  confidence?: unknown
  warnings?: unknown
  payment_source?: unknown
  matched_card_id?: unknown
}

function asCleanString(v: unknown, maxLen = 120): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, maxLen) : null
}

function asAmount(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN
  if (!Number.isFinite(n) || n <= 0 || n >= 1_000_000_000) return null
  return Math.round(n * 100) / 100
}

export async function scanReceipt(
  images: VisionImage[],
  creditCards: Array<{ id: string; name: string; currency: string }> = []
): Promise<{ data: ReceiptScanResult | null; error: string | null }> {
  await getDevUserId() // exige sesión activa antes de gastar tokens

  const categories = await getCategories('expense')
  const categoryList = categories
    .map(c => `- ${c.id} — ${c.name}`)
    .join('\n')

  const cardList = creditCards.length > 0
    ? creditCards.map(c => `- ${c.id} — "${c.name}" [${c.currency}]`).join('\n')
    : '- (ninguna registrada)'

  const today = new Date().toISOString().slice(0, 10)

  const prompt = `Eres un extractor de datos de facturas y recibos de compra.
Analiza la(s) imagen(es) y responde SOLO con un objeto JSON con esta forma exacta:
{
  "merchant": string | null,
  "transaction_date": string | null,
  "total": number | null,
  "currency": string | null,
  "category_id": string | null,
  "items": [{ "description": string, "quantity": number | null, "amount": number | null }],
  "confidence": "high" | "medium" | "low",
  "warnings": [string],
  "payment_source": "cash_debit" | "credit_card" | null,
  "matched_card_id": string | null
}

Reglas:
- "total": el importe FINAL cobrado (después de impuestos, descuentos y propina). Si hay varios montos, usa el etiquetado como Total / Total a pagar.
- "transaction_date": fecha de la compra en formato YYYY-MM-DD. Hoy es ${today}; si la fecha es ambigua (ej. 03/04), usa el formato del país del comercio. null si no se ve.
- "currency": código ISO 4217 (USD, MXN, EUR, COP, ARS...). Infiérelo por símbolo, idioma o país del comercio. null si no es claro.
- "category_id": elige el id de la categoría que mejor describa la compra, SOLO de esta lista (o null si ninguna aplica):
${categoryList || '- (sin categorías disponibles)'}
- "items": las líneas de la compra. "amount" es el precio total de esa línea. Máximo 25 items; si hay más, agrupa los menores en "Otros".
- "warnings": notas breves en español si algo es ilegible o dudoso.
- "payment_source": "credit_card" si la factura muestra pago con tarjeta (Visa, Mastercard, Amex, débito con últimos 4 dígitos visibles, o leyenda "Tarjeta"/"Card"). "cash_debit" si dice Efectivo/Cash. null si no se puede determinar.
- "matched_card_id": si payment_source es "credit_card", elige el id EXACTO de la tarjeta registrada que corresponde según nombre, banco o últimos 4 dígitos, SOLO de esta lista (o null si ninguna coincide):
${cardList}
- Si la imagen NO es una factura o recibo de compra, responde {"error": "not_receipt"}.`

  const result = await geminiVisionJson<RawReceipt>({ prompt, images })
  if (result.error || !result.data) {
    return { data: null, error: result.error ?? 'No se pudo analizar la factura' }
  }

  const raw = result.data
  if (raw.error === 'not_receipt') {
    return { data: null, error: 'La imagen no parece una factura o recibo de compra' }
  }

  // Validación defensiva de todo lo que devuelve el modelo
  const validCategoryIds = new Set(categories.map(c => c.id))
  const categoryId =
    typeof raw.category_id === 'string' && validCategoryIds.has(raw.category_id)
      ? raw.category_id
      : null

  const dateStr = asCleanString(raw.transaction_date, 10)
  const transactionDate =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr))
      ? dateStr
      : null

  const currencyStr = asCleanString(raw.currency, 3)
  const currency = currencyStr && /^[A-Z]{3}$/.test(currencyStr.toUpperCase())
    ? currencyStr.toUpperCase()
    : null

  const items: ReceiptScanItem[] = (Array.isArray(raw.items) ? raw.items : [])
    .slice(0, 25)
    .map((it: unknown) => {
      const obj = (it ?? {}) as Record<string, unknown>
      const qty = typeof obj.quantity === 'number' && Number.isFinite(obj.quantity) && obj.quantity > 0
        ? Math.round(obj.quantity * 100) / 100
        : null
      return {
        description: asCleanString(obj.description, 80) ?? 'Artículo',
        quantity: qty,
        amount: asAmount(obj.amount),
      }
    })
    .filter(it => it.description !== 'Artículo' || it.amount !== null)

  const confidence: ReceiptScanResult['confidence'] =
    raw.confidence === 'high' || raw.confidence === 'low' ? raw.confidence : 'medium'

  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : [])
    .map(w => asCleanString(w, 160))
    .filter((w): w is string => w !== null)
    .slice(0, 5)

  const paymentSource: ReceiptScanResult['payment_source'] =
    raw.payment_source === 'credit_card' || raw.payment_source === 'cash_debit'
      ? raw.payment_source
      : null

  const validCardIds = new Set(creditCards.map(c => c.id))
  const matchedCardId =
    paymentSource === 'credit_card' &&
    typeof raw.matched_card_id === 'string' &&
    validCardIds.has(raw.matched_card_id)
      ? raw.matched_card_id
      : null

  const data: ReceiptScanResult = {
    merchant: asCleanString(raw.merchant, 80),
    transaction_date: transactionDate,
    total: asAmount(raw.total),
    currency,
    category_id: categoryId,
    category_name: categoryId ? categories.find(c => c.id === categoryId)?.name ?? null : null,
    items,
    confidence,
    warnings,
    payment_source: paymentSource,
    matched_card_id: matchedCardId,
  }

  if (data.total === null) {
    data.warnings.unshift('No se pudo leer el total — ingrésalo manualmente')
    data.confidence = 'low'
  }

  return { data, error: null }
}
