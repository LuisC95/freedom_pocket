'use client'

interface Props {
  onBack: () => void
}

export function AboutDetail({ onBack }: Props) {
  return (
    <>
      <div className="detail-header-fc">
        <button className="back-btn-fc" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Atrás
        </button>
        <span className="detail-title-fc">Acerca de</span>
      </div>

      <div className="detail-body-fc" style={{ paddingTop: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🧭</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Fastlane Compass
        </h2>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12, color: 'var(--text-muted)', marginBottom: 16,
        }}>
          v0.1.0 · Beta privada
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 40px' }}>
          Desvincula tu dinero de tu tiempo.
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Hecho con 🤍 por Luis Carmona
        </p>
      </div>
    </>
  )
}
