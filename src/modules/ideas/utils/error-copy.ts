const CENTS_LABEL: Record<string, string> = {
  control: 'Independencia',
  entry:   'Defensa frente a competidores',
  need:    'Demanda real',
  time:    'Ingreso sin tu tiempo',
  scale:   'Techo de crecimiento',
}

const DD_LABEL: Record<string, string> = {
  market_analysis:       'Mercado',
  competition_analysis:  'Competencia',
  revenue_model:         'Modelo de ingreso',
  required_resources:    'Recursos necesarios',
  time_to_first_revenue: 'Tiempo al primer ingreso',
  first_steps:           'Primeros pasos',
  validation_metrics:    'Métricas de validación',
}

export function translatePromoteError(errorCode: string): string {
  if (errorCode.startsWith('MISSING_CENTS_SCORES:')) {
    const list = errorCode.split(':')[1].split(',').map(k => CENTS_LABEL[k] ?? k).join(', ')
    return `Te falta puntuar: ${list}. Volvé a la sección CENTS.`
  }
  if (errorCode.startsWith('MISSING_DEEP_DIVE_FIELDS:')) {
    const list = errorCode.split(':')[1].split(',').map(k => DD_LABEL[k] ?? k).join(', ')
    return `Te falta responder: ${list}.`
  }
  if (errorCode.startsWith('INVALID_STATUS:')) {
    return 'Algo raro pasó con el estado. Recargá la página.'
  }
  if (errorCode === 'INVALID_BUSINESS_NAME') {
    return 'Escribí un nombre para el negocio.'
  }
  if (errorCode === 'MISSING_BUSINESS_MODEL') {
    return 'Antes de operar necesitás definir cómo vas a cobrar. Volvé al chat para definirlo.'
  }
  if (errorCode === 'MISSING_DEEP_DIVE') {
    return 'Todavía no arrancaste el plan de acción. Completá al menos los 7 puntos del Deep Dive.'
  }
  return errorCode
}
