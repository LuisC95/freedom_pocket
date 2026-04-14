'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HeroCard } from './HeroCard'
import { RecurringBanner } from './RecurringBanner'
import { TransactionSlider } from './TransactionSlider'
import { AddTransactionModal } from './AddTransactionModal'
import { ChartModal } from './ChartModal'
import type { DashboardData, Transaction } from '../types'

interface DashboardClientProps {
  data: DashboardData
}

type Modal =
  | { type: 'add' }
  | { type: 'edit'; transaction: Transaction }
  | { type: 'chart' }
  | null

export function DashboardClient({ data }: DashboardClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<Modal>(null)

  const { periodo_activo, metrics, transaction_groups, monthly_history, budgets, recurring_templates, pending_recurring, categories } = data

  function refresh() {
    setModal(null)
    router.refresh()
  }

  const periodoLabel = periodo_activo
    ? `Desde ${new Date(periodo_activo.start_date + 'T12:00:00').toLocaleDateString('es', { month: 'long', year: 'numeric' })}`
    : undefined

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      {/* Hero */}
      <HeroCard
        metrics={metrics}
        monthly_history={monthly_history}
        periodo_label={periodoLabel}
        onExpand={() => setModal({ type: 'chart' })}
      />

      {/* Banner recurrentes pendientes */}
      <RecurringBanner
        pending={pending_recurring}
        onApproved={refresh}
      />

      {/* Slider 3 tabs */}
      {periodo_activo ? (
        <TransactionSlider
          transaction_groups={transaction_groups}
          budgets={budgets}
          recurring_templates={recurring_templates}
          categories={categories}
          gasto_diario={metrics.gasto_diario}
          onEditTransaction={tx => setModal({ type: 'edit', transaction: tx })}
          onDataChanged={refresh}
        />
      ) : (
        <div style={{ backgroundColor: '#EAF0EC', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#7A9A8A' }}>
            Sin período activo. Configura uno en Mi Realidad.
          </p>
        </div>
      )}

      {/* FAB */}
      {periodo_activo && (
        <button
          onClick={() => setModal({ type: 'add' })}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#2E7D52',
            border: 'none',
            color: 'white',
            fontSize: '26px',
            lineHeight: 1,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(46, 125, 82, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}
        >
          +
        </button>
      )}

      {/* Modales */}
      {modal?.type === 'chart' && (
        <ChartModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'add' && periodo_activo && (
        <AddTransactionModal
          periodId={periodo_activo.id}
          pricePerHour={metrics.price_per_hour}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
      {modal?.type === 'edit' && periodo_activo && (
        <AddTransactionModal
          periodId={periodo_activo.id}
          pricePerHour={metrics.price_per_hour}
          categories={categories}
          transaction={modal.transaction}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
