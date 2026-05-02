'use client'

interface Props {
  onBack: () => void
}

const features = [
  { icon: '✓', color: 'green' as const, name: 'Mi Realidad', desc: 'Precio-hora e ingresos' },
  { icon: '✓', color: 'green' as const, name: 'Dashboard Financiero', desc: 'Gastos, ingresos y liquidez' },
  { icon: '✓', color: 'green' as const, name: 'La Brújula', desc: 'Activos, pasivos y libertad' },
  { icon: '✦', color: 'gold' as const, name: 'Ideas de Negocio + AI', desc: 'Generación y evaluación con IA', future: true },
]

export function SubscriptionDetail({ onBack }: Props) {
  return (
    <>
      <div className="detail-header-fc">
        <button className="back-btn-fc" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Atrás
        </button>
        <span className="detail-title-fc">Suscripción</span>
      </div>

      <div className="detail-body-fc">
        <div className="glass" style={{ padding: 24, textAlign: 'center', marginBottom: 18 }}>
          <p className="fc-label-micro">Tu plan actual</p>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', marginTop: 6,
          }}>Free</p>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
            Acceso completo a tus finanzas
          </p>
        </div>

        <div className="glass" style={{ padding: '0 14px', overflow: 'hidden' }}>
          {features.map((f, i) => (
            <div key={f.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              opacity: f.future ? 0.4 : 1,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                background: f.color === 'green' ? 'var(--green-dim)' : 'var(--gold-dim)',
                color: f.color === 'green' ? 'var(--text-green)' : 'var(--text-gold)',
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{f.name}</span>
                  {f.future && <span className="badge badge-gold">Pro</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{
          fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
          marginTop: 24, lineHeight: 1.5,
        }}>
          Los planes de pago estarán disponibles próximamente
        </p>
      </div>
    </>
  )
}
