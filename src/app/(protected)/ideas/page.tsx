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
      {/* Hero */}
      <div
        style={{
          borderRadius: 16, padding: '20px 20px 18px',
          background: 'linear-gradient(135deg, #1B4332 0%, #2E7D52 100%)',
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-sans)', margin: '0 0 6px' }}>
          Ideas de negocio
        </h1>
        <p style={{ fontSize: 13, color: '#A7F3D0', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.5 }}>
          Descubrí, evaluá y desarrollá ideas con ayuda de la AI.
          El embudo te lleva de una intuición a un plan listo para ejecutar.
        </p>
      </div>

      {/* Nueva idea */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>
          ¿Por dónde arrancás?
        </h2>
        <EntryPointSelector />
      </section>

      {/* Lista de ideas previas */}
      {ideas.length > 0 && (
        <section>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#141F19', fontFamily: 'var(--font-sans)', margin: '0 0 12px' }}>
            Tus ideas ({ideas.length})
          </h2>
          <IdeasList ideas={ideas} />
        </section>
      )}
    </div>
  )
}
