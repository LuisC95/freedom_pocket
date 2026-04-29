// src/modules/ideas/constants.ts — M4 v2
// Single source of truth para Ideas de Negocio v2.

export const IDEA_STATUSES_V2 = [
  { key: 'nueva',             label: 'Nueva',              color: '#2E7D52' },
  { key: 'en_sprint',         label: 'En sprint',          color: '#C69B30' },
  { key: 'sprint_completado', label: 'Sprint completado',  color: '#3A9E6A' },
  { key: 'promovida',         label: 'Promovida',          color: '#2E7D52' },
  { key: 'descartada',        label: 'Descartada',         color: '#E84434' },
] as const

export const IDEA_SOURCES = [
  { key: 'cazador', label: '👂 Cazador' },
  { key: 'mapa',    label: '🗺️ Mapa'   },
  { key: 'manual',  label: '✍️ Manual'  },
] as const

export const SPRINT_STATUSES = [
  { key: 'active',    label: 'Activo'    },
  { key: 'completed', label: 'Completado' },
  { key: 'abandoned', label: 'Abandonado' },
] as const

export const BUSINESS_MODELS = [
  { key: 'saas',            label: 'App o software' },
  { key: 'producto_fisico', label: 'Producto físico' },
  { key: 'servicio',        label: 'Servicio profesional' },
  { key: 'contenido',       label: 'Contenido (blog, video, curso…)' },
  { key: 'renta',           label: 'Renta (alquiler, inmuebles)' },
  { key: 'custom',          label: 'Otro modelo' },
] as const

export const CAMINOS = [
  {
    id:      'servicios',
    emoji:   '🔧',
    color:   '#2E7D52',
    titulo:  'Monetiza lo que ya sabes',
    sub:     'El camino más rápido al primer ingreso',
    tiempo:  '2-4 semanas',
    barrera: 'Baja',
    desc:    'Tienes habilidades que otros pagan por no tener que aprender.',
  },
  {
    id:      'problemas',
    emoji:   '🎯',
    color:   '#6366f1',
    titulo:  'Resuelve un problema real',
    sub:     'El camino más sostenible a largo plazo',
    tiempo:  '4-8 semanas',
    barrera: 'Media',
    desc:    'Convierte una queja cotidiana en un negocio con demanda probada.',
  },
  {
    id:      'contenido',
    emoji:   '📱',
    color:   '#C69B30',
    titulo:  'Construye una audiencia',
    sub:     'El camino con mayor potencial de escala',
    tiempo:  '3-6 meses',
    barrera: 'Muy baja',
    desc:    'Activos que generan ingreso mientras duermes.',
  },
] as const

export const AI_USAGE_FEATURES = {
  PATTERN_DETECTION: 'm4_pattern_detection',
  SPRINT_GENERATION: 'm4_sprint_generation',
  MINI_CHAT:         'm4_mini_chat',
} as const

// Máximo mensajes del mini chat para usuarios no-admin
export const MINI_CHAT_FREE_LIMIT = 3
