// Parser del bloque META que la IA emite al final de cada respuesta.
// Extrae opciones clickeables y señal phase_ready. Si el parseo falla,
// devuelve parse_ok=false y el texto crudo queda como mensaje.

import type {
  AssistantUIData,
  AssistantOption,
  PhaseReadySignal,
  Phase,
} from '@/modules/ideas/types'
import { PHASES } from '@/modules/ideas/constants'

export interface ParsedAssistant {
  /** Prosa que se muestra en el bubble (sin el bloque META). */
  message: string
  /** Payload estructurado a persistir en ui_data; null si no se pudo parsear o está vacío. */
  meta: AssistantUIData | null
  /** true si el bloque META se extrajo y JSON.parse tuvo éxito. */
  parse_ok: boolean
}

const META_REGEX = /<<<META\s*([\s\S]*?)\s*META>>>/i

function isPhase(value: unknown): value is Phase {
  return typeof value === 'string' && PHASES.some(phase => phase.key === value)
}

function parseOptions(raw: unknown): AssistantOption[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const options: AssistantOption[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    const id = typeof obj.id === 'string' ? obj.id.trim() : ''
    const label = typeof obj.label === 'string' ? obj.label.trim() : ''
    if (!id || !label) continue
    const detail = typeof obj.detail_prompt === 'string' ? obj.detail_prompt.trim() : ''
    options.push({
      id,
      label,
      ...(detail ? { detail_prompt: detail } : {}),
    })
    if (options.length >= 4) break
  }
  return options.length >= 2 ? options : undefined
}

function parsePhaseReady(raw: unknown): PhaseReadySignal | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (!isPhase(obj.target)) return null
  const reason = typeof obj.reason === 'string' ? obj.reason.trim() : ''
  if (!reason) return null
  return { target: obj.target, reason }
}

export function parseAssistantResponse(raw: string): ParsedAssistant {
  if (!raw || typeof raw !== 'string') {
    return { message: '', meta: null, parse_ok: false }
  }

  const match = raw.match(META_REGEX)
  if (!match) {
    return { message: raw.trim(), meta: null, parse_ok: false }
  }

  const message = raw.slice(0, match.index).trim()
  const jsonBody = match[1].trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonBody)
  } catch {
    return { message: message || raw.trim(), meta: null, parse_ok: false }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { message: message || raw.trim(), meta: null, parse_ok: false }
  }

  const obj = parsed as Record<string, unknown>
  const options = parseOptions(obj.options)
  const phaseReady = parsePhaseReady(obj.phase_ready)

  const meta: AssistantUIData = {}
  if (options) meta.options = options
  if (phaseReady) meta.phase_ready = phaseReady

  return {
    message: message || raw.trim(),
    meta: Object.keys(meta).length > 0 ? meta : null,
    parse_ok: true,
  }
}
