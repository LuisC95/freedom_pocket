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
import type { MonthlySnapshot } from '../types'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(n))
}

const FRAMES = [3, 6, 12] as const
type Frame = typeof FRAMES[number]

export function ChartModal({ onClose }: { onClose: () => void }) {
  const [frame, setFrame] = useState<Frame>(6)
  const [data, setData] = useState<MonthlySnapshot[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const result = await getMonthlyHistory(frame)
      setData(result)
    })
  }, [frame])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 51,
      backgroundColor: '#0D1A15',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 20px 32px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#7A9A8A',
        }}>
          Historial
        </span>
        <button
          onClick={onClose}
          style={{
            color: '#7A9A8A',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            lineHeight: 1,
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Frame selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '36px' }}>
        {FRAMES.map(f => (
          <button
            key={f}
            onClick={() => setFrame(f)}
            style={{
              padding: '6px 18px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              backgroundColor: frame === f ? '#3A9E6A' : '#2E7D5220',
              color: frame === f ? '#F2F7F4' : '#7A9A8A',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            {f}M
          </button>
        ))}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 16px', marginBottom: '16px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#3A9E6A', display: 'inline-block' }} />
          Ingresos
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#E84434', display: 'inline-block' }} />
          Gasto cash
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#C69B30', display: 'inline-block' }} />
          Gasto tarjeta
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#7A9A8A' }}>
          <span style={{ width: 20, height: 1, backgroundColor: '#7A9A8A', display: 'inline-block', borderTop: '1px dashed #7A9A8A' }} />
          Neto
        </span>
      </div>

      {/* Gráfico */}
      <div style={{ flex: 1, opacity: isPending ? 0.4 : 1, transition: 'opacity 0.2s' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
            barGap={1}
            barCategoryGap="35%"
          >
            <XAxis
              dataKey="month_label"
              tick={{ fontFamily: 'var(--font-mono)', fontSize: 10, fill: '#7A9A8A' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1A2520',
                border: '0.5px solid #2E7D5240',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#7A9A8A' }}
              itemStyle={{ color: '#F2F7F4' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [fmt(Number(value)), '']}
            />
            <Bar dataKey="total_income" fill="#3A9E6A" radius={[2, 2, 0, 0]} name="Ingresos" />
            <Bar dataKey="total_cash_expense" stackId="expense" fill="#E84434" radius={[0, 0, 2, 2]} name="Gasto cash" />
            <Bar dataKey="total_credit_expense" stackId="expense" fill="#C69B30" radius={[2, 2, 0, 0]} name="Gasto tarjeta" />
            <Line
              type="monotone"
              dataKey="net"
              stroke="#7A9A8A"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={{ fill: '#7A9A8A', r: 3 }}
              name="Neto"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
