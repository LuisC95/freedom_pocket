// Cliente Gemini Vision (REST) para extracción de datos desde imágenes.
// Usado por el escáner de facturas (dashboard) y el de saldos (brújula).
// Env: GOOGLE_AI_KEY (requerida) + GOOGLE_AI_MODEL (opcional).
import { assertServerRuntime } from '@/lib/assert-server-runtime'

assertServerRuntime('ai/gemini')

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_IMAGES = 4
// ~6MB de base64 total (las imágenes llegan comprimidas del cliente a ~300-900KB c/u)
const MAX_TOTAL_BASE64_CHARS = 8_000_000

export interface VisionImage {
  mimeType: string
  dataBase64: string
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

// Tolera respuestas envueltas en ```json ... ``` o con texto alrededor.
function extractJson(raw: string): unknown | null {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.search(/[[{]/)
    if (start === -1) return null
    for (let end = cleaned.length; end > start; end--) {
      try {
        return JSON.parse(cleaned.slice(start, end))
      } catch { /* sigue recortando */ }
    }
    return null
  }
}

export async function geminiVisionJson<T>(input: {
  prompt: string
  images: VisionImage[]
  maxOutputTokens?: number
}): Promise<{ data: T | null; error: string | null }> {
  const apiKey = process.env.GOOGLE_AI_KEY
  if (!apiKey) {
    return { data: null, error: 'El escáner no está configurado (falta GOOGLE_AI_KEY)' }
  }

  if (input.images.length === 0) return { data: null, error: 'No se recibió ninguna imagen' }
  if (input.images.length > MAX_IMAGES) {
    return { data: null, error: `Máximo ${MAX_IMAGES} imágenes por escaneo` }
  }

  const totalChars = input.images.reduce((s, img) => s + img.dataBase64.length, 0)
  if (totalChars > MAX_TOTAL_BASE64_CHARS) {
    return { data: null, error: 'Las imágenes son demasiado pesadas. Intenta con menos capturas.' }
  }

  const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
  for (const img of input.images) {
    if (!allowedMimes.has(img.mimeType)) {
      return { data: null, error: `Formato no soportado: ${img.mimeType}. Usa JPG, PNG o WebP.` }
    }
  }

  const model = process.env.GOOGLE_AI_MODEL || DEFAULT_MODEL

  try {
    const response = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: input.prompt },
            ...input.images.map(img => ({
              inlineData: { mimeType: img.mimeType, data: img.dataBase64 },
            })),
          ],
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          maxOutputTokens: input.maxOutputTokens ?? 4096,
        },
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as GeminiResponse

    if (!response.ok) {
      console.error('[geminiVisionJson] HTTP', response.status, payload.error?.message)
      if (response.status === 429) {
        return { data: null, error: 'Límite de uso de Gemini alcanzado. Espera un momento e intenta de nuevo.' }
      }
      return { data: null, error: 'No se pudo analizar la imagen' }
    }

    if (payload.promptFeedback?.blockReason) {
      console.error('[geminiVisionJson] blocked:', payload.promptFeedback.blockReason)
      return { data: null, error: 'La imagen fue rechazada por el proveedor de IA' }
    }

    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')

    if (!text.trim()) {
      console.error('[geminiVisionJson] respuesta vacía, finishReason:', payload.candidates?.[0]?.finishReason)
      return { data: null, error: 'La IA no devolvió datos legibles. Intenta con una foto más clara.' }
    }

    const parsed = extractJson(text)
    if (parsed === null) {
      console.error('[geminiVisionJson] JSON inválido:', text.slice(0, 300))
      return { data: null, error: 'La IA devolvió un formato inesperado. Intenta de nuevo.' }
    }

    return { data: parsed as T, error: null }
  } catch (err) {
    console.error('[geminiVisionJson]', err)
    return { data: null, error: 'Error de conexión con el proveedor de IA' }
  }
}
