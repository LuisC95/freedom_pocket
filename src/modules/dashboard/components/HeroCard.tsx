'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getMonthlyHistory } from '../actions'
import type { DashboardMetrics, MonthlySnapshot } from '../types'

const FRAMES = [3, 6, 12] as const
type Frame = typeof FRAMES[number]

function fmt(n: number, currency = 'USD') {
  const abs = Math.abs(n)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs)
}

function fmtDays(d: number) {
  return `${Math.abs(d).toFixed(1)}d`
}

interface HeroCardProps {
  metrics: DashboardMetrics
  monthly_history: MonthlySnapshot[]
  periodo_label?: string
  onExpand?: () => void
}

export function HeroCard({ metrics, monthly_history, periodo_label, onExpand }: HeroCardProps) {
  const { net_period, total_income_period, total_expense_period, retention_rate, dias_autonomia, gasto_diario, price_per_hour } = metrics
  const isPositive = net_period >= 0
  const netColor = isPositive ? '#3A9E6A' : '#E84434'
  const retPct = Math.max(0, Math.min(100, retention_rate))

  const [frame, setFrame] = useState<Frame>(6)
  const [chartData, setChartData] = useState<MonthlySnapshot[]>(monthly_history)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getMonthlyHistory(frame)
      setChartData(result)
    })
  }, [frame])

  return (
    <div className="glass-hero mb-4 p-4 sm:p-5">
      {/* Período */}
      {periodo_label && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.09em', color: '#7A9A8A', textTransform: 'uppercase' }} className="mb-2.5">
          {periodo_label}
        </p>
      )}

      {/* Neto — protagonista */}
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.09em', color: '#3A9E6A' }} className="mb-1">
            retenido este mes
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(30px, 9vw, 38px)', fontWeight: 600, color: netColor, lineHeight: 1, overflowWrap: 'anywhere' }}>
            {isPositive ? '+' : '−'}{fmt(net_period)}
          </p>
        </div>
        {/* Autonomía chip */}
        {dias_autonomia !== null ? (
          <div style={{ backgroundColor: '#C69B3018', border: '0.5px solid #C69B3040', borderRadius: '5px', padding: '4px 9px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#C69B30' }}>
              {isPositive ? '+' : '−'}{fmtDays(dias_autonomia)} autonomía
            </p>
          </div>
        ) : price_per_hour === null ? (
          <div style={{ backgroundColor: '#7A9A8A18', border: '0.5px solid #7A9A8A30', borderRadius: '5px', padding: '4px 9px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
              completa M1
            </p>
          </div>
        ) : null}
      </div>

      {/* Fila secundaria */}
      <div style={{ backgroundColor: '#2E7D5215', borderRadius: '8px', padding: '9px 12px' }} className="flex items-center my-3">
        <div className="flex-1">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A' }} className="mb-0.5">
            ingresos
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '19px', fontWeight: 500, color: '#3A9E6A' }}>
            {fmt(total_income_period)}
          </p>
        </div>
        <div style={{ width: '0.5px', backgroundColor: '#2E7D5240', height: '36px', margin: '0 8px' }} />
        <div className="flex-1 text-right">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A' }} className="mb-0.5">
            gastos
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '19px', fontWeight: 500, color: '#E84434' }}>
            {fmt(total_expense_period)}
          </p>
        </div>
      </div>

      {/* Medidor de liquidez */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A' }}>
            liquidez del período
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: retPct >= 50 ? '#3A9E6A' : retPct >= 20 ? '#C69B30' : '#E84434' }}>
            {retPct}% libre · {100 - retPct}% gastado
          </p>
        </div>
        <div style={{ backgroundColor: '#E8443425', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${retPct}%`, height: '6px', backgroundColor: retPct >= 50 ? '#3A9E6A' : retPct >= 20 ? '#C69B30' : '#E84434', borderRadius: '4px', transition: 'width 0.4s' }} />
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#7A9A8A', marginTop: '5px', lineHeight: 1.4 }}>
          {retPct >= 50
            ? 'Excelente — más de la mitad de tus ingresos siguen disponibles.'
            : retPct >= 20
            ? 'Margen ajustado — considerá reducir gastos variables.'
            : 'Liquidez crítica — los gastos consumen casi todos tus ingresos.'}
        </p>
      </div>

      {/* Explicación autonomía económica */}
      {gasto_diario !== null && (
        <div style={{ backgroundColor: '#C69B3008', border: '0.5px solid #C69B3020', borderRadius: '8px', padding: '10px 12px', marginTop: '12px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#C69B30', marginBottom: '6px' }}>
            autonomía económica
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#7A9A8A', lineHeight: 1.5, marginBottom: '6px' }}>
            Tu ritmo de gasto actual es{' '}
            <span style={{ color: '#F2F7F4', fontFamily: 'var(--font-mono)' }}>{fmt(gasto_diario)}/día</span>.
            Cada gasto se traduce en días que dejas de ser libre.
          </p>
          {dias_autonomia !== null && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: '#7A9A8A', lineHeight: 1.5 }}>
              {net_period >= 0
                ? <>Con lo que retuviste puedes vivir{' '}<span style={{ color: '#3A9E6A', fontFamily: 'var(--font-mono)' }}>{fmtDays(dias_autonomia)}</span>{' '}sin trabajar.</>
                : <>Estás en déficit de{' '}<span style={{ color: '#E84434', fontFamily: 'var(--font-mono)' }}>{fmtDays(dias_autonomia)}</span>{' '}— gastaste más de lo que ingresó.</>
              }
            </p>
          )}
        </div>
      )}

      {/* Gráfica historial */}
      {chartData.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-3.5 mb-1.5">
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A9A8A' }}>
              historial {frame}m
            </p>
            <div style={{ display: 'flex', gap: '4px' }}>
              {FRAMES.map(f => (
                <button
                  key={f}
                  onClick={() => setFrame(f)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    backgroundColor: frame === f ? '#3A9E6A' : '#2E7D5215',
                    color: frame === f ? '#F2F7F4' : '#7A9A8A',
                  }}
                >
                  {f}M
                </button>
              ))}
            </div>
          </div>
          <div onClick={onExpand} style={{ cursor: onExpand ? 'pointer' : 'default', opacity: isPending ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <ResponsiveContainer width="100%" height={72}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={1} barCategoryGap="35%">
              <XAxis
                dataKey="month_label"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: '#7A9A8A' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A2520', border: '0.5px solid #2E7D5240', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                labelStyle={{ color: '#7A9A8A' }}
                itemStyle={{ color: '#F2F7F4' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [fmt(Number(value)), '']}
              />
              <Bar dataKey="total_income" fill="#3A9E6A" radius={[2, 2, 0, 0]} />
              <Bar dataKey="total_expense" fill="#E84434" radius={[2, 2, 0, 0]} />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#7A9A8A"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
