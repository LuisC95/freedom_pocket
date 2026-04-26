'use client'

interface ScoreBadgeProps {
  score: number | null
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="font-mono text-[13px] text-[#7A9A8A]" style={{ letterSpacing: -0.5 }}>
        —/50
      </span>
    )
  }

  const pct = score / 50
  const color = pct >= 0.7 ? '#2E7D52' : pct >= 0.5 ? '#C69B30' : '#E84434'

  return (
    <span
      className="font-mono text-[13px] font-bold"
      style={{ color, letterSpacing: -0.5 }}
    >
      {score}/50
    </span>
  )
}
