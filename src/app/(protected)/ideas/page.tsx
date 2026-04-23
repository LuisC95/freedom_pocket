import { requireAdmin } from '@/modules/ideas/utils/admin-guard'
import { listIdeas } from '@/modules/ideas/actions'
import { IdeasList } from '@/modules/ideas/components/IdeasList'
import { EntryPointSelector } from '@/modules/ideas/components/EntryPointSelector'

export default async function IdeasPage() {
  await requireAdmin()
  const result = await listIdeas()
  const ideas = result.ok ? result.data : []

  return (
    <div className="p-4 pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, color: '#141F19', marginBottom: 4, lineHeight: 1.2 }}>
          Ideas
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#7A9A8A' }}>
          Desarrollá tu vehículo Fastlane
        </p>
      </div>

      {/* CTA — Nueva sesión */}
      <section style={{ marginBottom: 20 }}>
        <EntryPointSelector />
      </section>

      {/* Motor AI promo */}
      {ideas.length === 0 && (
        <div style={{ backgroundColor: '#EAF0EC', borderRadius: 16, padding: 28, textAlign: 'center', marginTop: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 9999, background: 'rgba(198,155,48,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C69B30" strokeWidth={1.8} strokeLinecap="round" width={22} height={22}>
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
            </svg>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: '#141F19', marginBottom: 4 }}>Motor AI disponible</p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#7A9A8A' }}>Activá el Motor AI para análisis profundo de tus ideas de negocio.</p>
        </div>
      )}

      {/* Lista de ideas */}
      {ideas.length > 0 && (
        <section>
          <IdeasList ideas={ideas} />
        </section>
      )}
    </div>
  )
}
