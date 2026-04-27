// src/modules/ideas/constants.ts
// Metadata UX del Módulo 4 — Ideas de Negocio.
// Single source of truth: labels, preguntas, anclas, transiciones.
// Los types en types/index.ts derivan de estos arrays (as const) vía
// `typeof CONSTANT[number]['key']`.

// ──────────────────────────────────────────────────────────
// CENTS — las 5 dimensiones de puntuación (DeMarco)
// ──────────────────────────────────────────────────────────
// UX anti-bias: labels en lenguaje plano (no usan la jerga
// del framework) + anclas concretas 1=X, 10=Y. El objetivo
// es que el usuario puntúe por lo que entiende, no por la
// letra del acrónimo.

export const CENTS_DIMENSIONS = [
  {
    key:         'control',
    order:       1,
    db_column:   'cents_score_control',
    label:       'Independencia',
    question:    '¿Quién tiene el poder de cerrar tu negocio?',
    anchor_low:  'Dependo 100% de una plataforma externa',
    anchor_high: 'Tengo infraestructura y clientes propios',
  },
  {
    key:         'entry',
    order:       2,
    db_column:   'cents_score_entry',
    label:       'Defensa frente a competidores',
    question:    '¿Qué tan fácil es que alguien te copie?',
    anchor_low:  'Cualquiera lo clona en una tarde',
    anchor_high: 'Requiere años, talento o capital para copiarlo',
  },
  {
    key:         'need',
    order:       3,
    db_column:   'cents_score_need',
    label:       'Demanda real',
    question:    '¿La gente ya paga por resolver esto?',
    anchor_low:  'No estoy seguro de que el problema exista',
    anchor_high: 'Mercado pagando y creciendo',
  },
  {
    key:         'time',
    order:       4,
    db_column:   'cents_score_time',
    label:       'Ingreso sin tu tiempo',
    question:    '¿Necesitás estar vos para que genere plata?',
    anchor_low:  'Si dejo de trabajar, deja de generar',
    anchor_high: 'Opera sin mí',
  },
  {
    key:         'scale',
    order:       5,
    db_column:   'cents_score_scale',
    label:       'Techo de crecimiento',
    question:    '¿Hasta cuánta gente puede llegar?',
    anchor_low:  'Tope de ~100 clientes',
    anchor_high: 'Millones de clientes potenciales',
  },
] as const

// ──────────────────────────────────────────────────────────
// Fases del embudo
// ──────────────────────────────────────────────────────────

// Fases en español — validado contra CHECK constraint real en DB (20-abr-2026).
// CONTEXT.md usa nombres en inglés pero están incorrectos. Estos son los correctos.
export const PHASES = [
  {
    key:       'observar',
    order:     1,
    label:     'Observar',
    objective: 'Encontrar oportunidades que encajen con vos',
  },
  {
    key:       'definir',
    order:     2,
    label:     'Definir',
    objective: 'Delimitar el problema concreto',
  },
  {
    key:       'idear',
    order:     3,
    label:     'Idear',
    objective: 'Proponer ideas concretas de negocio',
  },
  {
    key:       'evaluar',
    order:     4,
    label:     'Evaluar',
    objective: 'Puntuar las 5 dimensiones con CENTS',
  },
] as const

// ──────────────────────────────────────────────────────────
// Entry points — las 3 rutas de arranque de sesión
// ──────────────────────────────────────────────────────────

export const ENTRY_POINTS = [
  {
    key:                'sin_idea',
    label:              'No tengo idea aún',
    description:        'Explorá oportunidades con ayuda de la AI',
    start_phase:        'observar',
    requires_raw_input: false,
  },
  {
    key:                'idea_vaga',
    label:              'Tengo algo vago',
    description:        'Aterrizá y refiná tu idea con preguntas dirigidas',
    start_phase:        'definir',
    requires_raw_input: true,
  },
  {
    key:                'idea_clara',
    label:              'Ya la tengo clara',
    description:        'Andá directo a evaluarla con CENTS',
    start_phase:        'evaluar',
    requires_raw_input: true,
  },
] as const

// ──────────────────────────────────────────────────────────
// Estados de una idea + transiciones válidas
// ──────────────────────────────────────────────────────────

export const IDEA_STATUSES = [
  { key: 'generated',    label: 'Generada',     description: 'La idea existe pero aún no te comprometiste', is_terminal: false },
  { key: 'committed',    label: 'Comprometida', description: 'Decidiste trabajarla',                         is_terminal: false },
  { key: 'validando',    label: 'Validando',    description: 'Testeando si hay demanda real',                is_terminal: false },
  { key: 'construyendo', label: 'Construyendo', description: 'Desarrollando el producto o servicio',         is_terminal: false },
  { key: 'operando',     label: 'Operando',     description: 'El negocio está activo (vive en Brújula)',     is_terminal: false },
  { key: 'discarded',    label: 'Descartada',   description: 'No seguís con esta idea',                      is_terminal: true  },
] as const

// Transiciones permitidas (la validación vive en app layer, no en DB).
// Usada por `assertValidTransition()` en actions/transitions.ts
export const IDEA_STATUS_TRANSITIONS = {
  generated:    ['committed', 'discarded'],
  committed:    ['validando', 'discarded'],
  validando:    ['construyendo', 'discarded'],
  construyendo: ['operando', 'discarded'],
  operando:     ['discarded'],
  discarded:    [],
} as const

// ──────────────────────────────────────────────────────────
// Estados de sesión + roles de mensaje
// ──────────────────────────────────────────────────────────

export const SESSION_STATUSES = [
  { key: 'in_progress', label: 'En curso' },
  { key: 'completed',   label: 'Completada' },
  { key: 'abandoned',   label: 'Abandonada' },
] as const

export const MESSAGE_ROLES = [
  { key: 'user',      label: 'Usuario' },
  { key: 'assistant', label: 'AI' },
] as const

// ──────────────────────────────────────────────────────────
// Modelos de negocio
// ──────────────────────────────────────────────────────────

export const BUSINESS_MODELS = [
  { key: 'saas',            label: 'App o software' },
  { key: 'producto_fisico', label: 'Producto físico' },
  { key: 'servicio',        label: 'Servicio profesional' },
  { key: 'contenido',       label: 'Contenido (blog, video, curso…)' },
  { key: 'renta',           label: 'Renta (alquiler, inmuebles)' },
  { key: 'custom',          label: 'Otro modelo' },
] as const

// ──────────────────────────────────────────────────────────
// Deep Dive — los 7 campos del plan de negocio
// ──────────────────────────────────────────────────────────
// ai_notes NO está acá — es el 8º campo editable pero no cuenta
// para fields_completed. Ver DeepDiveField en types/index.ts.

export const DEEP_DIVE_FIELDS = [
  { key: 'market_analysis',       order: 1, label: 'Mercado',                  question: '¿Cuánta gente tiene este problema?' },
  { key: 'competition_analysis',  order: 2, label: 'Competencia',              question: '¿Quién más intenta resolver esto?' },
  { key: 'revenue_model',         order: 3, label: 'Modelo de ingreso',        question: '¿Cómo vas a cobrar?' },
  { key: 'required_resources',    order: 4, label: 'Recursos necesarios',      question: '¿Qué necesitás para arrancar?' },
  { key: 'time_to_first_revenue', order: 5, label: 'Tiempo al primer ingreso', question: '¿En cuánto tiempo podés tener primer cliente pagando?' },
  { key: 'first_steps',           order: 6, label: 'Primeros pasos',           question: '¿Cuáles son los 3 próximos pasos concretos?' },
  { key: 'validation_metrics',    order: 7, label: 'Métricas de validación',   question: '¿Cómo vas a saber si funciona?' },
] as const

// ──────────────────────────────────────────────────────────
// Proveedores AI
// (sin default_model — eso vive en lib/ai-provider/config.ts)
// ──────────────────────────────────────────────────────────

export const AI_PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic (Claude)' },
  { key: 'deepseek',  label: 'DeepSeek' },
  { key: 'openai',    label: 'OpenAI (GPT)' },
  { key: 'google',    label: 'Google (Gemini)' },
] as const

// ──────────────────────────────────────────────────────────
// Umbrales de negocio
// ──────────────────────────────────────────────────────────

// Aviso de costo AI: aparece al superar este umbral por sesión.
// Nunca aparece si profiles.is_admin = true (bypass en app layer).
export const AI_COST_ALERT_THRESHOLD_USD = 0.5

// Score CENTS: rango agregado (5 dimensiones × 1-10)
export const CENTS_MIN_TOTAL = 5
export const CENTS_MAX_TOTAL = 50

// ──────────────────────────────────────────────────────────
// Coach AI — sugerencias, textos de pensamiento, próximos pasos
// ──────────────────────────────────────────────────────────

export const COACH_THINKING = [
  'Analizando tu contexto...',
  'Procesando lo que dijiste...',
  'Construyendo la siguiente pregunta...',
  'Conectando puntos...',
] as const

export const SUGGESTIONS: Record<string, string[]> = {
  observar: ['Contame más sobre ese sector', '¿Qué habilidades tengo?', 'No sé por dónde empezar'],
  definir:  ['El problema principal es...', 'Los más afectados son...', 'Todavía no lo tengo claro'],
  idear:    ['Me resuena la primera', '¿Podés darme más opciones?', 'Quiero combinar ideas'],
  evaluar:  ['¿Cómo arranco esta semana?', 'Necesito más tiempo para pensarlo', 'Estoy listo para puntuar'],
} as const

// ──────────────────────────────────────────────────────────
// Chat — límites por fase, colores y descripciones
// ──────────────────────────────────────────────────────────

export const PHASE_DESCRIPTIONS: Record<string, string> = {
  observar: 'Exploramos oportunidades que encajen con vos',
  definir:  'Delimitamos el problema concreto',
  idear:    'Generamos ideas de negocio',
  evaluar:  'Puntuamos con CENTS',
} as const

export const PHASE_COLORS: Record<string, string> = {
  observar: '#7A9A8A',
  definir:  '#C69B30',
  idear:    '#3A9E6A',
  evaluar:  '#2E7D52',
} as const

export const MESSAGE_LIMITS: Record<string, number> = {
  observar: 6,
  definir:  6,
  idear:    6,
  evaluar:  6,
} as const

export const NEXT_STEP_FALLBACK: Record<string, string | null> = {
  generated:    'Evaluar con CENTS',
  committed:    'Completar evaluación CENTS',
  validando:    'Registrar resultado de validación',
  construyendo: 'Completar Deep Dive',
  operando:     null,
  discarded:    null,
} as const
