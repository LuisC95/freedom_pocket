'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** ID único para identificar dónde ocurrió el error (ej: "ChatPageClient") */
  source: string
}

interface State {
  error: Error | null
}

/**
 * ErrorBoundary mínimo que captura errores de render e hidratación
 * y los muestra como mensaje en la UI en lugar de dejar pantalla blanca.
 *
 * Ideal para debug: mostrás el error exacto + stack sin necesidad de
 * la consola del navegador.
 *
 * Uso:
 *   <RenderErrorBoundary source="ChatPageClient">
 *     <ChatPageClient ... />
 *   </RenderErrorBoundary>
 */
export class RenderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[RenderErrorBoundary:${this.props.source}]`, error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      const err = this.state.error
      return (
        <div
          style={{
            padding: '24px 16px',
            fontFamily: '"IBM Plex Sans", sans-serif',
            minHeight: '100vh',
            background: '#F2F7F4',
            maxWidth: 480,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            ⚠️
          </div>

          <p style={{ fontSize: 15, fontWeight: 600, color: '#991B1B', margin: 0, textAlign: 'center' }}>
            Error en {this.props.source}
          </p>

          <div
            style={{
              width: '100%',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 12,
              color: '#991B1B',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.6,
            }}
          >
            {err.message}
          </div>

          {err.stack && (
            <details style={{ width: '100%' }}>
              <summary style={{ fontSize: 11, color: '#7A9A8A', cursor: 'pointer', marginBottom: 6 }}>
                Ver stack trace
              </summary>
              <pre
                style={{
                  width: '100%',
                  fontSize: 10,
                  color: '#6B7280',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                  margin: 0,
                  padding: '8px 12px',
                  background: '#F9FAFB',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
              >
                {err.stack}
              </pre>
            </details>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12,
              padding: '10px 24px',
              borderRadius: 22,
              border: '1.5px solid #2E7D52',
              background: '#fff',
              color: '#2E7D52',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: '"IBM Plex Sans", sans-serif',
            }}
          >
            Recargar página
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
