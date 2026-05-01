import { getBrujulaData } from '@/modules/brujula/actions'
import { BrujulaClient } from '@/modules/brujula/components/BrujulaClient'
import { PROGRESS_LEVEL_LABELS } from '@/modules/brujula/types'

export default async function BrújulaPage() {
  const data = await getBrujulaData()
  return (
    <div className="brujula-page">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-[#141F19] leading-tight">Brújula</h1>
        <p className="text-[12px] text-[#7A9A8A] mt-0.5">
          Score {data.score.total_score.toFixed(0)} · {PROGRESS_LEVEL_LABELS[data.score.level]}
        </p>
      </div>

      <BrujulaClient data={data} />
    </div>
  )
}
