import { DEV_USER_ID } from '@/lib/dev-user'
import {
  getActivePeriod,
  getDashboardStats,
  getRecentTransactions,
  getBudgetProgress,
} from '@/modules/dashboard/actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtHours(h: number) {
  return `${h.toFixed(1)}h`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const period = await getActivePeriod(DEV_USER_ID)

  if (!period) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <p
          className="text-sm"
          style={{ color: '#6A8A7A', fontFamily: 'var(--font-sans)' }}
        >
          No hay periodo activo. Crea uno para comenzar.
        </p>
      </div>
    )
  }

  const [stats, budgets] = await Promise.all([
    getDashboardStats(DEV_USER_ID, period.id),
    getBudgetProgress(DEV_USER_ID, period.id),
  ])

  const transactions = await getRecentTransactions(
    DEV_USER_ID,
    period.id,
    stats.hourly_rate
  )

  const deltaPositive = stats.delta_vs_prev_month > 0
  const deltaZero = stats.delta_vs_prev_month === 0

  return (
    <div
      className="px-4 py-5 md:px-6 space-y-4 max-w-xl mx-auto"
      style={{ fontFamily: 'var(--font-sans)' }}
    >

      {/* ── 1. Hero card ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: '#1A2520' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium" style={{ color: '#6A8A7A' }}>
            {period.label}
          </span>
          {!deltaZero && (
            <span
              className="text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: deltaPositive ? '#E8443418' : '#2E7D5218',
                color: deltaPositive ? '#E84434' : '#3A9E6A',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {deltaPositive ? '+' : ''}{stats.delta_vs_prev_month}% vs mes anterior
            </span>
          )}
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: '#6A8A7A' }}>Egresos</p>
            <p
              className="text-2xl font-semibold text-white leading-none"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {fmt(stats.total_expense)}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#6A8A7A' }}>Ingresos</p>
            <p
              className="text-2xl font-semibold leading-none"
              style={{ color: '#3A9E6A', fontFamily: 'var(--font-mono)' }}
            >
              {fmt(stats.total_income)}
            </p>
          </div>
        </div>

        {/* Month progress bar */}
        <div className="mt-5">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs" style={{ color: '#6A8A7A' }}>Progreso del mes</span>
            <span className="text-xs" style={{ color: '#6A8A7A', fontFamily: 'var(--font-mono)' }}>
              {stats.month_progress}%
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ backgroundColor: '#243028' }}>
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${stats.month_progress}%`,
                backgroundColor: '#2E7D52',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. AI chip ────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: '#C69B3012', border: '1px solid #C69B3035' }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#C69B30' }}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
            <path d="M12 2l2.09 6.26L21 10l-6.91 1.74L12 22l-2.09-10.26L3 10l6.91-1.74L12 2z" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: '#C69B30' }}>
          Cargando análisis...
        </p>
      </div>

      {/* ── 3. Mini stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2EDE8' }}
        >
          <p className="text-xs mb-2" style={{ color: '#6A8A7A' }}>Precio / hora</p>
          <p
            className="text-xl font-semibold leading-none"
            style={{ color: '#1A2520', fontFamily: 'var(--font-mono)' }}
          >
            {stats.hourly_rate > 0 ? fmt(stats.hourly_rate) : '—'}
          </p>
          <p className="text-xs mt-1.5" style={{ color: '#6A8A7A' }}>por hora trabajada</p>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2EDE8' }}
        >
          <p className="text-xs mb-2" style={{ color: '#6A8A7A' }}>Costo del mes</p>
          <p
            className="text-xl font-semibold leading-none"
            style={{ color: '#1A2520', fontFamily: 'var(--font-mono)' }}
          >
            {stats.cost_in_hours > 0 ? fmtHours(stats.cost_in_hours) : '—'}
          </p>
          <p className="text-xs mt-1.5" style={{ color: '#6A8A7A' }}>de tu vida este mes</p>
        </div>
      </div>

      {/* ── 4. Presupuestos ───────────────────────────────────────────────── */}
      {budgets.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1A2520' }}>
            Presupuestos
          </h2>
          <div
            className="rounded-xl overflow-hidden divide-y"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2EDE8' }}
          >
            {budgets.map(budget => (
              <div key={budget.category} className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm capitalize" style={{ color: '#1A2520' }}>
                    {budget.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs"
                      style={{ color: '#6A8A7A', fontFamily: 'var(--font-mono)' }}
                    >
                      {fmt(budget.spent)}{' '}
                      <span style={{ color: '#BBCFC6' }}>/</span>{' '}
                      {fmt(budget.budgeted)}
                    </span>
                    {budget.is_over && (
                      <span
                        className="text-xs font-semibold"
                        style={{ color: '#E84434', fontFamily: 'var(--font-mono)' }}
                      >
                        +{budget.percentage - 100}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: '#F2F7F4' }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, budget.percentage)}%`,
                      backgroundColor: budget.is_over ? '#E84434' : '#2E7D52',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. Transacciones recientes ────────────────────────────────────── */}
      {transactions.length > 0 && (
        <section className="pb-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1A2520' }}>
            Transacciones recientes
          </h2>
          <div
            className="rounded-xl overflow-hidden divide-y"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2EDE8' }}
          >
            {transactions.map(t => (
              <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                {/* Tipo */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                  style={{
                    backgroundColor: t.type === 'income' ? '#2E7D5215' : '#E8443415',
                    color: t.type === 'income' ? '#2E7D52' : '#E84434',
                  }}
                >
                  {t.type === 'income' ? '↑' : '↓'}
                </div>

                {/* Descripción */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: '#1A2520' }}>
                    {t.description}
                  </p>
                  <p className="text-xs" style={{ color: '#6A8A7A' }}>
                    {t.category} · {fmtDate(t.date)}
                  </p>
                </div>

                {/* Monto + horas */}
                <div className="text-right shrink-0">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: t.type === 'income' ? '#3A9E6A' : '#1A2520',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                  </p>
                  {t.cost_in_hours > 0 && (
                    <p
                      className="text-xs"
                      style={{ color: '#6A8A7A', fontFamily: 'var(--font-mono)' }}
                    >
                      {fmtHours(t.cost_in_hours)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
